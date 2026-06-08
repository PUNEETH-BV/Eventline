import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import type { TimelineEvent } from '@/types';

const apiKey = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your-gemini-api-key-here'
  ? process.env.GEMINI_API_KEY
  : undefined;

const ai = new GoogleGenAI({
  apiKey,
  httpOptions: process.env.GEMINI_BASE_URL ? { baseUrl: process.env.GEMINI_BASE_URL } : undefined,
});

const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

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

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: query,
      config: {
        systemInstruction: `You are an event research assistant. The user has already found these events: ${titlesListText}. Find MORE related events, dates, deadlines, and milestones for the query that are NOT already in the list. Use Google Search grounding to discover them. Return ONLY a valid JSON array sorted by date. Each object must have: title, date (ISO YYYY-MM-DD), description (max 20 words), status (past/present/future relative to today's date which is ${todayDate}), category (exam/deadline/result/announcement/event). Return ONLY the JSON array.`,
        tools: [{ googleSearch: {} }],
        responseMimeType: 'application/json',
      },
    });

    const fullText = response.text || '';

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
