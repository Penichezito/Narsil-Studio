"use client";

import {useEffect, useRef} from "react";
import * as THREE from "three";

export type RenderMode = "wireframe" | "points";

type Props = {
  mode: RenderMode;
  /** Rotation speed multiplier (0 = frozen). */
  speed: number;
  /** Index into GEOMETRY_OPTIONS (defaults to 0). */
  geometryIndex?: number;
};

const CYAN = 0x00f0ff;
const MOBILE_BREAKPOINT = 768; // same value as `md:` on Tailwind

export const GEOMETRY_OPTIONS = [
  "Sphere",         // index 0
  "Torus Knot",     // index 1
  "Cube",           // index 2
  "Dodecahedron",   // index 3
  "Torus",          // index 4
  "Box",            // index 5
  "Extrude",        // index 6
  "Icosahedron",    // index 7
] as const;

export default function WireframeScene({mode, speed, geometryIndex = 0}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Live values read by the render loop, so changing controls never rebuilds the scene.
  const modeRef = useRef(mode);
  const speedRef = useRef(speed);
  const geometryIndexRef = useRef(geometryIndex);
  // Set by the scene effect; swaps the active geometry on the existing meshes.
  const applyGeometryRef = useRef<((index: number) => void) | null>(null);

  useEffect(() => {
    modeRef.current = mode;
    speedRef.current = speed;
  }, [mode, speed]);

  useEffect(() => {
    geometryIndexRef.current = geometryIndex;
    applyGeometryRef.current?.(geometryIndex);
  }, [geometryIndex]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true, powerPreference: "low-power"});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x080808, 4, 9);

    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 6);

    // 2D shape for ExtrudeGeometry (index 6)
    const extrudeShape = new THREE.Shape();
    const sides = 6;
    const radius = 1.1;
    for (let i = 0; i < sides; i++) {
      const angle = (i / sides) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) extrudeShape.moveTo(x, y);
      else extrudeShape.lineTo(x, y);
    }
    extrudeShape.closePath();

    const extrudeGeo = new THREE.ExtrudeGeometry(extrudeShape, {
      depth: 0.6,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 2,
      bevelSize: 0.15,
      bevelThickness: 0.15,
    });
    extrudeGeo.center(); // pivot in the middle so it rotates around its own axis

    // Order must match GEOMETRY_OPTIONS.
    const geometries: THREE.BufferGeometry[] = [
      new THREE.SphereGeometry(1.35, 32, 32),                 // 0: Sphere
      new THREE.TorusKnotGeometry(1.1, 0.35, 180, 24, 2, 3),  // 1: Torus Knot
      new THREE.BoxGeometry(1.8, 1.8, 1.8),                   // 2: Cube
      new THREE.DodecahedronGeometry(1.4, 0),                 // 3: Dodecahedron
      new THREE.TorusGeometry(1.1, 0.38, 20, 80),             // 4: Torus
      new THREE.BoxGeometry(2.2, 1.3, 1.1),                   // 5: Box (rectangular)
      extrudeGeo,                                             // 6: Extrude
      new THREE.IcosahedronGeometry(1.45, 1),                 // 7: Icosahedron
    ];

    const clampIndex = (i: number) => Math.min(Math.max(i, 0), geometries.length - 1);

    const wireMaterial = new THREE.MeshBasicMaterial({
      color: CYAN,
      wireframe: true,
      transparent: true,
      opacity: 0.22,
    });
    const pointsMaterial = new THREE.PointsMaterial({
      color: CYAN,
      size: 0.025,
      transparent: true,
      opacity: 0.75,
      sizeAttenuation: true,
    });

    const initial = geometries[clampIndex(geometryIndexRef.current)];
    const group = new THREE.Group();
    const wireMesh = new THREE.Mesh(initial, wireMaterial);
    const pointCloud = new THREE.Points(initial, pointsMaterial);
    group.add(wireMesh, pointCloud);
    scene.add(group);
    // Desktop: mesh to the right of the panel. Mobile: mesh centered below the panel.
    const layoutGroup = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT;
      if (mobile) {
        group.position.set(0, -2.3, 0);   // y negative = bottom part of the screen
        group.scale.setScalar(0.75);      // a bit smaller to fit the width
      } else {
        group.position.set(5.0, 0, 0);
        group.scale.setScalar(1);
      }
    };
    layoutGroup();

    // Exposed to the geometryIndex effect: swap geometry without rebuilding the scene.
    applyGeometryRef.current = (index: number) => {
      const geo = geometries[clampIndex(index)];
      wireMesh.geometry = geo;
      pointCloud.geometry = geo;
    };

    // Pointer in normalized [-1, 1]; the scene eases toward it every frame.
    const pointer = {x: 0, y: 0};
    const eased = {x: 0, y: 0};
    const onPointerMove = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    };

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      layoutGroup(); // repositions when rotating or resizing the phone
    };

    window.addEventListener("pointermove", onPointerMove, {passive: true});
    window.addEventListener("resize", onResize);

    const timer = new THREE.Timer();
    let spin = 0;
    let frame = 0;

    const tick = (time?: number) => {
      frame = requestAnimationFrame(tick);
      timer.update(time);
      const dt = Math.min(timer.getDelta(), 0.1);

      spin += dt * 0.25 * speedRef.current;

      const ease = 1 - Math.exp(-dt * 3); // frame-rate independent smoothing
      eased.x += (pointer.x - eased.x) * ease;
      eased.y += (pointer.y - eased.y) * ease;

      group.rotation.x = spin * 0.6 + eased.y * 0.5;
      group.rotation.y = spin + eased.x * 0.7;
      camera.position.x = eased.x * 2.2;
      camera.position.y = -eased.y * 0.25;
      camera.lookAt(group.position.x * 0.5, group.position.y * 0.5, 0);

      const points = modeRef.current === "points";
      wireMesh.visible = !points;
      pointCloud.visible = points;

      renderer.render(scene, camera);
    };
    tick();

    return () => {
      applyGeometryRef.current = null;
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("resize", onResize);
      timer.dispose();
      geometries.forEach((geo) => geo.dispose());
      wireMaterial.dispose();
      pointsMaterial.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={containerRef} aria-hidden className="pointer-events-none fixed inset-0 -z-10"/>;
}