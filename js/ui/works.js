// Grade de trabalhos do Instagram: filtro por região e por tipo, páginas de
// WORKS_PAGE_SIZE posts e iframes criados só quando o quadro aparece.
//
// Os cartões são criados uma vez e só escondidos ou mostrados. Assim um post que
// já carregou não recarrega ao trocar de filtro.
import { REGIONS, WORKS_PAGE_SIZE } from '../config.js';
import { escapeHtml, igUrl, igEmbedUrl } from '../util.js';
import { lazyEmbed } from './embeds.js';

function cardHtml(post) {
  return `<article class="work-card" data-post="${escapeHtml(post.post)}" hidden>
    <div class="embed" data-embed="${igEmbedUrl(post.post)}" data-title="${escapeHtml(post.titulo)}, post da Dani no Instagram" data-loading="Carregando post…"></div>
    <a href="${igUrl(post.post)}"><span>${escapeHtml(post.titulo)}</span><small>${REGIONS[post.regiao] || ''} · abrir no Instagram</small></a>
  </article>`;
}

export function createWorks({ grid, filters, types, more }, posts) {
  let region = 'todos';
  let type = '';
  let limit = WORKS_PAGE_SIZE;

  grid.innerHTML = posts.map(cardHtml).join('');
  const cards = [...grid.children];

  const countIn = (key) => (key === 'todos' ? posts.length : posts.filter((p) => p.regiao === key).length);

  function render() {
    const inRegion = posts.filter((p) => region === 'todos' || p.regiao === region);
    const matching = inRegion.filter((p) => !type || p.tipos.includes(type));
    const visible = new Set(matching.slice(0, limit).map((p) => p.post));

    for (const card of cards) {
      const show = visible.has(card.dataset.post);
      card.hidden = !show;
      if (show && !card.dataset.watched) {
        card.dataset.watched = '1';
        lazyEmbed(card.querySelector('.embed'));
      }
    }

    const remaining = matching.length - limit;
    more.hidden = remaining <= 0;
    more.textContent = `Ver mais trabalhos (${remaining})`;

    filters.innerHTML = [['todos', 'Tudo'], ...Object.entries(REGIONS)]
      .map(([key, label]) => `<li><button type="button" data-region="${key}" aria-pressed="${key === region}">${label}<small>${countIn(key)}</small></button></li>`)
      .join('');

    const typeList = region === 'todos' ? [] : [...new Set(inRegion.flatMap((p) => p.tipos))];
    types.hidden = !typeList.length;
    types.innerHTML = typeList.length
      ? ['', ...typeList]
          .map((t) => `<li><button type="button" class="chip" data-type="${escapeHtml(t)}" aria-pressed="${t === type}">${t ? escapeHtml(t) : 'Todas'}<small>${inRegion.filter((p) => !t || p.tipos.includes(t)).length}</small></button></li>`)
          .join('')
      : '';
  }

  filters.addEventListener('click', (event) => {
    const button = event.target.closest('[data-region]');
    if (!button) return;
    region = button.dataset.region;
    type = '';
    limit = WORKS_PAGE_SIZE;
    render();
  });
  types.addEventListener('click', (event) => {
    const button = event.target.closest('[data-type]');
    if (!button) return;
    type = button.dataset.type;
    limit = WORKS_PAGE_SIZE;
    render();
  });
  more.addEventListener('click', () => {
    limit += WORKS_PAGE_SIZE;
    render();
  });

  render();

  return {
    /** Abre a grade já filtrada por uma região (usado pelo close). */
    showRegion(key) {
      region = REGIONS[key] ? key : 'todos';
      type = '';
      limit = WORKS_PAGE_SIZE;
      render();
    },
  };
}
