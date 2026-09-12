import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn, execSync } from 'child_process';
import puppeteer, { Browser, Page } from 'puppeteer-core';
import { sessionStorageService } from '../src/services/sessionStorage';

interface CliOptions {
  session: string;
  resolution: '1080p' | '4k' | 'shorts';
  codec: 'prores' | 'mp4';
  fps: number;
  mode: 'stepped' | 'screencast';
  maxEvents?: number;
  port: number;
  output?: string;
}

// Parse Command Line Arguments
function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {
    session: 'voiceT1',
    resolution: '1080p',
    codec: 'prores',
    fps: 60,
    mode: 'stepped',
    port: 3000,
  };

  for (const arg of args) {
    if (arg.startsWith('--session=')) options.session = arg.split('=')[1];
    else if (arg.startsWith('--res=') || arg.startsWith('--resolution=')) {
      const val = arg.split('=')[1] as any;
      if (['1080p', '4k', 'shorts'].includes(val)) options.resolution = val;
    }
    else if (arg.startsWith('--codec=')) {
      const val = arg.split('=')[1] as any;
      if (['prores', 'mp4'].includes(val)) options.codec = val;
    }
    else if (arg.startsWith('--fps=')) options.fps = parseInt(arg.split('=')[1], 10) || 60;
    else if (arg.startsWith('--mode=')) {
      const val = arg.split('=')[1] as any;
      if (['stepped', 'screencast'].includes(val)) options.mode = val;
    }
    else if (arg.startsWith('--port=')) options.port = parseInt(arg.split('=')[1], 10) || 3000;
    else if (arg.startsWith('--maxEvents=')) options.maxEvents = parseInt(arg.split('=')[1], 10);
    else if (arg.startsWith('--out=')) options.output = arg.split('=')[1];
  }

  return options;
}

// Locate System Chrome or Edge executable
function findBrowserExecutable(): string {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }

  throw new Error('No Chromium-based browser (Chrome or Edge) found on system.');
}

// Format seconds into SMPTE timecode (HH:MM:SS:FF) for Premiere Pro
function formatTimecode(seconds: number, fps: number): string {
  const totalFrames = Math.round(seconds * fps);
  const frames = totalFrames % fps;
  const totalSeconds = Math.floor(seconds);
  const s = totalSeconds % 60;
  const m = Math.floor(totalSeconds / 60) % 60;
  const h = Math.floor(totalSeconds / 3600);

  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}:${pad(frames)}`;
}

// Get Audio File Duration via ffprobe
function getAudioDuration(filePath: string): number {
  try {
    const cmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`;
    const out = execSync(cmd).toString().trim();
    const duration = parseFloat(out);
    return isNaN(duration) ? 0 : duration;
  } catch (err) {
    return 0;
  }
}

// Probe if a port has an active, healthy Next.js server that can serve /render
async function isServerHealthy(port: number, session: string): Promise<boolean> {
  const checkUrl = `http://localhost:${port}/render?session=${encodeURIComponent(session)}`;
  try {
    const res = await fetch(checkUrl, { signal: AbortSignal.timeout(2500) });
    if (res.ok) {
      const text = await res.text();
      // Verify that it is actually serving the HTML stage rather than an empty 400 error page
      if (text.includes('Master Stage') || text.includes('Valoria') || text.includes('__next') || text.includes('Initializing')) {
        return true;
      }
    }
  } catch {}
  return false;
}

