// Rolagem: mede as seções da escultura, diz em que parte da animação a página está,
// troca o cabeçalho e a palavra de fundo, e encaixa a rolagem em cada parada.
//
// Encaixe: no toque, o próprio CSS faz (scroll-snap nos .snap-point, nativo e suave).
// Com mouse e teclado, o encaixe é feito aqui depois que a rolagem para.
import { clamp, smoothstep, isTouch, prefersReducedMotion, byId } from '../util.js';

const stages = [...document.querySelectorAll('main [data-stage]')];
const works = byId('trabalhos');
const header = byId('site-head');
const ghost = byId('ghost-word');
const listeners = new Set();

let anchors = [];
let worksTop = 0;
let active = -1;
let ghostWord = '';

/** Posição de descanso de cada seção: onde a câmera termina a transição. */
function restY(i) {
  const length = i < anchors.length - 1 ? anchors[i + 1] - anchors[i] : stages[i].offsetHeight;
  return Math.max(0, anchors[i] + length * 0.2 - innerHeight * 0.35);
}

export function measure() {
  anchors = stages.map((s) => s.getBoundingClientRect().top + scrollY);
  worksTop = works.getBoundingClientRect().top + scrollY;
  stages.forEach((stage, i) => {
    const point = stage.querySelector('.snap-point');
    if (point) point.style.top = `${restY(i) - anchors[i]}px`;
  });
}

/** Em que trecho da animação a página está: segment = seção atual, ease = 0..1 até a próxima. */
export function stageState() {
  const y = scrollY + innerHeight * 0.35;
  let segment = 0;
  while (segment < anchors.length - 1 && y >= anchors[segment + 1]) segment++;
  let ease = 0;
  if (segment < anchors.length - 1) {
    const t = (y - anchors[segment]) / (anchors[segment + 1] - anchors[segment]);
    ease = smoothstep(clamp((t - 0.5) / 0.5, 0, 1));
  }
  return { segment, ease, index: ease < 0.5 ? segment : Math.min(segment + 1, anchors.length - 1) };
}

export const stageSection = (i) => stages[i];

/** Leva a página até a parada i da escultura (usado pela seta do início). */
export function scrollToStage(i) {
  if (!stages[i]) return;
  scrollTo({ top: restY(i), behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
}

/** A escultura só precisa desenhar enquanto alguma seção dela está na tela. */
export const sceneInView = () => scrollY <= worksTop + 40;

export function onStageChange(fn) {
  listeners.add(fn);
}

function setGhostWord(word) {
  if (word === ghostWord) return;
  ghostWord = word;
  ghost.classList.add('is-out');
  setTimeout(() => {
    if (ghostWord !== word) return;
    ghost.textContent = word;
    if (word) ghost.classList.remove('is-out');
  }, 350);
}

function update() {
  const y = scrollY;
  header.classList.toggle('is-past', y > innerHeight * 0.35);
  document.body.classList.toggle('is-scrolled', y > 40);
  header.classList.toggle('is-solid', y >= worksTop - 90);
  if (!anchors.length) return;
  const { index } = stageState();
  if (index === active) return;
  active = index;
  const section = stages[index];
  stages.forEach((stage) => stage.classList.toggle('is-active', stage === section));
  setGhostWord(section.dataset.word || '');
  listeners.forEach((fn) => fn(index, section));
}

let ticking = false;
function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    update();
  });
}

function initPointerSnap() {
  let lastY = scrollY;
  let direction = 1;
  let timer = 0;
  let snapping = false;
  let userScrolled = false;

  function snap() {
    snapping = false;
    if (!userScrolled) return;
    userScrolled = false;
    if (document.body.classList.contains('is-editing') || document.documentElement.style.overflow === 'hidden') return;
    if (scrollY > worksTop - innerHeight * 0.9) return;
    const y = scrollY + innerHeight * 0.35;
    let i = 0;
    while (i < anchors.length - 1 && y >= anchors[i + 1]) i++;
    if (i >= anchors.length - 1) return;
    const t = (y - anchors[i]) / (anchors[i + 1] - anchors[i]);
    if (t < 0.42) return;
    const to = direction > 0 ? restY(i + 1) : restY(i);
    if (Math.abs(to - scrollY) < 4) return;
    snapping = true;
    scrollTo({ top: to, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }

  const mark = () => { userScrolled = true; };
  addEventListener('wheel', mark, { passive: true });
  addEventListener('keydown', (e) => { if (/Arrow|Page|Space|Home|End/.test(e.code)) mark(); });
  addEventListener('click', (e) => { if (e.target.closest('a[href^="#"]')) userScrolled = false; }, true);
  addEventListener('scroll', () => {
    const y = scrollY;
    if (!snapping && y !== lastY) direction = y > lastY ? 1 : -1;
    lastY = y;
    clearTimeout(timer);
    timer = setTimeout(snap, snapping ? 60 : 160);
  }, { passive: true });
}

export function initScroll() {
  // seta do início: desce até a primeira parada
  document.querySelector('[data-next-stage]')?.addEventListener('click', () => scrollToStage(1));
  measure();
  update();
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => { measure(); update(); });
  addEventListener('load', () => { measure(); update(); });
  // a página muda de altura quando os posts e as fontes carregam
  if ('ResizeObserver' in window) new ResizeObserver(() => measure()).observe(document.body);
  if (!isTouch()) initPointerSnap();
}
