import { NextResponse } from 'next/server';
import { generateContentWithFallback } from '@/lib/gemini';
import type { ChatMessage } from '@/types';

const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

export async function POST(request: Request) {
  try {
    const { eventTitle, eventDate, eventDescription, messages } =
      (await request.json()) as {
        eventTitle: string;
        eventDate: string;
        eventDescription: string;
        messages: ChatMessage[];
      };

    if (!eventTitle || !messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'eventTitle and messages are required.' },
        { status: 400 }
      );
    }

    // Convert messages to Gemini format (role is 'user' or 'model')
    const contents = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    // Generate content
    const response = await generateContentWithFallback({
      model: MODEL_NAME,
      contents,
      config: {
        systemInstruction: `You are an expert assistant. The user is asking about a specific event: ${eventTitle} on ${eventDate}. Event context: ${eventDescription}. Answer all questions in context of this event only. Be concise, factual, and helpful. Use Google Search when needed for current information.`,
        tools: [{ googleSearch: {} }],
      },
    });

    const messageText = response.text || '';

    return NextResponse.json({ message: messageText });
  } catch (error) {
    console.error('Chat API error:', error);
    const message =
      error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
