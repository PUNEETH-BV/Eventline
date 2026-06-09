import { NextResponse } from 'next/server';
import { generateContentWithFallback } from '@/lib/gemini';

const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

export async function POST(request: Request) {
  try {
    const { title, date, description } = await request.json();

    if (!title || !date) {
      return NextResponse.json(
        { error: 'title and date are required.' },
        { status: 400 }
      );
    }

    const response = await generateContentWithFallback({
      model: MODEL_NAME,
      contents: `Explain the event: "${title}" occurring on "${date}". Additional context: "${description || ''}".
Generate exactly 4 to 6 detailed sentences about:
1. What this event is.
2. Why it matters.
3. What happens on this date.
4. What people should do or know.

Provide a single paragraph response. Do not add markdown formatting or bullets.`,
    });

    const reply = response.text || 'No description could be generated at this time.';

    return NextResponse.json({ description: reply.trim() });
  } catch (error) {
    console.error('Description API error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again after some time.' },
      { status: 500 }
    );
  }
}
