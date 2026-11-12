"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export type RenderMode = "wireframe" | "points";

type Props = {
  mode: RenderMode;
  /** Rotation speed multiplier (0 = frozen). */
  speed: number;
};

const CYAN = 0x00f0ff;

export default function WireframeScene({ mode, speed }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Live values read by the render loop, so changing controls never rebuilds the scene.
  const modeRef = useRef(mode);
  const speedRef = useRef(speed);

  useEffect(() => {
    modeRef.current = mode;
    speedRef.current = speed;
  }, [mode, speed]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x080808, 4, 9);

    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 6);

    const geometry = new THREE.TorusKnotGeometry(1.4, 0.42, 220, 24, 2, 3);

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

    const group = new THREE.Group();
    const wireMesh = new THREE.Mesh(geometry, wireMaterial);
    const pointCloud = new THREE.Points(geometry, pointsMaterial);
    group.add(wireMesh, pointCloud);
    scene.add(group);

    // Pointer in normalized [-1, 1]; the scene eases toward it every frame.
    const pointer = { x: 0, y: 0 };
    const eased = { x: 0, y: 0 };
    const onPointerMove = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    };

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
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
      camera.position.x = eased.x * 0.4;
      camera.position.y = -eased.y * 0.25;
      camera.lookAt(0, 0, 0);

      const points = modeRef.current === "points";
      wireMesh.visible = !points;
      pointCloud.visible = points;

      renderer.render(scene, camera);
    };
    tick();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("resize", onResize);
      timer.dispose();
      geometry.dispose();
      wireMaterial.dispose();
      pointsMaterial.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={containerRef} aria-hidden className="pointer-events-none fixed inset-0 -z-10" />;
}
