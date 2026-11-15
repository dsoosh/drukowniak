// Wspólny podgląd 3D (three.js): oś z do góry, orbitowanie, siatki z manifold-3d, stół drukarki.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export function createViewer(host) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio));
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.5, 5000);
  camera.up.set(0, 0, 1);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(-200, -300, 500);
  scene.add(sun);
  const group = new THREE.Group();
  scene.add(group);

  const resize = () => {
    const w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w, h, false); // rozmiar płótna z CSS, inaczej rozpycha układ na telefonie
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(host);
  resize();
  renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });

  let lastKey = '';

  function meshOf(manifold, color, opts = {}) {
    const m = manifold.getMesh();
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(m.vertProperties, m.numProp));
    g.setIndex(new THREE.BufferAttribute(m.triVerts, 1));
    return new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.6, metalness: 0, ...opts }));
  }

  /**
   * items: [{ manifold, color, opts }]; frame: { key, dir:[x,y,z] } — kamera ustawia się od nowa tylko
   * przy zmianie klucza; bed: bok stołu (mm) albo 0.
   */
  function show(items, { key = 'default', dir = [-1.1, -1.4, 0.8], bed = 0 } = {}) {
    for (const c of [...group.children]) { c.geometry?.dispose(); c.material?.dispose?.(); group.remove(c); }
    const box = new THREE.Box3();
    for (const it of items) {
      const mesh = meshOf(it.manifold, it.color, it.opts);
      group.add(mesh);
      if (!it.ignoreBounds) box.expandByObject(mesh);
    }
    if (box.isEmpty()) return;
    if (bed) {
      const line = cssVar('--line');
      const grid = new THREE.GridHelper(bed, bed / 10, line, line);
      grid.rotation.x = Math.PI / 2;
      const c = box.getCenter(new THREE.Vector3());
      grid.position.set(c.x, c.y, box.min.z - 0.05);
      group.add(grid);
    }
    const c = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3()).length();
    controls.target.copy(c);
    if (key !== lastKey) {
      lastKey = key;
      camera.position.copy(c).add(new THREE.Vector3(...dir).normalize().multiplyScalar(size * 1.55 + 15));
    }
  }

  return { show };
}
