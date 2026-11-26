// Posts do Instagram pesam cerca de 1 MB cada, então entram numa fila:
// - o post que está (ou quase está) na tela carrega primeiro, no máximo 2 ao mesmo tempo;
// - com a fila livre, os outros posts da página vão carregando em segundo plano,
//   um por vez e só quando o navegador está ocioso, para não travar a rolagem.
// Até o iframe carregar, o quadro mostra o texto de data-loading.
//
// Uso no HTML: <div class="embed" data-embed="URL" data-title="..." data-loading="Carregando…"></div>
//
// O post do Instagram avisa a própria altura (mensagem MEASURE). O quadro cresce até
// essa altura, então o iframe não precisa de rolagem interna.
import { whenIdle } from '../util.js';

const MAX_ACTIVE = 2; // posts carregando ao mesmo tempo
const LOAD_TIMEOUT = 10000; // se o Instagram não responder, libera a vaga depois disso

const waiting = new Set(); // quadros registrados que ainda não têm iframe
const urgent = []; // quadros que chegaram perto da tela, em ordem de chegada
let active = 0;
let background = false;
let backgroundScheduled = false;

const observer = 'IntersectionObserver' in window
  ? new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        if (!urgent.includes(entry.target)) urgent.push(entry.target);
      }
      pump();
    }, { rootMargin: '400px 400px' })
  : null;

const isMounted = (el) => el.dataset.mounted === el.dataset.embed;
const isShown = (el) => el.isConnected && el.getClientRects().length > 0;

/** Próximo quadro em segundo plano: o primeiro visível na ordem da página. */
function nextInBackground() {
  let best = null;
  for (const el of waiting) {
    if (!isShown(el)) continue;
    if (!best || best.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING) best = el;
  }
  return best;
}

function pump() {
  while (active < MAX_ACTIVE) {
    let el = null;
    while (urgent.length && !el) {
      const candidate = urgent.shift();
      if (waiting.has(candidate) && !isMounted(candidate)) el = candidate;
    }
    // segundo plano só com a fila vazia, um por vez
    if (!el && background && active === 0) {
      if (!backgroundScheduled) {
        backgroundScheduled = true;
        whenIdle(() => {
          backgroundScheduled = false;
          const next = active === 0 ? nextInBackground() : null;
          if (next) start(next);
        }, 3000);
      }
      return;
    }
    if (!el) return;
    start(el);
  }
}

function start(el) {
  active += 1;
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    active -= 1;
    pump();
  };
  const timer = setTimeout(finish, LOAD_TIMEOUT);
  el._finishLoading = finish;
  mount(el, finish);
}

function mount(el, onLoad) {
  const src = el.dataset.embed;
  waiting.delete(el);
  observer?.unobserve(el);
  if (!src || el.dataset.mounted === src) { onLoad?.(); return; }
  el.querySelector('iframe')?.remove();
  el.classList.remove('is-loaded', 'is-measured');
  el.dataset.mounted = src;
  const frame = document.createElement('iframe');
  frame.src = src;
  frame.title = el.dataset.title || 'Post do Instagram';
  frame.setAttribute('allowtransparency', 'true');
  frame.setAttribute('scrolling', 'no');
  frame.addEventListener('load', () => {
    el.classList.add('is-loaded');
    onLoad?.();
  }, { once: true });
  el.append(frame);
}

function isInstagram(origin) {
  try { return /(^|\.)instagram\.com$/.test(new URL(origin).hostname); } catch { return false; }
}

addEventListener('message', (event) => {
  if (!isInstagram(event.origin)) return;
  let data = event.data;
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch { return; }
  }
  const height = data?.type === 'MEASURE' ? Number(data.details?.height) : 0;
  if (!height) return;
  for (const frame of document.querySelectorAll('.embed iframe')) {
    if (frame.contentWindow !== event.source) continue;
    frame.style.height = `${Math.ceil(height)}px`;
    frame.parentElement.classList.add('is-measured');
    break;
  }
});

/** Põe o quadro na fila: carrega quando chegar perto da tela ou em segundo plano. */
export function lazyEmbed(el) {
  if (!observer) { mount(el); return; }
  if (isMounted(el)) return;
  waiting.add(el);
  observer.observe(el);
  pump();
}

/**
 * Libera o carregamento em segundo plano. Fica desligado com economia de dados
 * ou conexão 2G: aí cada post só carrega quando chega perto da tela.
 */
export function startBackgroundEmbeds() {
  const connection = navigator.connection;
  if (connection?.saveData || /2g/.test(connection?.effectiveType || '')) return;
  background = true;
  pump();
}

/** Troca o post de um quadro. immediate = carrega já, fora da fila (usado no close). */
export function setEmbed(el, src, title, { immediate = false } = {}) {
  el.dataset.embed = src;
  if (title) el.dataset.title = title;
  if (immediate) mount(el);
  else lazyEmbed(el);
}

/** Remove o iframe para liberar memória (ex.: ao fechar o close). */
export function clearEmbed(el) {
  observer?.unobserve(el);
  waiting.delete(el);
  el.querySelector('iframe')?.remove();
  el.classList.remove('is-loaded', 'is-measured');
  delete el.dataset.mounted;
  el._finishLoading?.();
}

/** Ativa todos os quadros que já vêm prontos no HTML. */
export function initEmbeds(root = document) {
  root.querySelectorAll('.embed[data-embed]').forEach(lazyEmbed);
}
