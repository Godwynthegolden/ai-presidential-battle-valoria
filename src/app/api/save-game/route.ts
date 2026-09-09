import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import { sessionStorageService } from '@/services/sessionStorage';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionName = searchParams.get('sessionName');
    const audioFile = searchParams.get('audioFile');

    // 1. If audioFile is requested, stream the audio binary
    if (sessionName && audioFile) {
      const audioPath = sessionStorageService.getAudioFilePath(sessionName, audioFile);
      if (!audioPath) {
        return NextResponse.json({ error: 'Audio file not found' }, { status: 404 });
      }
      const fileBuffer = await fs.promises.readFile(audioPath);
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': fileBuffer.length.toString(),
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    // 2. If specific sessionName requested, return full session details
    if (sessionName) {
      const sessionData = await sessionStorageService.loadSession(sessionName);
      if (!sessionData.success) {
        return NextResponse.json(sessionData, { status: 404 });
      }
      return NextResponse.json(sessionData);
    }

    // 3. Otherwise list all sessions
    const sessions = await sessionStorageService.listSessions();
    return NextResponse.json({ success: true, sessions });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';

    // Handle Multipart Form Data (Audio Blob Uploads)
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const sessionName = formData.get('sessionName') as string;
      const filename = formData.get('filename') as string;
      const metadataRaw = formData.get('metadata') as string;
      const file = formData.get('file') as File | null;

      if (!sessionName || !filename || !file) {
        return NextResponse.json(
          { success: false, error: 'Missing sessionName, filename, or audio file.' },
          { status: 400 }
        );
      }

      let metadata: any = {};
      if (metadataRaw) {
        try { metadata = JSON.parse(metadataRaw); } catch {}
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const result = await sessionStorageService.saveAudio(
        sessionName,
        filename,
        buffer,
        metadata
      );

      return NextResponse.json(result);
    }

    // Handle JSON Payload Requests
    const body = await req.json().catch(() => ({}));
    const { action, sessionName } = body;

    if (!sessionName || typeof sessionName !== 'string' || !sessionName.trim()) {
      return NextResponse.json(
        { success: false, error: 'sessionName parameter is required.' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'init_session': {
        const { topic, candidates, timestamp } = body;
        const result = await sessionStorageService.initSession(sessionName, {
          topic,
          candidates: candidates || [],
          timestamp,
        });
        return NextResponse.json(result);
      }

      case 'save_event': {
        const { eventData } = body;
        if (!eventData) {
          return NextResponse.json(
            { success: false, error: 'eventData is required for save_event' },
            { status: 400 }
          );
        }
        const result = await sessionStorageService.saveEvent(sessionName, eventData);
        return NextResponse.json(result);
      }

      case 'save_audio': {
        const { filename, audioBase64, metadata } = body;
        if (!filename || !audioBase64) {
          return NextResponse.json(
            { success: false, error: 'filename and audioBase64 are required' },
            { status: 400 }
          );
        }
        const buffer = Buffer.from(audioBase64, 'base64');
        const result = await sessionStorageService.saveAudio(
          sessionName,
          filename,
          buffer,
          metadata
        );
        return NextResponse.json(result);
      }

      case 'finish_session': {
        const { winnerId, winnerName, victorySpeech } = body;
        const result = await sessionStorageService.finishSession(sessionName, {
          winnerId,
          winnerName,
          victorySpeech,
        });
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unsupported action: "${action}"` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('[API /api/save-game error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Save game operation failed.' },
      { status: 500 }
    );
  }
}
