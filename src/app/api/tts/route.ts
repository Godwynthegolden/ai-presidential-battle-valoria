import { NextRequest, NextResponse } from 'next/server';
import { fishAudioService } from '@/services/fishAudio';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { text, voiceId, apiKey, model, format } = body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json(
        { success: false, error: 'Text parameter is required for TTS synthesis.' },
        { status: 400 }
      );
    }

    const audioBuffer = await fishAudioService.generateSpeech({
      text,
      voiceId,
      apiKey,
      model,
      format: format || 'mp3',
    });

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(audioBuffer.byteLength),
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    });
  } catch (error: any) {
    console.error('[API /api/tts error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Fish Audio TTS generation failed' },
      { status: 500 }
    );
  }
}
