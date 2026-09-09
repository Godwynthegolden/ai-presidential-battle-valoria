import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

interface ActiveJob {
  session: string;
  resolution: string;
  codec: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  logs: string[];
  outputFile?: string;
  markersFile?: string;
  error?: string;
  startedAt?: string;
  finishedAt?: string;
}

let currentJob: ActiveJob = {
  session: '',
  resolution: '1080p',
  codec: 'prores',
  status: 'idle',
  logs: [],
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    // List all completed master video exports across all sessions
    if (action === 'list_exports') {
      const savedGamesDir = path.join(process.cwd(), 'saved-games');
      const exportsList: Array<{
        session: string;
        filename: string;
        path: string;
        sizeBytes: number;
        createdAt: string;
        isProRes: boolean;
      }> = [];

      if (fs.existsSync(savedGamesDir)) {
        const sessionDirs = await fs.promises.readdir(savedGamesDir, { withFileTypes: true });
        for (const dir of sessionDirs) {
          if (dir.isDirectory()) {
            const expDir = path.join(savedGamesDir, dir.name, 'exports');
            if (fs.existsSync(expDir)) {
              const files = await fs.promises.readdir(expDir);
              for (const f of files) {
                if (f.endsWith('.mov') || f.endsWith('.mp4')) {
                  const stat = await fs.promises.stat(path.join(expDir, f));
                  exportsList.push({
                    session: dir.name,
                    filename: f,
                    path: path.join(expDir, f),
                    sizeBytes: stat.size,
                    createdAt: stat.mtime.toISOString(),
                    isProRes: f.endsWith('.mov'),
                  });
                }
              }
            }
          }
        }
      }

      return NextResponse.json({
        success: true,
        currentJob,
        exports: exportsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
      });
    }

    return NextResponse.json({
      success: true,
      currentJob,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const urlObj = new URL(req.url);
    const inferredPort = urlObj.port ? parseInt(urlObj.port, 10) : 3000;
    const { 
      session, 
      resolution = '1080p', 
      codec = 'prores', 
      maxEvents, 
      fps = 60, 
      mode = 'stepped',
      port = inferredPort,
    } = body;

    if (!session || typeof session !== 'string') {
      return NextResponse.json({ success: false, error: 'Session name is required' }, { status: 400 });
    }

    if (currentJob.status === 'running') {
      return NextResponse.json({
        success: false,
        error: `A render job for session "${currentJob.session}" is already in progress.`,
        currentJob,
      }, { status: 409 });
    }

    // Initialize Job
    currentJob = {
      session,
      resolution,
      codec,
      status: 'running',
      logs: [`Initiating render for session "${session}" (${resolution}, ${codec}, ${fps}fps, mode: ${mode}, port: ${port})...`],
      startedAt: new Date().toISOString(),
    };

    const scriptPath = path.join(process.cwd(), 'scripts', 'render-video.ts');
    const args = [
      'tsx',
      scriptPath,
      `--session=${session}`,
      `--res=${resolution}`,
      `--codec=${codec}`,
      `--fps=${fps}`,
      `--mode=${mode}`,
      `--port=${port}`,
    ];

    if (maxEvents && Number(maxEvents) > 0) {
      args.push(`--maxEvents=${maxEvents}`);
    }

    // Spawn detached render worker
    const child = spawn('npx', args, {
      cwd: process.cwd(),
      shell: true,
    });

    child.stdout?.on('data', (data) => {
      const line = data.toString();
      currentJob.logs.push(line);
      if (currentJob.logs.length > 200) currentJob.logs.shift();
    });

    child.stderr?.on('data', (data) => {
      const line = data.toString();
      currentJob.logs.push(`[stderr] ${line}`);
      if (currentJob.logs.length > 200) currentJob.logs.shift();
    });

    child.on('close', (code) => {
      if (code === 0) {
        currentJob.status = 'completed';
        currentJob.finishedAt = new Date().toISOString();
        const ext = codec === 'prores' ? 'mov' : 'mp4';
        currentJob.outputFile = path.join(process.cwd(), 'saved-games', session, 'exports', `master_${session}_${resolution}_${fps}fps.${ext}`);
        currentJob.markersFile = path.join(process.cwd(), 'saved-games', session, 'exports', `${session}_premiere_markers.csv`);
        currentJob.logs.push('✅ Render completed successfully!');
      } else {
        currentJob.status = 'failed';
        currentJob.finishedAt = new Date().toISOString();
        currentJob.error = `Process exited with code ${code}`;
        currentJob.logs.push(`❌ Render failed with exit code ${code}`);
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Render job initiated successfully',
      currentJob,
    });
  } catch (err: any) {
    currentJob.status = 'failed';
    currentJob.error = err.message;
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
