// Configuração do site: contatos, rótulos e caminhos de arquivos.

export const WHATSAPP = '5565992507788';
export const INSTAGRAM = 'https://www.instagram.com/daniperfuraaqui/';

/** Post "Mapa das Perfurações": usado pelos pontos da orelha que ainda não têm post próprio. */
export const MAP_POST = 'DFiKmHFOwr-';

export const REGIONS = { orelha: 'Orelha', rosto: 'Rosto', corpo: 'Corpo' };

/** Post mostrado no close quando o ponto não tem um post próprio. */
export const REGION_POST = { orelha: MAP_POST, rosto: '', corpo: '' };

export const JEWELS = {
  ponto: 'Ponto de luz',
  argola: 'Argola',
  barra: 'Barra',
  fangs: 'Par de barras com pontas cônicas',
  micro: 'Microdermal',
  umbigo: 'Umbigo com pingente',
};

export const METALS = { ouro: 'Ouro', prata: 'Prata' };

export const DATA = {
  points: 'data/pontos.json',
  works: 'data/trabalhos.json',
  voices: 'data/depoimentos.json',
};

/** Modelo completo para computador e um mais leve para celular, os dois comprimidos com Draco. */
export const MODELS = {
  full: 'assets/models/escultura.glb',
  light: 'assets/models/escultura-leve.glb',
};

export const DRACO_DECODER = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/libs/draco/gltf/';

/** Quantos trabalhos aparecem antes do botão "Ver mais". */
export const WORKS_PAGE_SIZE = 6;
