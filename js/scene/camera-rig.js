// Para onde a câmera olha em cada seção, e a órbita livre do editor.
import * as THREE from 'three';
import { clamp } from '../util.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

/**
 * Uma parada por seção com data-stage (abertura, como funciona, orelha, rosto, corpo).
 * p = posição da câmera, t = alvo, s = deslocamento lateral do alvo no computador
 * (fração da meia-largura; negativo empurra a escultura para a direita).
 */
export const KEYFRAMES = [
  { p: V(0, 0.62, 7), t: V(0, 0.62, 0), s: 0 },
  { p: V(-2.5, 1.4, 4.4), t: V(0, 1, 0), s: 0.42 },
  { p: V(-1.95, 2.02, 0.72), t: V(-0.06, 1.6, -0.09), s: -0.38 },
  { p: V(1.16, 1.62, 2.15), t: V(0.34, 1.5, 0.03), s: -0.36 },
  { p: V(0.3, 0.53, 4.05), t: V(0.02, 0.44, 0.56), s: -0.4 },
];

export const FOCUS = { tudo: 0, orelha: 2, rosto: 3, corpo: 4 };

const up = V(0, 1, 0);
const right = V(0, 0, 0);
const tanHalfFov = Math.tan(THREE.MathUtils.degToRad(15));

/** Posição e alvo da câmera para o ponto atual da rolagem. */
export function scrollGoal({ segment, ease }, aspect, narrow, outPos, outTarget) {
  const a = KEYFRAMES[Math.min(segment, KEYFRAMES.length - 1)];
  const b = KEYFRAMES[Math.min(segment + 1, KEYFRAMES.length - 1)];
  outPos.copy(a.p).lerp(b.p, ease);
  outTarget.copy(a.t).lerp(b.t, ease);

  // telas em pé: afasta a câmera para a escultura caber
  if (aspect < 1) {
    const factor = clamp((segment === 0 ? 0.72 + 0.08 * ease : 0.8) / aspect, 1, 1.85);
    outPos.sub(outTarget).multiplyScalar(factor).add(outTarget);
  }

  const half = outPos.distanceTo(outTarget) * tanHalfFov;
  if (narrow) {
    // até 900px o texto fica embaixo: sobe a escultura
    outTarget.addScaledVector(up, -half * 0.46 * (segment === 0 ? ease : 1) + (segment === 0 ? half * 0.1 * (1 - ease) : 0));
  } else {
    const shift = a.s + (b.s - a.s) * ease;
    right.subVectors(outTarget, outPos).cross(up).normalize();
    outTarget.addScaledVector(right, shift * half * aspect);
  }
}

/** Órbita do editor a partir de uma parada (zoom > 1 afasta). */
export function orbitFromKeyframe(keyframe, zoom = 1) {
  const v = keyframe.p.clone().sub(keyframe.t);
  const length = v.length();
  return {
    target: keyframe.t.clone(),
    distance: length * zoom,
    theta: Math.atan2(v.x, v.z),
    phi: Math.asin(clamp(v.y / length, -1, 1)),
  };
}

export function orbitGoal(orbit, outPos, outTarget) {
  outTarget.copy(orbit.target);
  outPos
    .set(Math.cos(orbit.phi) * Math.sin(orbit.theta), Math.sin(orbit.phi), Math.cos(orbit.phi) * Math.cos(orbit.theta))
    .multiplyScalar(orbit.distance)
    .add(orbit.target);
}
