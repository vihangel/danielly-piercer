# Danielly Piercer

Landing page de estudo para Danielly Paixão, body piercing em Cuiabá-MT.

- `index.html`: a página inteira (HTML, CSS e JS). Usa three.js r128 via CDN.
- `escultura.glb`: a escultura 3D (240 mil triângulos, sem joias). O barro é um shader procedural no próprio `index.html`.
- `logo-danielly.svg`: a logo vetorizada.
- `favicon.svg`, `favicon-32.png`, `apple-touch-icon.png`, `icon-*.png`: ícones do site e do app.
- `og-image.png`: imagem de compartilhamento (WhatsApp, Instagram, Google).
- `manifest.webmanifest`, `robots.txt`, `sitemap.xml`: configuração para navegadores e buscadores. Os dados do negócio (JSON-LD) ficam no `<head>` do `index.html`.

## Pontos de piercing

As joias não ficam no modelo. Cada ponto é um dado (`DEF` no `index.html`): nome, região, descrição, tipo de joia, metal, tamanho, posições na escultura e o post do Instagram ligado a ele.

Para ajustar os pontos, abra o site com `#editar` no fim do endereço. Clique na escultura para posicionar, troque joia e metal, e use **Copiar JSON** para levar os pontos para o `index.html`.

## Rodar localmente

```bash
python3 -m http.server 8000
```

Depois abra `http://localhost:8000`.
