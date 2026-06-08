import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { ChatMessage } from '@/types';

const apiKey = process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your-anthropic-api-key-here'
  ? process.env.ANTHROPIC_API_KEY
  : 'ollama';

const client = new Anthropic({
  apiKey,
  baseURL: process.env.ANTHROPIC_BASE_URL || undefined,
});

const MODEL_NAME = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';

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

    const response = await client.messages.create({
      model: MODEL_NAME,
      max_tokens: 2048,
      tools: [
        {
          type: 'web_search_20250305',
          name: 'web_search',
          max_uses: 3,
        },
      ],
      system: `You are an expert assistant. The user is asking about a specific event: ${eventTitle} on ${eventDate}. Event context: ${eventDescription}. Answer all questions in context of this event only. Be concise, factual, and helpful. Use web search when needed for current information.`,
      messages: messages.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
    });

    // Extract the assistant's text response
    let messageText = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        messageText += block.text;
      }
    }

    return NextResponse.json({ message: messageText });
  } catch (error) {
    console.error('Chat API error:', error);
    const message =
      error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
