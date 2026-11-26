// Editor de pontos de piercing (abre com #editar no fim do endereço).
// Carregado sob demanda: visitantes comuns não baixam este arquivo nem css/editor.css.
//
// Os pontos editados ficam só neste navegador. Para publicar, use "Baixar pontos.json"
// e troque o arquivo data/pontos.json do repositório.
import { REGIONS, JEWELS, METALS } from '../config.js';
import { getPoints, getPoint, setPoints, notifyChange, toJson, defaultPoints } from '../store.js';
import { escapeHtml, igCode, igUrl, byId } from '../util.js';

const options = (map) => Object.entries(map).map(([value, label]) => `<option value="${value}">${label}</option>`).join('');

const TEMPLATE = `
<aside class="editor" id="editor" aria-label="Editor de pontos de piercing">
  <div class="editor__head"><b>Pontos do mapa</b><button type="button" class="editor__btn" data-action="exit">Sair</button></div>
  <div class="editor__focus" role="group" aria-label="Enquadrar">
    ${Object.entries(REGIONS).map(([key, label]) => `<button type="button" data-focus="${key}">${label}</button>`).join('')}
    <button type="button" data-focus="tudo">Inteira</button>
  </div>
  <ul class="editor__list" id="ed-list"></ul>
  <button type="button" class="editor__btn" data-action="new">+ Novo ponto</button>
  <div class="editor__form" id="ed-form" hidden>
    <label for="ed-name">Nome</label><input id="ed-name" maxlength="40">
    <div class="editor__pair">
      <div><label for="ed-region">Região</label><select id="ed-region">${options(REGIONS)}</select></div>
      <div><label for="ed-metal">Metal</label><select id="ed-metal">${options(METALS)}</select></div>
    </div>
    <label for="ed-jewel">Joia</label><select id="ed-jewel">${options(JEWELS)}</select>
    <label for="ed-size">Tamanho da joia <span id="ed-size-value"></span></label><input type="range" id="ed-size" min=".5" max="2" step=".05">
    <label for="ed-post">Post do Instagram (link)</label><input id="ed-post" placeholder="https://www.instagram.com/p/...">
    <label for="ed-desc">Descrição</label><textarea id="ed-desc" rows="3" maxlength="400"></textarea>
    <p class="editor__hint">Clique na escultura para adicionar uma posição a este ponto. Marque as duas pontas de cada barra. Para angel fangs, marque primeiro a bolinha e depois o cone de cada lado. Arraste para girar e use a roda do mouse para aproximar.</p>
    <div class="editor__pair"><button type="button" class="editor__btn" data-action="undo">Desfazer posição</button><button type="button" class="editor__btn" data-action="clear">Limpar posições</button></div>
    <button type="button" class="editor__btn" data-action="delete">Excluir ponto</button>
  </div>
  <div class="editor__foot">
    <button type="button" class="btn" data-action="download">Baixar pontos.json</button>
    <div class="editor__pair"><button type="button" class="editor__btn" data-action="copy">Copiar JSON</button><button type="button" class="editor__btn" data-action="reset">Restaurar padrão</button></div>
    <p class="editor__status" id="ed-status" role="status"></p>
    <textarea class="editor__json" id="ed-json" rows="3" hidden aria-label="JSON dos pontos"></textarea>
  </div>
</aside>`;

