import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export const config = {
  // Static security headers are configured in next.config.ts.
  matcher: ['/__proxy_disabled__'],
};

export function proxy(_request: NextRequest) {
  return NextResponse.next();
}
