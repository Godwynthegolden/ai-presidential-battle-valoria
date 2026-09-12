'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { MotionGraphicsBackground } from '@/components/MotionGraphicsBackground';
import { 
  ArrowLeft, 
  Download, 
  Layers, 
  Eye, 
  Sliders, 
  Maximize2, 
  Sparkles, 
  Monitor, 
  Smartphone,
  Check
} from 'lucide-react';

export default function BackgroundPreviewPage() {
  const [variant, setVariant] = useState<'telemetry' | 'pure'>('telemetry');
  const [showGrid, setShowGrid] = useState(true);
  const [showCrosshairs, setShowCrosshairs] = useState(true);
  const [showGlows, setShowGlows] = useState(true);
  const [showVignette, setShowVignette] = useState(true);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [showSampleOverlay, setShowSampleOverlay] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopySvgLink = () => {
    navigator.clipboard.writeText('/backgrounds/valoria_minimal_telemetry.svg');
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden flex flex-col font-sans">
      {/* Top Floating Control Bar */}
      <header className="absolute top-4 left-6 right-6 z-50 flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-3 bg-[#0b0f19]/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-800 shadow-2xl">
          <Link 
            href="/" 
            className="flex items-center gap-2 text-slate-400 hover:text-white transition text-xs font-mono"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>BACK TO ARENA</span>
          </Link>
          <span className="text-slate-700">|</span>
          <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
            Valoria Minimalist Motion Canvas
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 bg-[#0b0f19]/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-800 shadow-2xl text-xs font-mono">
          <button
            onClick={() => setVariant(v => v === 'telemetry' ? 'pure' : 'telemetry')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              variant === 'telemetry' 
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{variant === 'telemetry' ? 'Telemetry Style' : 'Pure Void Style'}</span>
          </button>

          <button
            onClick={() => setShowSampleOverlay(s => !s)}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              showSampleOverlay 
                ? 'bg-slate-800 text-slate-200' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{showSampleOverlay ? 'Hide Sample HUD' : 'Show Sample HUD'}</span>
          </button>

          <a
            href={variant === 'telemetry' ? '/backgrounds/valoria_minimal_telemetry.png' : '/backgrounds/valoria_minimal_pure.png'}
            download
            className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-cyan-600/30"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download 1080p PNG</span>
          </a>

          <a
            href="/backgrounds/valoria_minimal_telemetry_4k.png"
            download
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download 4K PNG</span>
          </a>

          <a
            href={variant === 'telemetry' ? '/backgrounds/valoria_minimal_telemetry.svg' : '/backgrounds/valoria_minimal_pure.svg'}
            download
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Vector SVG</span>
          </a>
        </div>
      </header>

      {/* Main Canvas Frame */}
      <main className="flex-1 w-full h-full flex items-center justify-center">
        <div className="w-full h-full relative">
          <MotionGraphicsBackground
            variant={variant}
            showGrid={showGrid}
            showCrosshairs={showCrosshairs}
            showGlows={showGlows}
            showVignette={showVignette}
          >
            {/* Sample Motion Graphics Overlay preview */}
            {showSampleOverlay && (
              <div className="text-center max-w-2xl px-6 pointer-events-none animate-fadeIn">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/40 text-[11px] font-mono font-bold text-cyan-300 mb-4 tracking-widest uppercase shadow-lg shadow-cyan-950/50">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  Motion Graphics Canvas
                </div>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-black font-display tracking-tight text-white mb-3 drop-shadow-md">
                  REPUBLIC OF VALORIA
                </h2>
                <p className="text-slate-400 font-mono text-sm leading-relaxed max-w-xl mx-auto">
                  Minimalist high-contrast backdrop engineered with expansive negative space for video overlays, live candidate debate cuts, and motion typography.
                </p>

                {/* Sample Lower Third Mockup */}
                <div className="mt-8 mx-auto w-full max-w-md bg-[#0b0f19]/90 border border-slate-750/80 rounded-2xl p-4 flex items-center gap-4 shadow-2xl backdrop-blur-md">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center font-black text-white text-lg">
                    VR
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-mono font-bold text-cyan-400 tracking-wider uppercase">Stage Speaker Active</p>
                    <p className="text-sm font-bold text-white">Jackson &quot;Jax&quot; Alvarez &bull; Working Class Coalition</p>
                    <p className="text-[11px] text-slate-400 font-mono">Treasury: $120 &bull; Standing: #1 Chopping Block Safe</p>
                  </div>
                </div>
              </div>
            )}
          </MotionGraphicsBackground>
        </div>
      </main>

      {/* Floating Bottom Toolbar for fine-tuning */}
      <footer className="absolute bottom-4 left-6 z-50 flex items-center gap-2 bg-[#0b0f19]/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-800 text-[11px] font-mono text-slate-400">
        <span className="text-slate-500 font-bold uppercase">Toggles:</span>
        <button 
          onClick={() => setShowGrid(g => !g)} 
          className={`px-2 py-1 rounded transition ${showGrid ? 'text-cyan-300 font-bold' : 'text-slate-500'}`}
        >
          [Grid: {showGrid ? 'ON' : 'OFF'}]
        </button>
        <button 
          onClick={() => setShowCrosshairs(c => !c)} 
          className={`px-2 py-1 rounded transition ${showCrosshairs ? 'text-cyan-300 font-bold' : 'text-slate-500'}`}
        >
          [Crosshairs: {showCrosshairs ? 'ON' : 'OFF'}]
        </button>
        <button 
          onClick={() => setShowGlows(gl => !gl)} 
          className={`px-2 py-1 rounded transition ${showGlows ? 'text-cyan-300 font-bold' : 'text-slate-500'}`}
        >
          [Ambient Glow: {showGlows ? 'ON' : 'OFF'}]
        </button>
        <button 
          onClick={() => setShowVignette(v => !v)} 
          className={`px-2 py-1 rounded transition ${showVignette ? 'text-cyan-300 font-bold' : 'text-slate-500'}`}
        >
          [Vignette: {showVignette ? 'ON' : 'OFF'}]
        </button>
      </footer>
    </div>
  );
}
