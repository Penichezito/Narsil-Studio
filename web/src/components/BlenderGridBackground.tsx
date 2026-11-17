'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export interface BlenderGridBackgroundProps {
    backgroundColor?: string;
    majorLineColor?: string;
    minorLineColor?: string;
    axisXColor?: string;
    axisZColor?: string;
    showAxes?: boolean;
    cellSize?: number;
    subdivisions?: number;
    lineOpacity?: number;
    fadeDistance?: number;
    interactive?: boolean;
    driftSpeed?: number;
    className?: string;
}

const VERTEX_SHADER = `
  out vec3 vWorldPos;
  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const FRAGMENT_SHADER = `
  precision highp float;
  in vec3 vWorldPos;

  uniform vec3 uMajorColor;
  uniform vec3 uMinorColor;
  uniform vec3 uAxisXColor;
  uniform vec3 uAxisZColor;
  uniform float uShowAxes;
  uniform float uCellSize;
  uniform float uSubdivisions;
  uniform float uLineOpacity;
  uniform float uFadeDistance;
  uniform vec3 uCameraFocus;

  out vec4 fragColor;

  float pristineGrid(vec2 coord, float stepSize, float lineWidthPx) {
    vec2 scaled = coord / max(stepSize, 0.001);
    vec2 deriv = fwidth(scaled);
    vec2 safeDeriv = max(deriv, vec2(0.0001));
    vec2 gridDist = abs(fract(scaled - 0.5) - 0.5) / safeDeriv;
    float lineDist = min(gridDist.x, gridDist.y);
    float lineAlpha = 1.0 - min(lineDist / lineWidthPx, 1.0);
    float maxDeriv = max(deriv.x, deriv.y);
    float lodFade = 1.0 - smoothstep(0.32, 0.85, maxDeriv);
    return lineAlpha * lodFade;
  }

  void main() {
    float minorStep = uCellSize / max(uSubdivisions, 1.0);
    float minorAlpha = pristineGrid(vWorldPos.xz, minorStep, 1.05);
    float majorAlpha = pristineGrid(vWorldPos.xz, uCellSize, 1.25);

    float distToFocus = length(vWorldPos.xz - uCameraFocus.xz);
    float radialFade = 1.0 - smoothstep(uFadeDistance * 0.28, uFadeDistance, distToFocus);

    vec3 viewVec = normalize(cameraPosition - vWorldPos);
    float grazingFade = smoothstep(0.015, 0.11, abs(viewVec.y));

    vec3 color = mix(
      uMinorColor,
      uMajorColor,
      clamp(majorAlpha / max(minorAlpha + majorAlpha, 0.0001), 0.0, 1.0)
    );
    float gridMask = max(minorAlpha * 0.55, majorAlpha);

    if (uShowAxes > 0.5) {
      float dx = max(fwidth(vWorldPos.x), 0.0001);
      float dz = max(fwidth(vWorldPos.z), 0.0001);
      float axisXMask = 1.0 - min(abs(vWorldPos.z) / (dz * 1.55), 1.0);
      float axisZMask = 1.0 - min(abs(vWorldPos.x) / (dx * 1.55), 1.0);
      color = mix(color, uAxisXColor, axisXMask);
      color = mix(color, uAxisZColor, axisZMask);
      gridMask = max(gridMask, max(axisXMask, axisZMask) * 0.98);
    }

    float finalAlpha = gridMask * radialFade * grazingFade * uLineOpacity;
    if (finalAlpha < 0.004) discard;
    fragColor = vec4(color, finalAlpha);
  }
`;

export function BlenderGridBackground({
    backgroundColor = '#1d1d1f',
    majorLineColor = '#56565c',
    minorLineColor = '#333338',
    axisXColor = '#9e4147',
    axisZColor = '#4c8246',
    showAxes = true,
    cellSize = 1,
    subdivisions = 5,
    lineOpacity = 0.85,
    fadeDistance = 48,
    interactive = false,
    driftSpeed = 0.35,
    className = 'fixed inset-0 -z-10',
    }: BlenderGridBackgroundProps) {
const containerRef = useRef<HTMLDivElement | null>(null);

useEffect(() => {
    const mount = containerRef.current;
    if (!mount) return;

    const width = mount.clientWidth || window.innerWidth;
    const height = mount.clientHeight || window.innerHeight;

    const renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const bgColor = new THREE.Color(backgroundColor);
    scene.background = bgColor;
    scene.fog = new THREE.FogExp2(bgColor.getHex(), 0.014);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 400);
    camera.position.set(6.8, 4.2, 8.4);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enabled = interactive;
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI * 0.485;
    controls.target.set(0, 0.35, 0);
    controls.update();

    const gridGeo = new THREE.PlaneGeometry(600, 600);
    gridGeo.rotateX(-Math.PI / 2);

    const gridMat = new THREE.ShaderMaterial({
        glslVersion: THREE.GLSL3,
        vertexShader: VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        uniforms: {
            uMajorColor: { value: new THREE.Color(majorLineColor) },
            uMinorColor: { value: new THREE.Color(minorLineColor) },
            uAxisXColor: { value: new THREE.Color(axisXColor) },
            uAxisZColor: { value: new THREE.Color(axisZColor) },
            uShowAxes: { value: showAxes ? 1.0 : 0.0 },
            uCellSize: { value: cellSize },
            uSubdivisions: { value: subdivisions },
            uLineOpacity: { value: lineOpacity },
            uFadeDistance: { value: fadeDistance },
            uCameraFocus: { value: new THREE.Vector3().copy(controls.target) },
        },
    });

    const gridMesh = new THREE.Mesh(gridGeo, gridMat);
    gridMesh.frustumCulled = false;
    scene.add(gridMesh);

    const prefersReducedMotion =
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const clock = new THREE.Clock();
    const scratchTarget = new THREE.Vector3();
    let driftAngle = Math.atan2(camera.position.x, camera.position.z);
    let frameId = 0;

    const tick = () => {
        const dt = Math.min(clock.getDelta(), 0.1);
        if (!interactive && driftSpeed > 0 && !prefersReducedMotion) {
            const radius = Math.hypot(camera.position.x, camera.position.z);
            driftAngle += dt * driftSpeed * 0.22;
            scratchTarget.set(
                Math.sin(driftAngle) * radius,
                camera.position.y,
                Math.cos(driftAngle) * radius
            );
            camera.position.lerp(scratchTarget, 1 - Math.exp(-3.2 * dt));
        }

        controls.update();
        gridMat.uniforms.uCameraFocus.value.copy(controls.target);
        renderer.render(scene, camera);
        frameId = requestAnimationFrame(tick);
    };

    tick();

        const onResize = () => {
            const w = mount.clientWidth || window.innerWidth;
            const h = mount.clientHeight || window.innerHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        };
        window.addEventListener('resize', onResize);

        return () => {
            cancelAnimationFrame(frameId);
            window.removeEventListener('resize', onResize);
            controls.dispose();
            gridGeo.dispose();
            gridMat.dispose();
            renderer.dispose();
            if (renderer.domElement.parentNode === mount) {
                mount.removeChild(renderer.domElement);
            }
        };
    }, [
        backgroundColor,
        majorLineColor,
        minorLineColor,
        axisXColor,
        axisZColor,
        showAxes,
        cellSize,
        subdivisions,
        lineOpacity,
        fadeDistance,
        interactive,
        driftSpeed,
    ]);

    return (
        <div
            ref={containerRef}
            aria-hidden="true"
            className={`pointer-events-auto overflow-hidden ${className}`}
            style={{ backgroundColor }}
        />
    );
}