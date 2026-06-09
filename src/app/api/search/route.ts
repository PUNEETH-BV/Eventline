import { NextResponse } from 'next/server';
import { generateContentWithFallback } from '@/lib/gemini';
import type { TimelineEvent } from '@/types';

const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

export async function POST(request: Request) {
  try {
    const { query } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'A valid search query is required.' },
        { status: 400 }
      );
    }

    const todayDate = new Date().toISOString().split('T')[0];

    const response = await generateContentWithFallback({
      model: MODEL_NAME,
      contents: query,
      config: {
        systemInstruction: `You are an event research assistant with web search access. When given a search query, find ALL related important dates, deadlines, milestones, and events. Use web search to get accurate current information. Return ONLY a valid JSON array sorted by date (earliest first). Do not include any markdown formatting or code fences.
Each object in the array must have exactly these fields:
{
  id: unique string,
  title: string (max 8 words),
  date: ISO date string (YYYY-MM-DD),
  description: string (max 25 words),
  status: 'past' | 'present' | 'future' (relative to today's date which is ${todayDate}),
  category: 'exam' | 'deadline' | 'result' | 'announcement' | 'sports' | 'tech' | 'general',
  source: string (website name or 'AI Generated'),
  confidence: 'high' | 'medium' | 'low'
}`,
        tools: [{ googleSearch: {} }],
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
      (item: any, index: number) => ({
        id: item.id || crypto.randomUUID?.() || `${query}-${index}`,
        title: item.title,
        date: item.date,
        description: item.description,
        status: item.status,
        category: item.category,
        bookmarked: false,
        sourceUrl: item.sourceUrl || undefined,
        source: item.source || 'AI Generated',
        confidence: item.confidence || 'medium',
      })
    );

    return NextResponse.json({ events });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again after some time.' }, { status: 500 });
  }
}
