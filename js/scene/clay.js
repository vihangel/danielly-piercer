// Barro cru procedural: manchas de tom, grão, pontinhos e marcas de modelagem.
// O modelo não tem textura; tudo é calculado no shader a partir da posição.
// Em aparelhos fracos o ruído usa menos camadas (lowQuality).
import * as THREE from 'three';

const noise = (octaves) => `
varying vec3 vClay;
uniform float uBump;
float hsh(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float vn(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
  return mix(mix(mix(hsh(i),hsh(i+vec3(1,0,0)),f.x),mix(hsh(i+vec3(0,1,0)),hsh(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hsh(i+vec3(0,0,1)),hsh(i+vec3(1,0,1)),f.x),mix(hsh(i+vec3(0,1,1)),hsh(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fb(vec3 p){float s=0.,a=.5;for(int i=0;i<${octaves};i++){s+=a*vn(p);p=p*2.03+vec3(1.7,9.2,3.1);a*=.5;}return s;}
float clayH(vec3 p){
  float h=fb(p*38.)*.7+vn(p*190.)*.22+vn(p*420.)*.06;
  float marks=smoothstep(.5,.72,fb(p*4.+3.));
  h+=marks*.3*(sin(dot(p,vec3(.6,1.,.3))*140.+fb(p*14.)*7.)*.5+.5);
  return h;}
vec3 clayN(vec3 pos,vec3 n,float h){vec3 dx=dFdx(pos),dy=dFdy(pos);vec3 r1=cross(dy,n),r2=cross(n,dx);float det=dot(dx,r1);
  vec2 dh=vec2(dFdx(h),dFdy(h))*uBump;vec3 g=sign(det)*(dh.x*r1+dh.y*r2);return normalize(abs(det)*n-g);}
`;

export function createClayMaterial(color, { lowQuality = false } = {}) {
  const octaves = lowQuality ? 2 : 4;
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.86, metalness: 0, envMapIntensity: 0.45 });
  material.extensions = { derivatives: true };
  material.customProgramCacheKey = () => `clay-${octaves}`;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uBump = { value: 0.0028 };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vClay;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvClay=position;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${noise(octaves)}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float bl=fb(vClay*7.);float gr=vn(vClay*150.);
        vec3 tint=mix(vec3(.78,.72,.68),vec3(1.12,1.05,.97),bl);
        tint*=.93+.14*gr;
        tint*=1.-.3*smoothstep(.86,.95,vn(vClay*480.+11.));
        tint=mix(tint,vec3(1.28,1.2,1.1),.55*smoothstep(.9,.97,vn(vClay*300.+4.)));
        diffuseColor.rgb*=tint;`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor=clamp(roughnessFactor+.14*(fb(vClay*20.)-.5),.6,1.);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        normal=clayN(-vViewPosition,normal,clayH(vClay));`);
  };
  return material;
}
