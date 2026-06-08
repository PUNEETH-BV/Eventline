import { NextResponse } from 'next/server';
import { generateContentWithFallback } from '@/lib/gemini';
import type { ChatMessage } from '@/types';

const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

export async function POST(request: Request) {
  try {
    const { messages } = (await request.json()) as { messages: ChatMessage[] };

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'messages array is required.' },
        { status: 400 }
      );
    }

    // Convert messages to Gemini format
    const contents = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const response = await generateContentWithFallback({
      model: MODEL_NAME,
      contents,
      config: {
        systemInstruction: `You are EventLine's AI Assistant. You help users explore, search, and analyze event timelines (exams, deadlines, tech releases, sports, etc.). 
Your goals:
1. Help users discover event dates.
2. Suggest search terms they can enter in EventLine's search bar (e.g. "NEET 2026", "IPL 2026", "Google I/O").
3. Answer general timeline planning and schedule questions.
Be friendly, highly concise, and practical.`,
      },
    });

    const reply = response.text || 'Sorry, I couldn\'t formulate a response right now.';
    return NextResponse.json({ reply });
  } catch (error) {
    console.error('General Chat API error:', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again after some time.' }, { status: 500 });
  }
}