// Ensure local Next.js server is responding, auto-discover active ports, or start server
async function ensureServerRunning(requestedPort: number, session: string): Promise<{ activePort: number; cleanup: (() => void) | null }> {
  // 1. Check requested port
  if (await isServerHealthy(requestedPort, session)) {
    console.log(`✓ Local server healthy on port ${requestedPort}`);
    return { activePort: requestedPort, cleanup: null };
  }

  // 2. Auto-discovery: probe candidate ports (3001, 3000, 3002) to find active healthy instance
  const candidates = [3000, 3001, 3002].filter(p => p !== requestedPort);
  for (const port of candidates) {
    if (await isServerHealthy(port, session)) {
      console.log(`ℹ️ Discovered active, healthy Next.js server running on port ${port} (auto-switched from ${requestedPort})`);
      return { activePort: port, cleanup: null };
    }
  }

  // 3. Neither port is running or healthy -> Spawn server on requestedPort
  console.log(`No healthy server found. Starting local Next.js server on port ${requestedPort}...`);
  const isProd = fs.existsSync(path.join(process.cwd(), '.next', 'server'));
  const cmd = isProd ? ['next', 'start', '-p', String(requestedPort)] : ['next', 'dev', '-p', String(requestedPort)];

  const server = spawn('npx', cmd, {
    shell: true,
    stdio: 'ignore',
  });

  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 1000));
    if (await isServerHealthy(requestedPort, session)) {
      console.log(`✓ Local server ready on port ${requestedPort}`);
      return {
        activePort: requestedPort,
        cleanup: () => {
          try {
            if (process.platform === 'win32' && server.pid) {
              execSync(`taskkill /pid ${server.pid} /f /t`);
            } else {
              server.kill();
            }
          } catch {}
        },
      };
    }
  }

  throw new Error(`Failed to connect to healthy local Next.js server on port ${requestedPort} after 30 seconds.`);
}

