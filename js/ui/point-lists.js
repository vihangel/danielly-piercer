// Listas de nomes de piercing ao lado da escultura (orelha, rosto e corpo).
import { getPoints } from '../store.js';
import { escapeHtml } from '../util.js';

export function renderPointLists() {
  for (const list of document.querySelectorAll('.point-list')) {
    list.innerHTML = getPoints()
      .filter((point) => point.region === list.dataset.region)
      .map((point) => `<li><button type="button" class="chip" data-point="${escapeHtml(point.id)}">${escapeHtml(point.name)}</button></li>`)
      .join('');
  }
}

/** Ao passar o mouse num nome, avisa a escultura para destacar o ponto (evento point:hover). */
export function initPointHover() {
  let current = null;
  document.addEventListener('pointerover', (event) => {
    const button = event.target.closest('.point-list [data-point]');
    const id = button ? button.dataset.point : null;
    if (id === current) return;
    current = id;
    document.dispatchEvent(new CustomEvent('point:hover', { detail: id }));
  });
}
