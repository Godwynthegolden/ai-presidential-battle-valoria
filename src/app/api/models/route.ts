import { NextRequest, NextResponse } from 'next/server';
import { nineRouterService } from '@/services/nineRouter';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const baseUrl = searchParams.get('baseUrl') || process.env.LLM_BASE_URL || 'http://localhost:20128/v1';
    const apiKey = searchParams.get('apiKey') || process.env.LLM_API_KEY || '';

    const models = await nineRouterService.fetchAvailableModels({ baseUrl, apiKey });

    return NextResponse.json({
      success: true,
      models,
      count: models.length,
    });
  } catch (error: any) {
    console.error('[API GET /api/models error]:', error);
    return NextResponse.json(
      { 
        success: false, 
        models: [], 
        error: error.message || 'Failed to fetch models from 9router' 
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const baseUrl = body.baseUrl || process.env.LLM_BASE_URL || 'http://localhost:20128/v1';
    const apiKey = body.apiKey || process.env.LLM_API_KEY || '';

    const models = await nineRouterService.fetchAvailableModels({ baseUrl, apiKey });

    return NextResponse.json({
      success: true,
      models,
      count: models.length,
    });
  } catch (error: any) {
    console.error('[API POST /api/models error]:', error);
    return NextResponse.json(
      { 
        success: false, 
        models: [], 
        error: error.message || 'Failed to fetch models from 9router' 
      },
      { status: 500 }
    );
  }
}
