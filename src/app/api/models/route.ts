import { NextRequest, NextResponse } from 'next/server';
import { nineRouterService } from '@/services/nineRouter';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { baseUrl, apiKey } = body;

    const models = await nineRouterService.fetchAvailableModels({ baseUrl, apiKey });

    return NextResponse.json({
      success: true,
      models,
      count: models.length,
    });
  } catch (error: any) {
    console.error('[API /api/models error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch models from 9router' },
      { status: 500 }
    );
  }
}
