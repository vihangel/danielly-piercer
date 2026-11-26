# Danielly Piercer

Site da Danielly Paixão, body piercing em Cuiabá-MT. Publicado em https://vihangel.github.io/danielly-piercer/

## Estrutura

```
index.html              estrutura da página (HTML semântico, sem CSS nem JS embutidos)
css/
  tokens.css            tema: cores, fontes, medidas, camadas. Mude a identidade visual aqui.
  base.css              reset, tipografia, botões, chips e quadro de post do Instagram
  sections.css          cada seção da página, na ordem; ajustes de tela no fim
  overlays.css          pontos na escultura e o close de cada piercing
  editor.css            editor de pontos (só carrega em #editar)
js/
  main.js               ponto de entrada: carrega a página em etapas
  config.js             contatos, rótulos e caminhos
  util.js               funções pequenas compartilhadas
  store.js              estado dos pontos de piercing
  ui/                   componentes da página (rolagem, listas, trabalhos, comentários, close, posts)
  scene/                escultura 3D (cena, barro, joias, pontos clicáveis, câmera)
  editor/editor.js      editor de pontos (só carrega em #editar)
data/
  pontos.json           piercings: nome, região, descrição, joia, metal, post e posições na escultura
  trabalhos.json        posts do Instagram da grade de trabalhos, com região e tipos
  depoimentos.json      comentários do Instagram
assets/
  logo.svg              logo vetorizada (sprite usado com <use href="assets/logo.svg#logo">)
  models/               escultura completa (computador) e leve (celular), comprimidas com Draco
  icons/, img/          ícones do site e imagem de compartilhamento
```

## Como a página carrega

1. HTML e CSS: texto, menu e logo aparecem na hora.
2. Dados de `data/`: listas de piercing, trabalhos e comentários.
3. Escultura 3D: o three.js e o modelo só baixam quando o navegador fica livre. Celular e aparelhos fracos recebem o modelo leve e um barro mais simples.
4. Posts do Instagram: cada iframe só é criado quando o quadro chega perto da tela, e a grade mostra 6 trabalhos por vez.
5. Editor: só baixa se alguém abrir `#editar`.

A escultura só é redesenhada quando algo muda (câmera, giro, joias). Parada, não gasta processamento.

## Editar conteúdo

- **Textos e seções:** `index.html`.
- **Cores e fontes:** `css/tokens.css`.
- **Trabalhos e comentários:** `data/trabalhos.json` e `data/depoimentos.json`.
- **Pontos de piercing:** abra o site com `#editar` no fim do endereço, ajuste e clique em **Baixar pontos.json**. Substitua `data/pontos.json` pelo arquivo baixado.

Depois de mudar CSS ou JS, aumente o `?v=` dos links no `index.html` para ninguém ficar com a versão antiga em cache.

## Rodar localmente

```bash
python3 -m http.server 8000
```

Depois abra `http://localhost:8000`. Abrir o `index.html` direto do disco não funciona, porque a página busca os arquivos de `data/`.
