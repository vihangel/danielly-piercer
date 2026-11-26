// Estado dos pontos de piercing. Quem precisa reagir a mudanças assina onPointsChange.
//
// Formato interno de um ponto:
// { id, name, region, description, jewel, metal, size, post, positions: [[x, y, z, nx, ny, nz], ...] }
// As posições estão em coordenadas do modelo 3D (a escultura tem 1 unidade de altura).
import { REGIONS, JEWELS, METALS } from './config.js';
import { clamp, igCode } from './util.js';

const events = new EventTarget();
let points = [];
let defaults = [];
let index = new Map();

const round = (value) => Math.round(value * 1e5) / 1e5;

/** Converte e valida o JSON de data/pontos.json (chaves em português). */
export function fromJson(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  const seen = new Set();
  for (const raw of list.slice(0, 80)) {
    if (!raw || typeof raw !== 'object') continue;
    const id = String(raw.id || '').replace(/[^a-z0-9_-]/gi, '').slice(0, 40);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const positions = (Array.isArray(raw.posicoes) ? raw.posicoes : [])
      .slice(0, 6)
      .map((q) => q && [q.x, q.y, q.z, q.nx, q.ny, q.nz].map(Number))
      .filter((a) => a && a.every(Number.isFinite));
    out.push({
      id,
      name: String(raw.nome || id).slice(0, 40),
      region: REGIONS[raw.regiao] ? raw.regiao : 'orelha',
      description: String(raw.descricao || '').slice(0, 400),
      jewel: JEWELS[raw.joia] ? raw.joia : 'ponto',
      metal: METALS[raw.metal] ? raw.metal : 'ouro',
      size: clamp(Number(raw.tamanho) || 1, 0.5, 2),
      post: igCode(raw.post),
      positions,
    });
  }
  return out;
}

/** Converte de volta para o formato de data/pontos.json. */
export function toJson(list) {
  return list.map((p) => ({
    id: p.id,
    nome: p.name,
    regiao: p.region,
    descricao: p.description,
    joia: p.jewel,
    metal: p.metal,
    tamanho: p.size,
    post: p.post,
    posicoes: p.positions.map((a) => ({
      x: round(a[0]), y: round(a[1]), z: round(a[2]),
      nx: round(a[3]), ny: round(a[4]), nz: round(a[5]),
    })),
  }));
}

export const clonePoints = (list) => list.map((p) => ({ ...p, positions: p.positions.map((a) => a.slice()) }));

export const getPoints = () => points;
export const getPoint = (id) => index.get(id);

export function initPoints(list) {
  defaults = clonePoints(list);
  setPoints(list);
}

export const defaultPoints = () => clonePoints(defaults);

export function setPoints(list) {
  points = list;
  index = new Map(list.map((p) => [p.id, p]));
  notifyChange();
}

/** Avisa os assinantes depois de editar um ponto no lugar (usado pelo editor). */
export function notifyChange() {
  events.dispatchEvent(new Event('change'));
}

export function onPointsChange(fn) {
  events.addEventListener('change', fn);
}
