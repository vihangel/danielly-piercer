// Pontos clicáveis por cima da escultura. São botões HTML posicionados a cada quadro
// desenhado; só mudam de classe quando a visibilidade muda.
import * as THREE from 'three';

const world = new THREE.Vector3();
const normal = new THREE.Vector3();
const toCamera = new THREE.Vector3();

export function createHotspots(layer) {
  let items = [];

  return {
    rebuild(entries) {
      for (const item of items) item.button.remove();
      items = entries.map(({ point, anchor }) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'hot';
        button.dataset.point = point.id;
        button.tabIndex = -1;
        button.setAttribute('aria-label', `Ver ${point.name}`);
        const label = document.createElement('span');
        label.textContent = point.name;
        button.append(label);
        layer.append(button);
        return { point, anchor, button, on: false };
      });
    },

    /** Só os pontos da região atual entram na ordem do Tab. */
    setRegion(region) {
      for (const item of items) item.button.tabIndex = item.point.region === region ? 0 : -1;
    },

    highlight(id) {
      for (const item of items) item.button.classList.toggle('is-hi', item.point.id === id);
    },

    setSelected(id) {
      for (const item of items) item.button.classList.toggle('is-selected', item.point.id === id);
    },

    update(camera, width, height, { region, settled }) {
      for (const item of items) {
        let on = settled && Boolean(item.anchor) && (region === '*' || item.point.region === region);
        if (on) {
          item.anchor.getWorldPosition(world);
          normal.copy(item.anchor.userData.normal).transformDirection(item.anchor.parent.matrixWorld);
          toCamera.copy(camera.position).sub(world).normalize();
          // esconde pontos virados para o outro lado da escultura
          if (normal.dot(toCamera) < 0.05) on = false;
          else {
            world.project(camera);
            item.button.style.transform = `translate3d(${(world.x * 0.5 + 0.5) * width}px,${(-world.y * 0.5 + 0.5) * height}px,0)`;
          }
        }
        if (on !== item.on) {
          item.on = on;
          item.button.classList.toggle('is-on', on);
        }
      }
    },
  };
}