async function runRender() {
  const opts = parseArgs();
  console.log('\n========================================================');
  console.log('🏛️  VALORIA MASTER VIDEO RENDER ENGINE');
  console.log('========================================================');
  console.log(`Session:     ${opts.session}`);
  console.log(`Resolution:  ${opts.resolution}`);
  console.log(`Codec:       ${opts.codec === 'prores' ? 'Apple ProRes 422 HQ (.mov)' : 'Lossless H.264 (.mp4)'}`);
  console.log(`Frame Rate:  ${opts.fps} fps Constant Frame Rate (CFR)`);
  console.log(`Destination: Adobe Premiere Pro Ready`);
  console.log('========================================================\n');

  const browserPath = findBrowserExecutable();
  console.log(`✓ Browser Engine: ${browserPath}`);

  // Setup paths
  const baseDir = path.join(process.cwd(), 'saved-games', opts.session);
  if (!fs.existsSync(baseDir)) {
    throw new Error(`Saved game session "${opts.session}" does not exist at ${baseDir}`);
  }

  const exportDir = path.join(baseDir, 'exports');
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  const ext = opts.codec === 'prores' ? 'mov' : 'mp4';
  const outFileName = opts.output || `master_${opts.session}_${opts.resolution}_${opts.fps}fps.${ext}`;
  const finalVideoPath = path.isAbsolute(outFileName) ? outFileName : path.join(exportDir, outFileName);
  const markersCsvPath = path.join(exportDir, `${opts.session}_premiere_markers.csv`);

  // Resolution dimensions
  let width = 1920;
  let height = 1080;
  let deviceScaleFactor = 1;

  if (opts.resolution === '4k') {
    width = 1920;
    height = 1080;
    deviceScaleFactor = 2; // 3840x2160 crisp supersampling
  } else if (opts.resolution === 'shorts') {
    width = 1080;
    height = 1920;
    deviceScaleFactor = 1;
  }

  const outWidth = width * deviceScaleFactor;
  const outHeight = height * deviceScaleFactor;
  console.log(`✓ Render Dimensions: ${outWidth} x ${outHeight}`);

  // Load Session Events & Audio to pre-calculate Timeline & Markers
  console.log(`Loading session "${opts.session}" via SessionStorageService...`);
  const sessionData = await sessionStorageService.loadSession(opts.session);
  if (!sessionData.success || !sessionData.events || sessionData.events.length === 0) {
    throw new Error(`Failed to load session events for "${opts.session}": ${sessionData.error || 'No events found.'}`);
  }

  let events: any[] = sessionData.events;
  let audioIndex: any[] = sessionData.audioIndex || [];

  const audioDir = path.join(baseDir, 'audio');
  const availableAudio = fs.existsSync(audioDir) ? fs.readdirSync(audioDir).filter(f => f.endsWith('.mp3')) : [];

  if (opts.maxEvents && opts.maxEvents > 0) {
    events = events.slice(0, opts.maxEvents);
    console.log(`ℹ️ Limiting render to first ${opts.maxEvents} events`);
  }

  console.log(`✓ Total Chronological Events: ${events.length}`);

  // Calculate Speech Timelines and Audio Cues
  console.log('Calculating speech timecodes and Premiere Pro markers...');
  const markers: Array<{
    name: string;
    desc: string;
    inSec: number;
    outSec: number;
    audioFile?: string;
  }> = [];

  const timelineBlocks: Array<{
    index: number;
    startSec: number;
    endSec: number;
    duration: number;
    pauseAfter: number;
    speakerId?: string;
    audioFile?: string;
  }> = [];

  let currentTime = 0.5; // 0.5s introductory black padding
  const audioInputs: string[] = [];
  const audioFilterComplex: string[] = [];

  events.forEach((evt, idx) => {
    // 1. Precise Phase & Round Audio Stem Match
    let matchedFilename: string | undefined;

    if (evt.type === 'campaign_speech') {
      matchedFilename = availableAudio.find(f => 
        f.startsWith('01_campaign_') && 
        (f.includes(evt.speakerId) || evt.speakerId.includes(f.split('_').pop()?.replace('.mp3', '') || ''))
      );
    } else if (evt.type === 'attack') {
      matchedFilename = availableAudio.find(f => 
        f.includes(`round${evt.round || 1}_attack_`) && 
        f.includes(evt.speakerId) && 
        (!evt.targetId || f.includes(evt.targetId))
      ) || availableAudio.find(f => f.includes(`round${evt.round || 1}_attack_`) && f.includes(evt.speakerId));
    } else if (evt.type === 'cctv_pact') {
      matchedFilename = availableAudio.find(f => 
        f.includes(`round${evt.round || 1}_cctv_`) && 
        f.includes(evt.speakerId) && 
        (!evt.targetId || f.includes(evt.targetId))
      ) || availableAudio.find(f => f.includes(`round${evt.round || 1}_cctv_`) && f.includes(evt.speakerId));
    } else if (evt.type === 'elimination') {
      matchedFilename = availableAudio.find(f => f.includes('elimination_') && f.includes(evt.speakerId));
    } else if (evt.type === 'final_speech') {
      matchedFilename = availableAudio.find(f => f.includes('final_speech') && f.includes(evt.speakerId));
    } else if (evt.type === 'winner') {
      matchedFilename = availableAudio.find(f => (f.includes('inauguration') || f.includes('winner')) && f.includes(evt.speakerId));
    }

    // Fallback: Check audioIndex
    if (!matchedFilename) {
      const entry = audioIndex.find(a => 
        a.speakerId === evt.speakerId && 
        (a.round === evt.round || !a.round)
      );
      if (entry) matchedFilename = entry.filename;
    }

    let duration = 4.0; // default for silent events
    let fullAudioPath: string | null = null;

    if (matchedFilename) {
      fullAudioPath = path.join(baseDir, 'audio', matchedFilename);
      if (fs.existsSync(fullAudioPath)) {
        const audioDur = getAudioDuration(fullAudioPath);
        if (audioDur > 0) duration = audioDur;
      }
    } else if (evt.type === 'vote_tally') {
      duration = 5.0; // 5 seconds for ballot reveal board
    } else if (evt.type === 'cctv_pact') {
      duration = 4.5;
    }

    const startSec = currentTime;
    const endSec = currentTime + duration;

    // Track audio for FFmpeg audio mix
    if (fullAudioPath && fs.existsSync(fullAudioPath)) {
      const inputIdx = audioInputs.length + 1; // 0 is video pipe
      audioInputs.push(fullAudioPath);
      const delayMs = Math.round(startSec * 1000);
      audioFilterComplex.push(`[${inputIdx}:a]adelay=${delayMs}|${delayMs}[a${inputIdx}]`);
    }

    markers.push({
      name: `R${evt.round || 1}: ${evt.speakerName || 'Valoria'} (${evt.type.replace('_', ' ')})`,
      desc: evt.content ? evt.content.slice(0, 80) : (evt.headline || ''),
      inSec: startSec,
      outSec: endSec,
      audioFile: matchedFilename,
    });

    timelineBlocks.push({
      index: idx,
      startSec,
      endSec,
      duration,
      pauseAfter: 1.2,
      speakerId: evt.speakerId,
      audioFile: matchedFilename,
    });

    currentTime = endSec + 1.2; // 1.2s pause between speeches
  });

  const totalEstimatedDuration = currentTime + 1.0;
  console.log(`✓ Total Estimated Video Duration: ${totalEstimatedDuration.toFixed(1)}s`);

  // Write Premiere Pro Marker CSV
  const csvLines = [
    'Marker Name,Description,In,Out,Duration,Marker Type',
    ...markers.map(m => {
      const inTc = formatTimecode(m.inSec, opts.fps);
      const outTc = formatTimecode(m.outSec, opts.fps);
      const durTc = formatTimecode(m.outSec - m.inSec, opts.fps);
      const cleanDesc = (m.desc || '').replace(/"/g, '""');
      return `"${m.name}","${cleanDesc}",${inTc},${outTc},${durTc},Comment`;
    }),
  ];
  fs.writeFileSync(markersCsvPath, csvLines.join('\n'), 'utf8');
  console.log(`✓ Adobe Premiere Pro Markers CSV written to: ${markersCsvPath}`);

  // Build FFmpeg Spawn Arguments
  console.log('Spawning FFmpeg master compositor...');
  const ffmpegArgs: string[] = [
    '-y',
    '-f', 'image2pipe',
    '-vcodec', 'png',
    '-framerate', String(opts.fps),
    '-i', '-', // video stream from stdin pipe
  ];

  // Add all audio files as separate inputs
  for (const audioFile of audioInputs) {
    ffmpegArgs.push('-i', audioFile);
  }

  // Audio filter graph
  if (audioInputs.length > 0) {
    const filterStr = audioFilterComplex.join(';') + ';' + 
      audioInputs.map((_, i) => `[a${i + 1}]`).join('') + 
      `amix=inputs=${audioInputs.length}:normalize=0:dropout_transition=0[aout]`;
    ffmpegArgs.push('-filter_complex', filterStr);
    ffmpegArgs.push('-map', '0:v');
    ffmpegArgs.push('-map', '[aout]');
  } else {
    ffmpegArgs.push('-map', '0:v');
  }

  // Encoding codecs
  if (opts.codec === 'prores') {
    ffmpegArgs.push(
      '-c:v', 'prores_ks',
      '-profile:v', '3', // ProRes 422 HQ
      '-vendor', 'apl0',
      '-pix_fmt', 'yuv422p10le',
      '-c:a', 'pcm_s24le',
      '-ar', '48000'
    );
  } else {
    // Lossless / Near-Lossless H.264
    ffmpegArgs.push(
      '-c:v', 'libx264',
      '-preset', 'slow',
      '-crf', '12',
      '-pix_fmt', 'yuv420p',
      '-r', String(opts.fps),
      '-c:a', 'aac',
      '-b:a', '320k',
      '-ar', '48000'
    );
  }

  ffmpegArgs.push(finalVideoPath);

  const ffmpegProcess = spawn('ffmpeg', ffmpegArgs, {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  let ffmpegStderrLogs: string[] = [];
  ffmpegProcess.stderr.on('data', (data) => {
    ffmpegStderrLogs.push(data.toString());
    if (ffmpegStderrLogs.length > 50) ffmpegStderrLogs.shift();
  });

  let ffmpegError: string | null = null;
  ffmpegProcess.on('error', (err) => {
    ffmpegError = err.message;
    console.error('[FFmpeg Process Error]:', err);
  });

  // Ensure Next.js server is active and obtain verified healthy port
  const { activePort, cleanup: serverCleanup } = await ensureServerRunning(opts.port, opts.session);
  opts.port = activePort;

  // Setup isolated temporary Chrome profile
  const tempProfile = path.join(os.tmpdir(), `valoria-render-chrome-${Date.now()}`);
  fs.mkdirSync(tempProfile, { recursive: true });

  // Launch Headless Chromium
  console.log('Launching Headless Chromium capture instance...');
  const browser: Browser = await puppeteer.launch({
    executablePath: browserPath,
    headless: true,
    userDataDir: tempProfile,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--remote-debugging-port=0',
      '--disable-gpu-sandbox',
      '--autoplay-policy=no-user-gesture-required',
      '--disable-infobars',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--enable-gpu',
      '--use-gl=angle',
      '--font-render-hinting=max',
      `--window-size=${width},${height}`,
    ],
    defaultViewport: {
      width,
      height,
      deviceScaleFactor,
    },
  });

  const page: Page = await browser.newPage();
  page.on('console', msg => {
    const text = msg.text();
    if (!text.includes('Download the React DevTools')) {
      console.log(`[Browser ${msg.type()}] ${text}`);
    }
  });

  let staticChunkErrors = 0;
  let chunkErrorMessage = '';

  page.on('response', res => {
    const url = res.url();
    if (res.status() >= 400) {
      console.log(`[Browser HTTP ${res.status()}] ${url}`);
      if (url.includes('/_next/static/')) {
        staticChunkErrors++;
        if (staticChunkErrors >= 3 && !chunkErrorMessage) {
          chunkErrorMessage = `Critical static chunk failure (${res.status()} on ${url}). This indicates a build mismatch or stale Next.js server process.`;
        }
      }
    }
  });

  const autoPlay = opts.mode === 'screencast';
  const renderUrl = `http://localhost:${opts.port}/render?session=${encodeURIComponent(opts.session)}&res=${opts.resolution}&headless=true&autoPlay=${autoPlay}`;

  console.log(`Navigating to Replay Stage: ${renderUrl}`);
  await page.goto(renderUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

  // Wait for page to signal ready (45s timeout for compilation with fast asset failure diagnostics)
  try {
    await page.waitForFunction(() => (window as any).__RENDER_READY__ === true, { timeout: 45000 });
    console.log('✓ Stage loaded and ready for frame extraction.');
  } catch (err: any) {
    if (staticChunkErrors >= 3 || chunkErrorMessage) {
      throw new Error(`Stage failed to initialize due to Next.js asset errors: ${chunkErrorMessage || 'Multiple static chunks returned HTTP 400'}. Please restart the Next.js dev server.`);
    }
    throw err;
  }

  // Create Chrome DevTools Protocol Client
  const client = await page.createCDPSession();

  // Synchronize Timeline with Browser Engine
  await page.evaluate((tl) => {
    const ctrl = (window as any).__RENDER_CONTROLLER__ || (window as any).__MASTER_SEEK__;
    if (ctrl && ctrl.setTimeline) {
      ctrl.setTimeline(tl);
    }
  }, timelineBlocks);
  console.log(`✓ Synchronized ${timelineBlocks.length} timeline cues with render engine.`);

  let frameCount = 0;
  const startTime = Date.now();

  if (opts.mode === 'stepped') {
    const totalFrames = Math.ceil(totalEstimatedDuration * opts.fps);
    console.log(`🎬 Stepping ${totalFrames} frames deterministically at ${opts.fps} CFR...`);

    for (let frame = 0; frame < totalFrames; frame++) {
      const t = frame / opts.fps;

      // 1. Advance stage time deterministically
      await page.evaluate(async (seekT) => {
        const ctrl = (window as any).__RENDER_CONTROLLER__ || (window as any).__MASTER_SEEK__;
        if (ctrl && ctrl.seekTime) {
          await ctrl.seekTime(seekT);
        }
      }, t);

      // 2. Capture lossless PNG frame via Chrome DevTools Protocol
      const screenshot = await client.send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: false,
      });

      const buffer = Buffer.from(screenshot.data, 'base64');
      ffmpegProcess.stdin.write(buffer);
      frameCount++;

      if (frameCount % 30 === 0 || frameCount === totalFrames) {
        const elapsedSec = (Date.now() - startTime) / 1000;
        const fpsRendered = (frameCount / (elapsedSec || 0.001)).toFixed(1);
        const percent = ((frameCount / totalFrames) * 100).toFixed(1);
        const remainingSec = ((totalFrames - frameCount) / (parseFloat(fpsRendered) || 1)).toFixed(0);
        process.stdout.write(`\r🎥 Rendered ${frameCount}/${totalFrames} frames (${percent}%) | Speed: ${fpsRendered} fps | ETA: ${remainingSec}s...`);
      }
    }
    console.log('\n✓ Stepped frame extraction complete. Finalizing media streams...');
  } else {
    // Screencast mode
    let isRecording = true;
    client.on('Page.screencastFrame', async (params) => {
      if (!isRecording) return;
      try {
        const buffer = Buffer.from(params.data, 'base64');
        if (ffmpegProcess.stdin.writable) {
          ffmpegProcess.stdin.write(buffer);
          frameCount++;

          if (frameCount % 60 === 0) {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            process.stdout.write(`\r🎥 Extracted: ${frameCount} frames (${(frameCount / opts.fps).toFixed(1)}s recorded) in ${elapsed}s...`);
          }
        }

        await client.send('Page.screencastFrameAck', { sessionId: params.sessionId });
      } catch (err) {
        // Stream teardown
      }
    });

    // Start Screencast Frame Streaming
    await client.send('Page.startScreencast', {
      format: 'png',
      everyNthFrame: 1,
      maxWidth: outWidth,
      maxHeight: outHeight,
    });

    // Start Playback
    await page.evaluate(() => {
      if ((window as any).__RENDER_CONTROLLER__) {
        (window as any).__RENDER_CONTROLLER__.play();
      }
    });

    console.log('▶️ Recording active stage in real-time...');

    // Wait until either __RENDER_FINISHED__ or total duration is reached
    const checkInterval = 1000;
    const maxWaitMs = (totalEstimatedDuration + 10) * 1000;
    const renderStart = Date.now();

    await new Promise<void>((resolve) => {
      const interval = setInterval(async () => {
        try {
          const isFinished = await page.evaluate(() => (window as any).__RENDER_FINISHED__ === true);
          const elapsedMs = Date.now() - renderStart;

          if (isFinished || elapsedMs > maxWaitMs) {
            clearInterval(interval);
            resolve();
          }
        } catch {
          clearInterval(interval);
          resolve();
        }
      }, checkInterval);
    });

    isRecording = false;
    try {
      await client.send('Page.stopScreencast');
    } catch {}
  }

  console.log('\nFinalizing video stream...');
  await browser.close();
  try {
    fs.rmSync(tempProfile, { recursive: true, force: true });
  } catch {}

  // Close stdin of FFmpeg to trigger encoding finalize
  ffmpegProcess.stdin.end();

  // Wait for FFmpeg process to close
  await new Promise<void>((resolve, reject) => {
    ffmpegProcess.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg exited with error code ${code}: ${ffmpegError || 'Unknown error'}`));
    });
  });

  if (serverCleanup) {
    serverCleanup();
  }

  console.log('\n========================================================');
  console.log('✅ MASTER VIDEO RENDER COMPLETED SUCCESSFULLY!');
  console.log('========================================================');
  console.log(`Video File:   ${finalVideoPath}`);
  console.log(`Markers File: ${markersCsvPath}`);
  console.log(`Total Frames: ${frameCount} (${(frameCount / opts.fps).toFixed(1)}s)`);
  console.log('Ready to drag and drop into Adobe Premiere Pro!');
  console.log('========================================================\n');
}

runRender().catch(err => {
  console.error('\n❌ Render engine failed:', err);
  process.exit(1);
});