function loadStyles() {
  if (document.querySelector('link[data-editor-css]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'css/editor.css';
  link.dataset.editorCss = '';
  document.head.append(link);
}

/** Botão que pede um segundo clique para confirmar (excluir, restaurar). */
function confirmTwice(button, label, action) {
  let armed = false;
  let timer = 0;
  const original = button.textContent;
  const disarm = () => { armed = false; button.textContent = original; button.classList.remove('is-armed'); };
  return () => {
    if (!armed) {
      armed = true;
      button.textContent = label;
      button.classList.add('is-armed');
      timer = setTimeout(disarm, 3500);
      return;
    }
    clearTimeout(timer);
    disarm();
    action();
  };
}

export function createEditor({ scene, setPointHandler }) {
  loadStyles();
  document.body.insertAdjacentHTML('beforeend', TEMPLATE);
  const root = byId('editor');
  let selectedId = null;
  let dirty = false;

  const selected = () => getPoint(selectedId);
  const status = (text) => { byId('ed-status').textContent = text; };
  const markDirty = () => { dirty = true; status('Alterações não salvas. Baixe o pontos.json para publicar.'); };

  function renderList() {
    byId('ed-list').innerHTML = Object.entries(REGIONS).map(([key, label]) =>
      `<li class="editor__group">${label}</li>` + getPoints().filter((p) => p.region === key).map((p) =>
        `<li><button type="button" class="editor__item" data-select="${escapeHtml(p.id)}" aria-pressed="${p.id === selectedId}">${escapeHtml(p.name)}<small>${p.positions.length ? `${p.positions.length} pos.` : 'sem posição'}</small></button></li>`,
      ).join(''),
    ).join('');
  }

  function renderForm() {
    const point = selected();
    byId('ed-form').hidden = !point;
    if (!point) return;
    byId('ed-name').value = point.name;
    byId('ed-region').value = point.region;
    byId('ed-jewel').value = point.jewel;
    byId('ed-metal').value = point.metal;
    byId('ed-size').value = point.size;
    byId('ed-size-value').textContent = `${Math.round(point.size * 100)}%`;
    byId('ed-post').value = point.post ? igUrl(point.post) : '';
    byId('ed-desc').value = point.description;
  }

  function setFocus(region) {
    scene.focus(region);
    root.querySelectorAll('[data-focus]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.focus === region)));
  }

  function select(id) {
    selectedId = id;
    scene.setSelected(id);
    renderList();
    renderForm();
    const point = selected();
    if (point) setFocus(point.region);
  }

  /** Cada edição muda o ponto no lugar e avisa a página (listas e joias se refazem). */
  function edit(change) {
    const point = selected();
    if (!point) return;
    change(point);
    markDirty();
    notifyChange();
    renderList();
  }

  // campos do formulário
  const fields = {
    'ed-name': (p, v) => { p.name = v.slice(0, 40) || 'Sem nome'; },
    'ed-region': (p, v) => { p.region = v; setFocus(v); },
    'ed-jewel': (p, v) => { p.jewel = v; },
    'ed-metal': (p, v) => { p.metal = v; },
    'ed-size': (p, v) => { p.size = Number(v); byId('ed-size-value').textContent = `${Math.round(p.size * 100)}%`; },
    'ed-post': (p, v) => { p.post = igCode(v); },
    'ed-desc': (p, v) => { p.description = v.slice(0, 400); },
  };
  for (const [id, apply] of Object.entries(fields)) {
    byId(id).addEventListener('input', (event) => edit((p) => apply(p, event.target.value)));
  }

  function download() {
    const blob = new Blob([JSON.stringify(toJson(getPoints()), null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'pontos.json';
    link.click();
    URL.revokeObjectURL(link.href);
    dirty = false;
    status('Arquivo baixado. Substitua data/pontos.json no repositório para publicar.');
  }

  function copy() {
    const text = JSON.stringify(toJson(getPoints()), null, 2);
    const fallback = byId('ed-json');
    navigator.clipboard.writeText(text)
      .then(() => status('JSON copiado.'))
      .catch(() => { fallback.hidden = false; fallback.value = text; fallback.select(); status('Copie o texto selecionado abaixo.'); });
  }

  function addPoint() {
    const active = root.querySelector('[data-focus][aria-pressed="true"]')?.dataset.focus;
    const point = { id: `ponto-${Date.now().toString(36)}`, name: 'Novo ponto', region: REGIONS[active] ? active : 'orelha', description: '', jewel: 'ponto', metal: 'ouro', size: 1, post: '', positions: [] };
    setPoints([...getPoints(), point]);
    markDirty();
    select(point.id);
    status('Clique na escultura para posicionar o novo ponto.');
    byId('ed-name').focus();
  }

  const actions = {
    exit: () => { history.replaceState(null, '', location.pathname + location.search); close(); },
    new: addPoint,
    undo: () => edit((p) => p.positions.pop()),
    clear: () => edit((p) => { p.positions = []; }),
    delete: confirmTwice(root.querySelector('[data-action="delete"]'), 'Clique de novo para excluir', () => {
      setPoints(getPoints().filter((p) => p.id !== selectedId));
      selectedId = null;
      markDirty();
      renderList();
      renderForm();
    }),
    reset: confirmTwice(root.querySelector('[data-action="reset"]'), 'Clique de novo para restaurar', () => {
      setPoints(defaultPoints());
      selectedId = null;
      markDirty();
      renderList();
      renderForm();
    }),
    download,
    copy,
  };

  root.addEventListener('click', (event) => {
    const action = event.target.closest('[data-action]');
    if (action) { actions[action.dataset.action]?.(); return; }
    const pick = event.target.closest('[data-select]');
    if (pick) { select(pick.dataset.select); return; }
    const focus = event.target.closest('[data-focus]');
    if (focus) setFocus(focus.dataset.focus);
  });

  /** Clique na escultura: adiciona a posição ao ponto selecionado. */
  function onSurfaceClick(position) {
    const point = selected();
    if (!point) { status('Escolha um ponto na lista ou crie um novo antes de clicar na escultura.'); return; }
    if (point.positions.length >= 6) { status('Este ponto já tem 6 posições. Use “Desfazer posição” para trocar.'); return; }
    edit((p) => p.positions.push(position));
  }

  function open() {
    root.hidden = false;
    document.body.classList.add('is-editing');
    document.documentElement.style.overflow = 'hidden';
    scene.setEditing(true, { onSurfaceClick });
    setPointHandler((id) => select(id));
    setFocus('orelha');
    renderList();
    renderForm();
    status(dirty ? 'Alterações não salvas. Baixe o pontos.json para publicar.' : 'Escolha um ponto na lista para editar.');
  }

  function close() {
    root.hidden = true;
    document.body.classList.remove('is-editing');
    document.documentElement.style.overflow = '';
    scene.setEditing(false);
    scene.setSelected(null);
    setPointHandler(null);
  }

  return { open, close };
}
