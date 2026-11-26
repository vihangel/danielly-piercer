// Posts do Instagram pesam cerca de 1 MB cada. O iframe só é criado quando o quadro
// chega perto da tela; até lá, o quadro mostra o texto de data-loading.
//
// Uso no HTML: <div class="embed" data-embed="URL" data-title="..." data-loading="Carregando…"></div>
//
// O post do Instagram avisa a própria altura (mensagem MEASURE). O quadro cresce até
// essa altura, então o iframe não precisa de rolagem interna.

const observer = 'IntersectionObserver' in window
  ? new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        mount(entry.target);
      }
    }, { rootMargin: '300px' })
  : null;

function mount(el) {
  const src = el.dataset.embed;
  if (!src || el.dataset.mounted === src) return;
  el.querySelector('iframe')?.remove();
  el.classList.remove('is-loaded', 'is-measured');
  el.dataset.mounted = src;
  const frame = document.createElement('iframe');
  frame.src = src;
  frame.title = el.dataset.title || 'Post do Instagram';
  frame.setAttribute('allowtransparency', 'true');
  frame.setAttribute('scrolling', 'no');
  frame.addEventListener('load', () => el.classList.add('is-loaded'), { once: true });
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

/** Observa o quadro e cria o iframe quando ele se aproxima da tela. */
export function lazyEmbed(el) {
  if (observer) observer.observe(el);
  else mount(el);
}

/** Troca o post de um quadro. immediate = carrega já (usado no close). */
export function setEmbed(el, src, title, { immediate = false } = {}) {
  el.dataset.embed = src;
  if (title) el.dataset.title = title;
  if (immediate) mount(el);
  else lazyEmbed(el);
}

/** Remove o iframe para liberar memória (ex.: ao fechar o close). */
export function clearEmbed(el) {
  observer?.unobserve(el);
  el.querySelector('iframe')?.remove();
  el.classList.remove('is-loaded', 'is-measured');
  delete el.dataset.mounted;
}

/** Ativa todos os quadros que já vêm prontos no HTML. */
export function initEmbeds(root = document) {
  root.querySelectorAll('.embed[data-embed]').forEach(lazyEmbed);
}
