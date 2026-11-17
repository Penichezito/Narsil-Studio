import { BlenderGridBackground } from '@/components/BlenderGridBackground';

export default function BlenderGridBackgroundPage() {
    return (
        <main className="relative min-h-screen w-full text-zinc-100">
            <BlenderGridBackground
                backgroundColor="#1d1d1f"
                majorLineColor="#56565c"
                minorLineColor="#333338"
                showAxes={true}
                cellSize={1}
                subdivisions={5}
                lineOpacity={0.85}
                fadeDistance={48}
                interactive={false}
                driftSpeed={0.35}
            />

            <section className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-24">
                <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
                    Your app Next.js over a spacial viewport
                </h1>
                <p className="mt-4 max-w-xl text-base text-zinc-400">
                    The infinite articulation plan remains sharp at any resolution, without relying on external images.
                </p>
            </section>
        </main>
    );
}