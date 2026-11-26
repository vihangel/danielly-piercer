// Escultura 3D: monta a cena, carrega o modelo e desenha só quando algo muda
// (câmera andando, giro, balanço da abertura ou joias novas). Parada, a cena não gasta nada.
//
// Este módulo é carregado depois que o conteúdo da página aparece (ver js/main.js).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { MODELS, DRACO_DECODER } from '../config.js';
import { clamp, prefersReducedMotion } from '../util.js';
import { getPoints, onPointsChange } from '../store.js';
import { stageState, stageSection, sceneInView, onStageChange } from '../ui/scroll.js';
import { sceneColors } from './theme.js';
import { createClayMaterial } from './clay.js';
import { createJewelry } from './jewelry.js';
import { createHotspots } from './hotspots.js';
import { KEYFRAMES, FOCUS, scrollGoal, orbitFromKeyframe, orbitGoal } from './camera-rig.js';

/** Ambiente de estúdio usado nos reflexos do metal e no brilho do barro. */
function studioEnvironment(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new THREE.Scene();
  room.add(new THREE.Mesh(new THREE.BoxGeometry(12, 12, 12), new THREE.MeshBasicMaterial({ color: 0x5f7656, side: THREE.BackSide })));
  for (const [color, w, h, x, y, z] of [[0xfff4e6, 4, 2.4, -4, 4, 3], [0xdfe8d2, 2, 5, 5, 1, -3], [0xffffff, 6, 1, 0, 5.5, 0], [0xc98a62, 3, 1.5, 0, -3, 4]]) {
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
    panel.position.set(x, y, z);
    panel.lookAt(0, 0, 0);
    room.add(panel);
  }
  const texture = pmrem.fromScene(room, 0.04).texture;
  pmrem.dispose();
  return texture;
}

