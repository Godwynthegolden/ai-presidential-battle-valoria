import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function createSvgContent({
  width = 1920,
  height = 1080,
  variant = 'telemetry', // 'telemetry' | 'pure'
}: {
  width?: number;
  height?: number;
  variant?: 'telemetry' | 'pure';
}): string {
  const isTelemetry = variant === 'telemetry';
  const gridSpacing = 60;

  // Generate grid lines
  let gridLines = '';
  for (let x = 0; x <= width; x += gridSpacing) {
    gridLines += `<line x1="${x}" y1="0" x2="${x}" y2="${height}" stroke="rgba(255,255,255,0.022)" stroke-width="1" />\n`;
  }
  for (let y = 0; y <= height; y += gridSpacing) {
    gridLines += `<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="rgba(255,255,255,0.022)" stroke-width="1" />\n`;
  }

  // Crosshairs at every 4th intersection (240px)
  let crosshairs = '';
  const crossInterval = 240;
  const crossSize = 5;
  for (let x = crossInterval; x < width; x += crossInterval) {
    for (let y = crossInterval; y < height; y += crossInterval) {
      crosshairs += `
        <line x1="${x - crossSize}" y1="${y}" x2="${x + crossSize}" y2="${y}" stroke="rgba(6, 182, 212, 0.18)" stroke-width="1" />
        <line x1="${x}" y1="${y - crossSize}" x2="${x}" y2="${y + crossSize}" stroke="rgba(6, 182, 212, 0.18)" stroke-width="1" />
      `;
    }
  }

  // Corner brackets inset
  const inset = 48;
  const bracketLen = 20;

  const brackets = isTelemetry ? `
    <!-- Inset Frame Guide -->
    <rect x="${inset}" y="${inset}" width="${width - inset * 2}" height="${height - inset * 2}" fill="none" stroke="rgba(148, 163, 184, 0.05)" stroke-width="1" stroke-dasharray="4 8" />

    <!-- Top-Left Bracket -->
    <path d="M ${inset + bracketLen} ${inset} L ${inset} ${inset} L ${inset} ${inset + bracketLen}" fill="none" stroke="#06b6d4" stroke-width="1.5" stroke-linecap="square" opacity="0.6" />
    
    <!-- Top-Right Bracket -->
    <path d="M ${width - inset - bracketLen} ${inset} L ${width - inset} ${inset} L ${width - inset} ${inset + bracketLen}" fill="none" stroke="#06b6d4" stroke-width="1.5" stroke-linecap="square" opacity="0.6" />

    <!-- Bottom-Left Bracket -->
    <path d="M ${inset} ${height - inset - bracketLen} L ${inset} ${height - inset} L ${inset + bracketLen} ${height - inset}" fill="none" stroke="#06b6d4" stroke-width="1.5" stroke-linecap="square" opacity="0.6" />

    <!-- Bottom-Right Bracket -->
    <path d="M ${width - inset - bracketLen} ${height - inset} L ${width - inset} ${height - inset} L ${width - inset} ${height - inset - bracketLen}" fill="none" stroke="#06b6d4" stroke-width="1.5" stroke-linecap="square" opacity="0.6" />

    <!-- Telemetry Typography -->
    <g font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" font-size="10" font-weight="600" letter-spacing="0.25em">
      <!-- Top Left Label -->
      <text x="${inset + 30}" y="${inset + 14}" fill="#06b6d4" opacity="0.65">REPUBLIC OF VALORIA // MOTION BACKDROP</text>
      
      <!-- Top Right Status -->
      <text x="${width - inset - 30}" y="${inset + 14}" fill="#94a3b8" opacity="0.4" text-anchor="end">SYS: BROADCAST READY &bull; 60 FPS</text>
      
      <!-- Bottom Left Live Dot -->
      <circle cx="${inset + 32}" cy="${height - inset - 11}" r="3.5" fill="#ef4444" opacity="0.85" />
      <text x="${inset + 44}" y="${height - inset - 8}" fill="#94a3b8" opacity="0.45">FEED.ONLINE // ARENA VOID</text>

      <!-- Bottom Right Coordinates -->
      <text x="${width - inset - 30}" y="${height - inset - 8}" fill="#94a3b8" opacity="0.35" text-anchor="end">SEC: STAGE-ALPHA &bull; 1920&times;1080</text>
    </g>
  ` : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <!-- Background Base Gradient -->
    <radialGradient id="baseRadial" cx="50%" cy="50%" r="70%" fx="50%" fy="50%">
      <stop offset="0%" stop-color="#080c14" />
      <stop offset="60%" stop-color="#06080d" />
      <stop offset="100%" stop-color="#030408" />
    </radialGradient>

    <!-- Ambient Cyan Glow (Top-Left) -->
    <radialGradient id="cyanGlow" cx="20%" cy="20%" r="55%">
      <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.14" />
      <stop offset="40%" stop-color="#06b6d4" stop-opacity="0.05" />
      <stop offset="100%" stop-color="#06b6d4" stop-opacity="0" />
    </radialGradient>

    <!-- Ambient Violet/Indigo Glow (Bottom-Right) -->
    <radialGradient id="indigoGlow" cx="80%" cy="80%" r="60%">
      <stop offset="0%" stop-color="#6366f1" stop-opacity="0.10" />
      <stop offset="50%" stop-color="#8b5cf6" stop-opacity="0.03" />
      <stop offset="100%" stop-color="#6366f1" stop-opacity="0" />
    </radialGradient>

    <!-- Center Soft Spotlight Vignette -->
    <radialGradient id="centerVignette" cx="50%" cy="45%" r="65%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.02" />
      <stop offset="70%" stop-color="#000000" stop-opacity="0" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0.55" />
    </radialGradient>
  </defs>

  <!-- 1. Deep Void Base Background -->
  <rect width="${width}" height="${height}" fill="url(#baseRadial)" />

  <!-- 2. Ambient Color Light Cones -->
  <rect width="${width}" height="${height}" fill="url(#cyanGlow)" />
  <rect width="${width}" height="${height}" fill="url(#indigoGlow)" />

  <!-- 3. Minimalist Cyber Grid -->
  <g id="grid">
    ${gridLines}
  </g>

  <!-- 4. Intersection Crosshairs -->
  <g id="crosshairs">
    ${crosshairs}
  </g>

  <!-- 5. Vignette Overlay for Depth and Negative Space Focus -->
  <rect width="${width}" height="${height}" fill="url(#centerVignette)" />

  <!-- 6. Architectural Telemetry & Framing -->
  ${brackets}
</svg>`;
}

async function renderPngFromSvg(svgContent: string, outputPath: string, width = 1920, height = 1080) {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { width: ${width}px; height: ${height}px; background: #030408; overflow: hidden; }
          svg { width: 100%; height: 100%; display: block; }
        </style>
      </head>
      <body>
        ${svgContent}
      </body>
    </html>
  `;

  await page.setContent(html, { waitUntil: 'domcontentloaded' });
  await page.screenshot({
    path: outputPath,
    type: 'png',
    omitBackground: false,
  });

  await browser.close();
}

