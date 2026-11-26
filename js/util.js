// Funções pequenas usadas em vários módulos.
import { WHATSAPP } from './config.js';

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export const smoothstep = (t) => t * t * (3 - 2 * t);

const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => ENTITIES[c]);

export const byId = (id) => document.getElementById(id);

export const igUrl = (code) => `https://www.instagram.com/p/${encodeURIComponent(code)}/`;
export const igEmbedUrl = (code) => `${igUrl(code)}embed/`;

/** Aceita o código do post ou o link inteiro do Instagram e devolve só o código. */
export function igCode(value) {
  const match = String(value || '').trim().match(/(?:instagram\.com\/(?:p|reel)\/)?([A-Za-z0-9_-]{6,20})\/?(?:\?.*)?$/);
  return match ? match[1] : '';
}

export const whatsappUrl = (text) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;

export const prefersReducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export const isTouch = () => matchMedia('(pointer: coarse)').matches;

/** Celulares, tablets e aparelhos fracos ganham a versão leve da escultura. */
export function isLowPower() {
  const fewCores = (navigator.hardwareConcurrency || 8) <= 4;
  const saveData = Boolean(navigator.connection && navigator.connection.saveData);
  return isTouch() || innerWidth <= 900 || fewCores || saveData;
}

/** Roda quando o navegador estiver livre, depois do conteúdo aparecer. */
export function whenIdle(fn, timeout = 1200) {
  if ('requestIdleCallback' in window) requestIdleCallback(fn, { timeout });
  else setTimeout(fn, 120);
}

export async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  return response.json();
}

/** Centro de um elemento na tela, usado para abrir o close a partir dele. */
export function centerOf(element) {
  const rect = element.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}
