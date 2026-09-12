'use client';

import React, { useState } from 'react';

export interface MotionGraphicsBackgroundProps {
  variant?: 'telemetry' | 'pure';
  showGrid?: boolean;
  showCrosshairs?: boolean;
  showGlows?: boolean;
  showVignette?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function MotionGraphicsBackground({
  variant = 'telemetry',
  showGrid = true,
  showCrosshairs = true,
  showGlows = true,
  showVignette = true,
  className = '',
  children,
}: MotionGraphicsBackgroundProps) {
  const isTelemetry = variant === 'telemetry';

  return (
    <div className={`relative w-full h-full min-h-screen bg-[#05070c] overflow-hidden select-none font-sans ${className}`}>
      {/* 1. Base Dark Void Ambient Gradients */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 50% 50%, #080c14 0%, #06080d 65%, #030408 100%)'
        }}
      />

      {/* 2. Soft Ambient Colored Light Cones */}
      {showGlows && (
        <>
          {/* Top-Left Ambient Cyan Bloom */}
          <div 
            className="absolute -top-32 -left-32 w-[650px] h-[650px] rounded-full pointer-events-none blur-[140px]"
            style={{ background: 'rgba(6, 182, 212, 0.08)' }}
          />
          {/* Bottom-Right Ambient Indigo/Violet Bloom */}
          <div 
            className="absolute -bottom-32 -right-32 w-[700px] h-[700px] rounded-full pointer-events-none blur-[160px]"
            style={{ background: 'rgba(99, 102, 241, 0.06)' }}
          />
        </>
      )}

      {/* 3. Minimalist Cyber Grid */}
      {showGrid && (
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255, 255, 255, 0.022) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255, 255, 255, 0.022) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />
      )}

      {/* 4. Intersection Crosshairs */}
      {showCrosshairs && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="crosshairPattern" width="240" height="240" patternUnits="userSpaceOnUse">
              <line x1="235" y1="240" x2="245" y2="240" stroke="rgba(6, 182, 212, 0.18)" strokeWidth="1" />
              <line x1="240" y1="235" x2="240" y2="245" stroke="rgba(6, 182, 212, 0.18)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#crosshairPattern)" />
        </svg>
      )}

      {/* 5. Central Negative Space Vignette */}
      {showVignette && (
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.01) 0%, transparent 60%, rgba(0, 0, 0, 0.55) 100%)'
          }}
        />
      )}

      {/* 6. Minimalist Telemetry & Inset Frame Brackets */}
      {isTelemetry && (
        <div className="absolute inset-8 sm:inset-12 pointer-events-none flex flex-col justify-between">
          {/* Top Telemetry Header */}
          <div className="flex items-center justify-between text-[10px] font-mono tracking-[0.25em] select-none">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 opacity-70" />
              <span className="text-cyan-400 font-semibold opacity-70">REPUBLIC OF VALORIA // MOTION BACKDROP</span>
            </div>
            <span className="text-slate-400 opacity-40 hidden sm:inline">SYS: BROADCAST READY &bull; 60 FPS</span>
          </div>

          {/* Corner Brackets */}
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-400/60" />
          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-400/60" />
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-400/60" />
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-400/60" />

          {/* Bottom Telemetry Footer */}
          <div className="flex items-center justify-between text-[9px] font-mono tracking-[0.2em] select-none text-slate-400/45">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse opacity-80" />
              <span>FEED.ONLINE // ARENA VOID</span>
            </div>
            <span className="hidden sm:inline">STAGE-ALPHA &bull; 1920&times;1080</span>
          </div>
        </div>
      )}

      {/* Content Slot (Render anything cleanly over the negative space) */}
      {children && (
        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
}
