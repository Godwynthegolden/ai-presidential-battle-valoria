import { NextResponse } from 'next/server';
import { nineRouterService } from '@/services/nineRouter';

export async function GET() {
  return NextResponse.json({
    isConfigured: nineRouterService.isConfigured(),
    defaultModel: nineRouterService.getModelName(),
    defaultBaseUrl: nineRouterService.getBaseUrl(),
  });
}
