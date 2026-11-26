// Faixa de comentários do Instagram. A animação para quando a faixa sai da tela.
import { escapeHtml } from '../util.js';

export function renderVoices(track, voices) {
  const html = voices
    .map((v) => `<figure class="quote"><q>${escapeHtml(v.texto)}</q><figcaption>${escapeHtml(v.autor)}</figcaption></figure>`)
    .join('');
  // a faixa se repete uma vez para o loop ficar contínuo; a cópia fica escondida dos leitores de tela
  track.innerHTML = html + html.replace(/<figure /g, '<figure aria-hidden="true" ');

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => track.classList.toggle('is-paused', !entry.isIntersecting)).observe(track);
  }
}
