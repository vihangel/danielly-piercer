// Cores da escultura vindas do tema (css/tokens.css), convertidas para o espaço de cor do three.js.
import * as THREE from 'three';

export function sceneColors() {
  const style = getComputedStyle(document.documentElement);
  const color = (name, fallback) => new THREE.Color(style.getPropertyValue(name).trim() || fallback).convertSRGBToLinear();
  return {
    fog: color('--scene-fog', '#93a983'),
    clay: color('--scene-clay', '#a8553a'),
    gold: color('--scene-gold', '#e0b25a'),
    silver: color('--scene-silver', '#f1ebe0'),
    plinth: color('--scene-plinth', '#1d3426'),
  };
}