function addLights(scene, lowPower) {
  const linear = (hex) => new THREE.Color(hex).convertSRGBToLinear();
  scene.add(new THREE.HemisphereLight(linear(0xfff3e4), linear(0x5d7553), 0.5));
  const key = new THREE.DirectionalLight(linear(0xfff0dc), 2.4);
  key.position.set(-3, 5, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(lowPower ? 1024 : 2048, lowPower ? 1024 : 2048);
  Object.assign(key.shadow.camera, { left: -2.5, right: 2.5, top: 3, bottom: -3, near: 0.5, far: 15 });
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  scene.add(key);
  const rim = new THREE.DirectionalLight(linear(0xf3f7e8), 1.3);
  rim.position.set(3.5, 2, -4);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(linear(0xffffff), 0.45);
  fill.position.set(3, 0, 5);
  scene.add(fill);
}

export async function startScene({ canvas, hotspotLayer, loader, lowPower, onPointClick }) {
  const reduceMotion = prefersReducedMotion();
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: lowPower ? 'low-power' : 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, lowPower ? 1.5 : 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = lowPower ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;

  const colors = sceneColors();
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(colors.fog, 9, 16);
  scene.environment = studioEnvironment(renderer);
  addLights(scene, lowPower);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 60);

  const root = new THREE.Group();
  scene.add(root);
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 3, lowPower ? 40 : 72), new THREE.MeshStandardMaterial({ color: colors.plinth, roughness: 0.92 }));
  plinth.position.set(0, -2.12, -0.05);
  plinth.receiveShadow = true;
  root.add(plinth);

  // o modelo tem 1 unidade de altura; os pontos de piercing estão nesse espaço
  const model = new THREE.Group();
  model.scale.setScalar(2.7);
  model.position.set(0.038, -0.62, -0.12);
  root.add(model);

  const materials = {
    clay: createClayMaterial(colors.clay, { lowQuality: lowPower }),
    ouro: new THREE.MeshStandardMaterial({ color: colors.gold, roughness: 0.18, metalness: 1, envMapIntensity: 2 }),
    prata: new THREE.MeshStandardMaterial({ color: colors.silver, roughness: 0.14, metalness: 1, envMapIntensity: 2 }),
  };

  // ---------- estado ----------
  let width = 0;
  let height = 0;
  let narrow = false;
  let needsRender = true;
  let loaded = false;
  let editing = false;
  let region = '';
  let rotation = 0;
  let rotationGoal = 0;
  let press = null;
  let orbitDrag = null;
  let surfaceClick = null;
  const meshes = [];
  const orbit = orbitFromKeyframe(KEYFRAMES[0]);
  const cameraPos = KEYFRAMES[0].p.clone();
  const cameraTarget = KEYFRAMES[0].t.clone();
  const goalPos = new THREE.Vector3();
  const goalTarget = new THREE.Vector3();
  const invalidate = () => { needsRender = true; };

  // ---------- joias e pontos ----------
  const jewelry = createJewelry(model, materials);
  const hotspots = createHotspots(hotspotLayer);
  function rebuildJewelry() {
    hotspots.rebuild(jewelry.rebuild(getPoints()));
    hotspots.setRegion(region);
    invalidate();
  }
  rebuildJewelry();
  onPointsChange(rebuildJewelry);
  document.addEventListener('point:hover', (event) => hotspots.highlight(event.detail));

  // ---------- modelo ----------
  const loaderDelay = setTimeout(() => { loader.hidden = false; }, 400);
  const draco = new DRACOLoader().setDecoderPath(DRACO_DECODER);
  new GLTFLoader().setDRACOLoader(draco).load(
    lowPower ? MODELS.light : MODELS.full,
    (gltf) => {
      gltf.scene.traverse((o) => {
        if (!o.isMesh) return;
        o.material = materials.clay;
        o.castShadow = true;
        o.receiveShadow = true;
        meshes.push(o);
      });
      model.add(gltf.scene);
      loaded = true;
      clearTimeout(loaderDelay);
      loader.hidden = true;
      draco.dispose();
      invalidate();
    },
    (event) => {
      if (event.total) loader.textContent = `Carregando a escultura… ${Math.round((event.loaded / event.total) * 100)}%`;
    },
    () => {
      clearTimeout(loaderDelay);
      loader.hidden = false;
      loader.textContent = 'Não foi possível carregar a escultura.';
      setTimeout(() => { loader.hidden = true; }, 4000);
    },
  );

  // ---------- tamanho e câmera ----------
  function applyViewOffset() {
    // no editor, o painel cobre parte da tela: desloca a imagem para o lado livre
    if (editing && width > 760) camera.setViewOffset(width, height, 190, 0, width, height);
    else if (editing) camera.setViewOffset(width, height, 0, height * 0.24, width, height);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }
  function resize() {
    width = innerWidth;
    height = innerHeight;
    narrow = width <= 900;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    applyViewOffset();
    invalidate();
  }
  addEventListener('resize', resize);
  resize();

  function setRegion(section) {
    region = section?.dataset.region || '';
    hotspots.setRegion(region);
  }
  setRegion(stageSection(stageState().index));
  onStageChange((index, section) => {
    setRegion(section);
    rotationGoal = 0;
    invalidate();
  });

  // ---------- interação na página ----------
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const aim = (x, y) => {
    ndc.set((x / width) * 2 - 1, -(y / height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
  };
  function jewelAt(x, y) {
    aim(x, y);
    let object = raycaster.intersectObjects(jewelry.group.children, true)[0]?.object;
    while (object && !object.userData.pointId) object = object.parent;
    return object ? object.userData.pointId : null;
  }
  const overInterface = (event) => event.target.closest('a,button,input,select,textarea,.solid,.detail,.editor');

  addEventListener('pointerdown', (event) => {
    if (editing || overInterface(event) || !sceneInView()) return;
    press = { x: event.clientX, y: event.clientY, rotation: rotationGoal, moved: false };
  });
  let hoverAt = 0;
  addEventListener('pointermove', (event) => {
    if (press) {
      const dx = event.clientX - press.x;
      if (Math.abs(dx) > 6) press.moved = true;
      if (press.moved) {
        rotationGoal = press.rotation + dx * 0.008;
        invalidate();
      }
      return;
    }
    // cursor de mão sobre as joias (só com mouse, no máximo a cada 100 ms)
    if (event.pointerType !== 'mouse' || editing || !loaded || !sceneInView() || overInterface(event)) return;
    const now = performance.now();
    if (now - hoverAt < 100) return;
    hoverAt = now;
    document.body.style.cursor = jewelAt(event.clientX, event.clientY) ? 'pointer' : '';
  }, { passive: true });
  addEventListener('pointerup', (event) => {
    if (!press) return;
    const { moved } = press;
    press = null;
    if (moved || editing) return;
    const id = jewelAt(event.clientX, event.clientY);
    if (id) onPointClick(id, { x: event.clientX, y: event.clientY });
  });
  addEventListener('pointercancel', () => { press = null; });

  // ---------- interação no editor ----------
  canvas.addEventListener('pointerdown', (event) => {
    if (!editing) return;
    orbitDrag = { x: event.clientX, y: event.clientY, theta: orbit.theta, phi: orbit.phi, moved: false };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!editing || !orbitDrag) return;
    const dx = event.clientX - orbitDrag.x;
    const dy = event.clientY - orbitDrag.y;
    if (Math.hypot(dx, dy) > 5) orbitDrag.moved = true;
    if (!orbitDrag.moved) return;
    orbit.theta = orbitDrag.theta - dx * 0.006;
    orbit.phi = clamp(orbitDrag.phi + dy * 0.006, -1.2, 1.3);
    invalidate();
  });
  canvas.addEventListener('pointerup', (event) => {
    if (!editing || !orbitDrag) return;
    const { moved } = orbitDrag;
    orbitDrag = null;
    if (moved || !surfaceClick) return;
    const hit = surfaceAt(event.clientX, event.clientY);
    if (hit) surfaceClick(hit);
  });
  canvas.addEventListener('wheel', (event) => {
    if (!editing) return;
    event.preventDefault();
    orbit.distance = clamp(orbit.distance * (1 + event.deltaY * 0.0012), 0.35, 9);
    invalidate();
  }, { passive: false });

  const inverse = new THREE.Matrix4();
  /** Ponto da pele sob o cursor, em coordenadas do modelo (formato de data/pontos.json). */
  function surfaceAt(x, y) {
    if (!meshes.length) return null;
    aim(x, y);
    const hit = raycaster.intersectObjects(meshes, false)[0];
    if (!hit) return null;
    inverse.copy(model.matrixWorld).invert();
    const p = hit.point.clone().applyMatrix4(inverse);
    const n = hit.face.normal.clone().transformDirection(hit.object.matrixWorld).transformDirection(inverse);
    return [p.x, p.y, p.z, n.x, n.y, n.z];
  }

  // ---------- desenho ----------
  function frame(now) {
    requestAnimationFrame(frame);
    if (!editing && !sceneInView()) return;

    const state = stageState();
    if (editing) orbitGoal(orbit, goalPos, goalTarget);
    else scrollGoal(state, camera.aspect, narrow, goalPos, goalTarget);

    const follow = reduceMotion ? 1 : editing ? 0.25 : 0.07;
    const cameraMoving = cameraPos.distanceToSquared(goalPos) > 1e-7 || cameraTarget.distanceToSquared(goalTarget) > 1e-7;
    if (cameraMoving) {
      cameraPos.lerp(goalPos, follow);
      cameraTarget.lerp(goalTarget, follow);
    }

    const rotating = Math.abs(rotationGoal - rotation) > 1e-4;
    if (rotating) rotation += (rotationGoal - rotation) * (reduceMotion ? 1 : 0.08);
    // balanço suave na abertura, só no computador
    const sway = !editing && !lowPower && !reduceMotion && !press && state.index === 0 ? Math.sin(now * 0.00035) * 0.3 : 0;
    const targetRotation = editing ? 0 : rotation + sway;

    if (!needsRender && !cameraMoving && !rotating && root.rotation.y === targetRotation) return;
    needsRender = false;
    root.rotation.y = targetRotation;
    camera.position.copy(cameraPos);
    camera.lookAt(cameraTarget);
    renderer.render(scene, camera);
    if (loaded && !canvas.classList.contains('is-ready')) canvas.classList.add('is-ready');

    const settled = editing || cameraPos.distanceTo(goalPos) < 0.12;
    hotspots.update(camera, width, height, { region: editing ? '*' : region, settled });
  }
  requestAnimationFrame(frame);

  // ---------- API usada pelo editor ----------
  return {
    setEditing(on, { onSurfaceClick = null } = {}) {
      editing = on;
      surfaceClick = on ? onSurfaceClick : null;
      if (on) Object.assign(orbit, orbitFromKeyframe(KEYFRAMES[FOCUS.orelha], 1.15));
      applyViewOffset();
      invalidate();
    },
    focus(regionKey) {
      Object.assign(orbit, orbitFromKeyframe(KEYFRAMES[FOCUS[regionKey] ?? 0], regionKey === 'tudo' ? 1 : 1.15));
      invalidate();
    },
    setSelected(id) {
      hotspots.setSelected(id);
    },
  };
}
