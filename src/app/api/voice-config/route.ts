import { NextResponse } from 'next/server';
import { getVoiceApiKey } from '@/lib/gemini';

export async function GET() {
  const apiKey = getVoiceApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: 'Gemini API key is not configured on the server.' }, { status: 500 });
  }
  return NextResponse.json({ apiKey });
}
