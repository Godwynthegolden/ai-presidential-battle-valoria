import { NextRequest, NextResponse } from 'next/server';
import { fishAudioService } from '@/services/fishAudio';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const search = searchParams.get('search') || undefined;
    const language = searchParams.get('language') || 'en';
    const apiKey = searchParams.get('apiKey') || undefined;

    const voices = await fishAudioService.fetchAvailableVoices({
      apiKey,
      search,
      language,
      pageSize: 30,
    });

    return NextResponse.json({
      success: true,
      voices,
      count: voices.length,
    });
  } catch (error: any) {
    console.error('[API /api/tts/voices error]:', error);
    return NextResponse.json({
      success: false,
      voices: fishAudioService.getCuratedVoices(),
      error: error.message || 'Failed to fetch voices',
    });
  }
}
