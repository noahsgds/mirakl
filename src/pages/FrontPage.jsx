import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Shapes } from "lucide-react";
import { renderCanvas } from "@/components/ui/canvas";
import { Component as BackgroundSnippets } from "@/components/ui/background-snippets";
import {
  LiquidGlassButton,
  LiquidGlassFilter,
} from "@/components/ui/liquid-glass";

export function Hero() {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    renderCanvas();
  }, [reduceMotion]);

  return (
    <section id="home" className="relative min-h-[100dvh] w-full overflow-hidden">
      <LiquidGlassFilter />
      <BackgroundSnippets />
      <div className={`relative z-10 flex min-h-[100dvh] flex-col items-center justify-center px-4 py-6 text-center sm:px-6 md:px-8 ${reduceMotion ? "" : "animation-delay-8 animate-fadeIn"}`}>
        <img
          src="/images/logo-mirakl.png"
          alt="Mirakl"
          className="z-10 mb-3 h-auto w-[165px] sm:w-[210px] md:w-[285px] lg:w-[350px]"
        />

        <div className="z-10 mb-3 mt-1 sm:justify-center">
          <LiquidGlassButton
            href="/global"
            animated={false}
            className="rounded-full px-3 py-1.5 sm:px-4"
          >
            <div className="flex items-center gap-1 text-xs leading-5 text-primary/70">
              <Shapes className="h-4 w-4" />
              <span>Mirakl Sales Copilot.</span>
              <span className="ml-0.5 flex items-center font-semibold">
                See What&apos;s New
                <span aria-hidden="true">
                  <ArrowRight className="h-4 w-4" />
                </span>
              </span>
            </div>
          </LiquidGlassButton>
        </div>

        <div className="mb-3 mt-2">
          <div className="px-0 sm:px-1 md:px-2">
            <div
              className="relative mx-auto h-full w-full max-w-[72rem] overflow-hidden rounded-[24px] border border-white/50 p-4 sm:p-5 md:rounded-[28px] md:px-7 md:py-7"
              style={{
                boxShadow:
                  "0 12px 28px rgba(0, 0, 0, 0.12), 0 0 26px rgba(255, 255, 255, 0.18)",
              }}
            >
              <div
                className="absolute inset-0 z-0"
                style={{
                  backdropFilter: "blur(5px)",
                  filter: "url(#glass-distortion)",
                  background: "rgba(255, 255, 255, 0.28)",
                }}
              />
              <div
                className="absolute inset-0 z-[1] rounded-[30px]"
                style={{
                  boxShadow:
                    "inset 2px 2px 1px 0 rgba(255, 255, 255, 0.58), inset -1px -1px 1px 1px rgba(255, 255, 255, 0.5)",
                }}
              />
              <h1 className="relative z-[2] flex select-none flex-col px-2 py-1 text-center text-[clamp(1.45rem,4.2vw,3.7rem)] font-semibold leading-[0.98] tracking-tight [text-wrap:balance]">
                One cockpit to power Mirakl sales execution.
              </h1>
              <div className="relative z-[2] flex items-center justify-center gap-1">
                <span className="relative flex h-3 w-3 items-center justify-center">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
                </span>
                <p className="text-xs text-green-500">Live pipeline. Real-time signals.</p>
              </div>
            </div>
          </div>

          <p className="mt-4 text-[15px] md:text-base">
            Built for <span className="font-bold text-accent">Mirakl Sales teams</span> to move faster.
          </p>

          <p className="mx-auto mb-5 mt-2 max-w-3xl px-3 text-sm text-primary/60 md:text-sm">
            Prioritize the right accounts, launch smarter outreach, and track every opportunity from first touch to closed revenue in one unified workspace.
          </p>
          <div className="flex justify-center gap-3">
            <LiquidGlassButton>
              <Link to="/dashboard" className="text-base text-black sm:text-lg">
                Enter Sales Command Center
              </Link>
            </LiquidGlassButton>
          </div>

          <div className="mt-4 flex justify-center">
            <img
              src="/images/mirakl-nexus-orb.png"
              alt="Mirakl orb"
              className={`h-auto w-[108px] opacity-95 sm:w-[136px] md:w-[165px] ${reduceMotion ? "" : "animate-spin"}`}
              style={reduceMotion ? undefined : { animationDuration: "2.6s" }}
            />
          </div>
        </div>
      </div>
      <canvas className="pointer-events-none absolute inset-0 mx-auto" id="canvas"></canvas>
    </section>
  );
}

export default function FrontPage() {
  return <Hero />;
}