async function main() {
  const outDir = path.resolve('public', 'backgrounds');
  fs.mkdirSync(outDir, { recursive: true });

  const artifactDir = path.resolve('C:\\Users\\Erfan\\.gemini\\antigravity\\brain\\b1825964-6797-4537-b0ec-9620dedd43d7');

  console.log('1. Generating Coded Minimalist SVG (Telemetry variant)...');
  const svgTelemetry1080 = createSvgContent({ width: 1920, height: 1080, variant: 'telemetry' });
  fs.writeFileSync(path.join(outDir, 'valoria_minimal_telemetry.svg'), svgTelemetry1080, 'utf-8');

  console.log('2. Generating Coded Minimalist SVG (Pure void variant)...');
  const svgPure1080 = createSvgContent({ width: 1920, height: 1080, variant: 'pure' });
  fs.writeFileSync(path.join(outDir, 'valoria_minimal_pure.svg'), svgPure1080, 'utf-8');

  console.log('3. Rendering Pixel-Perfect 1080p PNGs with Chrome...');
  const pngTelemetryPath = path.join(outDir, 'valoria_minimal_telemetry.png');
  const pngPurePath = path.join(outDir, 'valoria_minimal_pure.png');

  await renderPngFromSvg(svgTelemetry1080, pngTelemetryPath, 1920, 1080);
  await renderPngFromSvg(svgPure1080, pngPurePath, 1920, 1080);

  // Also copy to valoria_motion_bg.png as main default
  fs.copyFileSync(pngTelemetryPath, path.join(outDir, 'valoria_motion_bg.png'));
  fs.copyFileSync(pngTelemetryPath, path.join(artifactDir, 'valoria_minimal_telemetry.png'));
  fs.copyFileSync(pngPurePath, path.join(artifactDir, 'valoria_minimal_pure.png'));

  console.log('4. Rendering 4K (3840x2160) PNG...');
  const svgTelemetry4k = createSvgContent({ width: 3840, height: 2160, variant: 'telemetry' });
  const pngTelemetry4kPath = path.join(outDir, 'valoria_minimal_telemetry_4k.png');
  await renderPngFromSvg(svgTelemetry4k, pngTelemetry4kPath, 3840, 2160);

  console.log('Done! All coded backgrounds successfully generated.');
}

main().catch(err => {
  console.error('Failed to generate backgrounds:', err);
  process.exit(1);
});
