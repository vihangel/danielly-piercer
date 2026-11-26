// Ponto de entrada. A página carrega em etapas:
// 1. HTML e CSS: texto, menu e logo aparecem na hora.
// 2. Dados (data/*.json): listas de piercing, trabalhos e comentários.
// 3. Escultura 3D: three.js e o modelo só baixam quando o navegador fica livre.
// 4. Posts do Instagram: cada iframe só nasce quando o quadro chega perto da tela.
// 5. Editor: só baixa se alguém abrir #editar.
import { DATA } from './config.js';
import { byId, centerOf, fetchJson, isLowPower, prefersReducedMotion, whatsappUrl, whenIdle } from './util.js';
import { fromJson, initPoints, onPointsChange } from './store.js';
import { initScroll } from './ui/scroll.js';
import { initEmbeds } from './ui/embeds.js';
import { renderPointLists, initPointHover } from './ui/point-lists.js';
import { createWorks } from './ui/works.js';
import { renderVoices } from './ui/voices.js';
import { createDetail } from './ui/detail.js';

// links de WhatsApp com a mensagem pronta (o HTML já funciona sem ela)
document.querySelectorAll('[data-wa]').forEach((link) => { link.href = whatsappUrl(link.dataset.wa); });

initScroll();
initEmbeds();
initPointHover();

const loadJson = (url, fallback) => fetchJson(url).catch((error) => { console.warn(error); return fallback; });
const [pointsJson, worksJson, voicesJson] = await Promise.all([
  loadJson(DATA.points, []),
  loadJson(DATA.works, []),
  loadJson(DATA.voices, []),
]);

initPoints(fromJson(pointsJson));
renderPointLists();
onPointsChange(renderPointLists);

const works = createWorks({
  grid: byId('works-grid'),
  filters: byId('works-filters'),
  types: byId('works-types'),
  more: byId('works-more'),
  nav: byId('works-nav'),
}, worksJson);

renderVoices(byId('voices'), voicesJson);

const detail = createDetail({
  onShowWorks(region) {
    works.showRegion(region);
    setTimeout(() => byId('trabalhos').scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' }), 300);
  },
});

// clique num piercing (lista, ponto na escultura ou a própria joia) abre o close;
// com o editor aberto, o mesmo clique seleciona o ponto
const openDetail = (id, origin) => detail.open(id, origin);
let handlePoint = openDetail;
document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-point]');
  if (!button || button.closest('#detail')) return;
  handlePoint(button.dataset.point, centerOf(button));
});

// ---------- escultura 3D, depois que a página já está visível ----------
const canvas = byId('scene');
const loader = byId('scene-loader');
const scene = new Promise((resolve) => {
  whenIdle(async () => {
    try {
      const { startScene } = await import('./scene/index.js');
      resolve(await startScene({
        canvas,
        loader,
        hotspotLayer: byId('hotspots'),
        lowPower: isLowPower(),
        onPointClick: (id, origin) => handlePoint(id, origin),
      }));
    } catch (error) {
      // sem WebGL ou sem rede para o three.js: a página segue sem a escultura
      console.warn('Escultura indisponível:', error);
      canvas.remove();
      loader.hidden = true;
      document.querySelector('.edit-link')?.remove();
      resolve(null);
    }
  });
});

// ---------- editor (#editar) ----------
let editor = null;
async function syncEditor() {
  if (location.hash !== '#editar') { editor?.close(); return; }
  const sceneApi = await scene;
  if (!sceneApi) return;
  if (!editor) {
    const { createEditor } = await import('./editor/editor.js');
    editor = createEditor({ scene: sceneApi, setPointHandler: (fn) => { handlePoint = fn || openDetail; } });
  }
  editor.open();
}
addEventListener('hashchange', syncEditor);
syncEditor();
