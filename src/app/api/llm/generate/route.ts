import { NextRequest, NextResponse } from 'next/server';
import { nineRouterService } from '@/services/nineRouter';
import { LLMRequestPayload } from '@/types/game';

export async function POST(req: NextRequest) {
  try {
    const payload: LLMRequestPayload = await req.json();

    if (!payload || !payload.action || !payload.candidateId) {
      return NextResponse.json(
        { error: 'Missing required payload parameters: action, candidateId' },
        { status: 400 }
      );
    }

    const result = await nineRouterService.generateAgentAction(payload, payload.config);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API /api/llm/generate error]:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
