"use client";

import { useEffect, useState } from "react";
import WireframeScene, { type RenderMode } from "./WireframeScene";

export type TerminalLink = { command: string; href: string };

const BUILD_STEPS = [
  "[shader] compiling pbr_lit.frag ........ ok",
  "[shader] compiling toon_outline.vert ... ok",
  "[shader] variant permutations 128/128 .. ok",
  "[asset]  importing narsil_logo.fbx ..... ok",
  "[asset]  baking lightmaps (atlas 4k) ... ok",
  "[asset]  compressing textures -> ktx2 .. ok",
  "[asset]  generating LODs (0..3) ........ ok",
  "[tools]  packaging blender addons ...... ok",
  "[tools]  linking cpp toolchain ......... ok",
  "[core]   warming gRPC services ......... ok",
  "[core]   running migrations ............ ok",
  "[deploy] uploading build artifacts ..... ok",
  "[deploy] awaiting health checks ........ pending",
];

const MAX_LINES = 7;

type LogLine = { id: number; time: string; text: string };

export default function MaintenanceScreen({ links }: { links: TerminalLink[] }) {
  const [mode, setMode] = useState<RenderMode>("wireframe");
  const [speed, setSpeed] = useState(1);
  const [logs, setLogs] = useState<LogLine[]>([]);

  useEffect(() => {
    let i = 0;
    const id = window.setInterval(() => {
      const entry: LogLine = {
        id: i,
        time: new Date().toISOString().slice(11, 23),
        text: BUILD_STEPS[i % BUILD_STEPS.length],
      };
      i += 1;
      setLogs((prev) => [...prev, entry].slice(-MAX_LINES));
    }, 650);
    return () => window.clearInterval(id);
  }, []);

  const last = logs.at(-1);
  const progress = last ? ((last.id % BUILD_STEPS.length) + 1) / BUILD_STEPS.length : 0;

  return (
    <main className="relative flex min-h-screen items-center justify-center p-4 text-[13px] leading-relaxed">
      <WireframeScene mode={mode} speed={speed} />

      <section
        aria-label="Narsil Studio debug console"
        className="w-full max-w-xl border border-white/15 bg-black/60 shadow-[0_0_60px_-20px_#00f0ff55] backdrop-blur-md"
      >
        <header className="flex items-center justify-between border-b border-white/15 px-4 py-2 text-[11px] uppercase tracking-widest text-white/50">
          <span>narsil_studio :: debug_console</span>
          <span>v1.0.0-rc</span>
        </header>

        <div className="space-y-5 p-5">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-white">NARSIL STUDIO</h1>
            <p className="text-white/50">Tech Art · Graphics Programming · Game Dev</p>
          </div>

          {/* Status */}
          <div className="flex items-center gap-3 border border-amber/30 bg-amber/5 px-3 py-2">
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber opacity-75" />
              <span className="relative inline-flex size-2.5 rounded-full bg-amber" />
            </span>
            <span className="text-amber">
              SYSTEM_STATUS: <span className="font-semibold">DEPLOYING_NEW_BUILD</span>
            </span>
          </div>

          {/* Build log */}
          <div>
            <div className="mb-1 flex justify-between text-[11px] uppercase tracking-widest text-white/40">
              <span>build.log</span>
              <span className="tabular-nums">{Math.round(progress * 100).toString().padStart(3, "0")}%</span>
            </div>
            <div className="mb-2 h-px w-full bg-white/10">
              <div className="h-px bg-cyan transition-[width] duration-500" style={{ width: `${progress * 100}%` }} />
            </div>
            <ol className="h-[10rem] overflow-hidden border border-white/10 bg-black/50 px-3 py-2 text-[12px]">
              {logs.map((l) => (
                <li key={l.id} className="truncate text-white/70">
                  <span className="text-white/30">{l.time}</span>{" "}
                  <span className={l.text.endsWith("pending") ? "text-amber" : undefined}>{l.text}</span>
                </li>
              ))}
              <li aria-hidden className="animate-pulse text-cyan">
                ▌
              </li>
            </ol>
          </div>

          {/* Scene controls */}
          <fieldset className="space-y-3 border border-white/10 px-3 pb-3 pt-1">
            <legend className="px-1 text-[11px] uppercase tracking-widest text-white/40">scene.controls</legend>

            <div className="flex items-center justify-between gap-4">
              <span className="text-white/60">r_drawmode</span>
              <div className="flex border border-white/15" role="radiogroup" aria-label="Render mode">
                {(["wireframe", "points"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={mode === m}
                    onClick={() => setMode(m)}
                    className={`px-3 py-1 text-[12px] uppercase transition-colors ${
                      mode === m ? "bg-cyan text-black" : "text-white/60 hover:text-white"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center justify-between gap-4">
              <span className="text-white/60">r_rotspeed</span>
              <span className="flex flex-1 items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={4}
                  step={0.1}
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                  className="hud-range h-4 flex-1 cursor-pointer"
                />
                <span className="w-10 text-right tabular-nums text-cyan">{speed.toFixed(1)}x</span>
              </span>
            </label>
          </fieldset>

          {/* Links (only those configured via env) */}
          {links.length > 0 && (
            <nav aria-label="Social links" className="space-y-1">
              {links.map((l) => (
                <a
                  key={l.command}
                  href={l.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block text-white/60 transition-colors hover:text-cyan"
                >
                  <span className="text-cyan/60 group-hover:text-cyan">$</span> {l.command}
                  <span className="opacity-0 transition-opacity group-hover:opacity-100"> ↗</span>
                </a>
              ))}
            </nav>
          )}
        </div>
      </section>
    </main>
  );
}
