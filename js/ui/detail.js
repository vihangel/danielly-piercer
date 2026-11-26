// Close de cada piercing. No computador abre num círculo a partir de onde a pessoa
// tocou; no celular abre com fade (ver css/overlays.css).
import { REGIONS, JEWELS, METALS, REGION_POST, MAP_POST, INSTAGRAM } from '../config.js';
import { getPoint } from '../store.js';
import { byId, igUrl, igEmbedUrl, whatsappUrl, prefersReducedMotion } from '../util.js';
import { setEmbed, clearEmbed } from './embeds.js';

function jewelText(point) {
  if (!point.positions.length) return 'Este ponto não aparece na escultura.';
  const showCount = point.positions.length > 1 && !['barra', 'umbigo', 'fangs'].includes(point.jewel);
  const count = showCount ? ` (${point.positions.length} furos)` : '';
  return `Na escultura: ${JEWELS[point.jewel].toLowerCase()} em tom de ${METALS[point.metal].toLowerCase()}${count}.`;
}

export function createDetail({ onShowWorks }) {
  const root = byId('detail');
  const media = byId('detail-media');
  const embed = byId('detail-embed');
  const link = byId('detail-link');
  let current = null;
  let lastFocus = null;

  function fill(point) {
    const region = REGIONS[point.region];
    byId('detail-name').textContent = point.name;
    byId('detail-region').textContent = region;
    byId('detail-desc').textContent = point.description;
    byId('detail-jewel').textContent = jewelText(point);
    byId('detail-works').textContent = `Ver trabalhos de ${region.toLowerCase()}`;
    byId('detail-book').href = whatsappUrl(`Oi, Dani! Vim pelo site e quero agendar um piercing: ${point.name}.`);

    const code = point.post || REGION_POST[point.region];
    media.classList.toggle('is-empty', !code);
    if (code) {
      setEmbed(embed, igEmbedUrl(code), `${point.name}: trabalho da Dani no Instagram`, { immediate: true });
      link.href = igUrl(code);
      link.textContent = code === MAP_POST ? 'Ver o Mapa das Perfurações no Instagram' : 'Abrir no Instagram';
    } else {
      clearEmbed(embed);
      link.href = INSTAGRAM;
      link.textContent = 'Ver todos os trabalhos no Instagram';
    }
  }

  function open(id, origin) {
    const point = getPoint(id);
    if (!point) return;
    current = point;
    lastFocus = document.activeElement;
    fill(point);
    root.style.setProperty('--cx', `${origin.x}px`);
    root.style.setProperty('--cy', `${origin.y}px`);
    root.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-open')));
    document.documentElement.style.overflow = 'hidden';
    setTimeout(() => byId('detail-close').focus({ preventScroll: true }), prefersReducedMotion() ? 0 : 400);
  }

  function close() {
    if (root.hidden) return;
    root.classList.remove('is-open');
    document.documentElement.style.overflow = '';
    setTimeout(() => {
      if (root.classList.contains('is-open')) return;
      root.hidden = true;
      clearEmbed(embed);
    }, prefersReducedMotion() ? 0 : 820);
    lastFocus?.focus({ preventScroll: true });
  }

  byId('detail-close').addEventListener('click', close);
  byId('detail-works').addEventListener('click', () => {
    const region = current?.region;
    close();
    onShowWorks(region);
  });
  addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
  });

  return { open, close };
}
