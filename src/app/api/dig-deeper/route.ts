import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { TimelineEvent } from '@/types';

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
    const { query, existingTitles } = (await request.json()) as {
      query: string;
      existingTitles: string[];
    };

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'A valid search query is required.' },
        { status: 400 }
      );
    }

    const todayDate = new Date().toISOString().split('T')[0];
    const titlesListText =
      existingTitles && existingTitles.length > 0
        ? existingTitles.join(', ')
        : 'none';

    const response = await client.messages.create({
      model: MODEL_NAME,
      max_tokens: 4096,
      tools: [
        {
          type: 'web_search_20250305',
          name: 'web_search',
          max_uses: 5,
        },
      ],
      system: `You are an event research assistant. The user has already found these events: ${titlesListText}. Find MORE related events, dates, deadlines, and milestones for the query that are NOT already in the list. Return ONLY a valid JSON array sorted by date. Each object must have: title, date (ISO YYYY-MM-DD), description (max 20 words), status (past/present/future relative to today's date which is ${todayDate}), category (exam/deadline/result/announcement/event). Return ONLY the JSON array.`,
      messages: [
        {
          role: 'user',
          content: query,
        },
      ],
    });

    // Extract text blocks from the response content
    let fullText = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        fullText += block.text;
      }
    }

    // Find and parse the JSON array from the response text
    const jsonMatch = fullText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json({ events: [] });
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Assign unique IDs and ensure correct typing
    const events: TimelineEvent[] = parsed.map(
      (item: Omit<TimelineEvent, 'id'>, index: number) => ({
        id: crypto.randomUUID?.() ?? `${query}-${index}`,
        title: item.title,
        date: item.date,
        description: item.description,
        status: item.status,
        category: item.category,
        bookmarked: false,
        sourceUrl: item.sourceUrl,
      })
    );

    return NextResponse.json({ events });
  } catch (error) {
    console.error('Dig deeper API error:', error);
    const message =
      error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
