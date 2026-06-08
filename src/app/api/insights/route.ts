import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

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
    const { title, date } = await request.json();

    if (!title || !date) {
      return NextResponse.json({ error: 'title and date are required.' }, { status: 400 });
    }

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Give 3 bullet point insights about: ${title} on ${date}. Be specific, facts-based, and useful. Format as a JSON array of strings (e.g. ["Insight 1", "Insight 2", "Insight 3"]). Do not include any markdown formatting, just the raw JSON array.`,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '[]';
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json({ insights: [] });
    }

    const insights = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ insights });
  } catch (error) {
    console.error('Insights API error:', error);
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
