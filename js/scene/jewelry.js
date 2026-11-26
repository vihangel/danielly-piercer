// Joias geradas a partir dos pontos de piercing (data/pontos.json).
// A escultura não tem joias no arquivo; cada ponto vira um grupo de malhas aqui.
import * as THREE from 'three';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);

/** Direção "para baixo" ao longo da pele num ponto com normal n. */
function downAlong(n) {
  const d = V(0, -1, 0).addScaledVector(n, n.y);
  if (d.lengthSq() < 1e-5) d.set(1, 0, 0).addScaledVector(n, -n.x);
  return d.normalize();
}

/** Direção em que a argola atravessa o tecido: orelha de lado, septo de lado, rosto e corpo de frente. */
function piercingAxis(point) {
  if (point.region === 'orelha') return V(-1, 0, 0);
  if (point.id === 'septo') return V(1, 0, 0);
  return V(0, 0, 1);
}

function buildJewel(point, materials) {
  const group = new THREE.Group();
  const material = materials[point.metal] || materials.ouro;
  const size = point.size || 1;
  const spots = point.positions.map((a) => ({ p: V(a[0], a[1], a[2]), n: V(a[3], a[4], a[5]).normalize() }));
  let anchor = null;

  const add = (geometry, position, quaternion, mat = material) => {
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.position.copy(position);
    if (quaternion) mesh.quaternion.copy(quaternion);
    group.add(mesh);
    return mesh;
  };
  const ball = (r, at, n, offset = r * 0.3) => add(new THREE.SphereGeometry(r, 18, 12), at.clone().addScaledVector(n, offset));

  // a argola passa pelo tecido na direção T e abraça a borda e, levemente inclinada para aparecer
  const axis = piercingAxis(point);
  const ring = (R, tube, at, n) => {
    let edge = n.clone().addScaledVector(axis, -n.dot(axis));
    if (edge.lengthSq() < 0.06) edge = V(0, 1, 0).addScaledVector(axis, -axis.y);
    edge.normalize();
    const side = V(0, 0, 0).crossVectors(axis, edge).normalize();
    const through = axis.clone().multiplyScalar(Math.cos(0.6)).addScaledVector(side, Math.sin(0.6)).normalize();
    const normal = V(0, 0, 0).crossVectors(edge, through).normalize();
    const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(edge, through, normal));
    return add(new THREE.TorusGeometry(R, tube, 12, 48), at.clone().addScaledVector(edge, -R * 0.72), q);
  };

  if (!spots.length) return { group, anchor };

  if (point.jewel === 'barra' && spots.length >= 2) {
    const a = spots[0].p.clone().addScaledVector(spots[0].n, 0.0009);
    const b = spots[1].p.clone().addScaledVector(spots[1].n, 0.0009);
    const bar = add(
      new THREE.CylinderGeometry(0.0008 * size, 0.0008 * size, a.distanceTo(b), 10),
      a.clone().add(b).multiplyScalar(0.5),
      new THREE.Quaternion().setFromUnitVectors(UP, b.clone().sub(a).normalize()),
    );
    ball(0.002 * size, a, spots[0].n, 0);
    ball(0.002 * size, b, spots[1].n, 0);
    anchor = new THREE.Object3D();
    anchor.position.copy(bar.position);
    anchor.userData.normal = spots[0].n.clone().add(spots[1].n).normalize();
    group.add(anchor);
    return { group, anchor };
  }

  if (point.jewel === 'umbigo') {
    const top = spots[0];
    anchor = ring(0.008 * size, 0.0012 * size, top.p, top.n);
    add(new THREE.SphereGeometry(0.0042 * size, 18, 12), top.p.clone().addScaledVector(downAlong(top.n), 0.016 * size).addScaledVector(top.n, 0.002), null, materials.prata);
    if (spots[1]) ball(0.004 * size, spots[1].p, spots[1].n);
  } else {
    spots.forEach((spot, i) => {
      let mesh;
      if (point.jewel === 'argola') {
        mesh = ring(0.0062 * size, 0.00095 * size, spot.p, spot.n);
      } else if (point.jewel === 'fangs' && i % 2 === 1) {
        // angel fangs: a segunda posição de cada par é a ponta cônica junto à boca
        const d = downAlong(spot.n).addScaledVector(spot.n, 0.45).normalize();
        mesh = add(
          new THREE.ConeGeometry(0.0019 * size, 0.005 * size, 18),
          spot.p.clone().addScaledVector(spot.n, 0.0014 * size).addScaledVector(d, 0.0018 * size),
          new THREE.Quaternion().setFromUnitVectors(UP, d),
        );
      } else if (point.jewel === 'micro') {
        add(new THREE.CylinderGeometry(0.003 * size, 0.003 * size, 0.0006, 20), spot.p.clone().addScaledVector(spot.n, 0.0001), new THREE.Quaternion().setFromUnitVectors(UP, spot.n));
        mesh = ball(0.002 * size, spot.p, spot.n, 0.0012);
      } else {
        mesh = ball(0.0025 * size, spot.p, spot.n);
      }
      if (i === 0) anchor = mesh;
    });
  }
  if (anchor) anchor.userData.normal = spots[0].n;
  return { group, anchor };
}

/** Cria o grupo das joias dentro do modelo e devolve rebuild(points) → [{ point, anchor }]. */
export function createJewelry(model, materials) {
  const group = new THREE.Group();
  model.add(group);

  function rebuild(points) {
    group.traverse((o) => o.geometry?.dispose());
    group.clear();
    return points.map((point) => {
      const jewel = buildJewel(point, materials);
      jewel.group.userData.pointId = point.id;
      group.add(jewel.group);
      return { point, anchor: jewel.anchor };
    });
  }

  return { group, rebuild };
}
