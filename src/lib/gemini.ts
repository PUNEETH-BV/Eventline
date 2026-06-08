import { GoogleGenAI } from '@google/genai';

export interface GenerateContentParams {
  model: string;
  contents: any;
  config?: any;
}

/**
 * Gets all configured Gemini API keys from environment variables.
 */
export function getGeminiApiKeys(): string[] {
  const cleanKey = (k: string) => k.replace(/['"\s]/g, '').trim();
  const isValidGeminiKey = (k: string) => k.startsWith('AIzaSy');
  
  let keys: string[] = [];

  // Parse GEMINI_API_KEYS (plural)
  const keysStr = process.env.GEMINI_API_KEYS;
  if (keysStr) {
    const parts = keysStr.split(',').map(cleanKey).filter(isValidGeminiKey);
    for (const p of parts) {
      if (!keys.includes(p)) {
        keys.push(p);
      }
    }
  }
  
  // Parse GEMINI_API_KEY (singular)
  const singleKey = process.env.GEMINI_API_KEY;
  if (singleKey) {
    if (singleKey.includes(',')) {
      const parts = singleKey.split(',').map(cleanKey).filter(isValidGeminiKey);
      for (const p of parts) {
        if (!keys.includes(p)) {
          keys.push(p);
        }
      }
    } else {
      const cleaned = cleanKey(singleKey);
      if (isValidGeminiKey(cleaned) && !keys.includes(cleaned)) {
        keys.push(cleaned);
      }
    }
  }
  
  return keys;
}

/**
 * Returns a key for client-side voice search WebSocket connection.
 * Selects randomly from available keys to load-balance and rotate dynamically.
 */
export function getVoiceApiKey(): string | null {
  const keys = getGeminiApiKeys();
  if (keys.length === 0) {
    return null;
  }
  const randomIndex = Math.floor(Math.random() * keys.length);
  return keys[randomIndex];
}

/**
 * Executes generateContent by attempting configured Gemini API keys sequentially.
 * Falls back to OpenRouter if all direct Gemini API keys fail.
 */
export async function generateContentWithFallback(params: GenerateContentParams) {
  const keys = getGeminiApiKeys();
  let lastError: any = null;

  // 1. Try direct Gemini API keys
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    try {
      const ai = new GoogleGenAI({
        apiKey: key,
        httpOptions: process.env.GEMINI_BASE_URL ? { baseUrl: process.env.GEMINI_BASE_URL } : undefined,
      });
      
      const response = await ai.models.generateContent(params);
      return response;
    } catch (err: any) {
      console.error(`Gemini API key at index ${i} failed:`, err?.message || err);
      lastError = err;
    }
  }

  // 2. Fallback to OpenRouter if direct keys fail
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (openRouterKey && openRouterKey !== 'your-openrouter-key-here') {
    console.log('All direct Gemini keys exhausted or unavailable. Trying OpenRouter fallback...');
    try {
      const messages: any[] = [];
      
      // Inject system instruction if present
      if (params.config?.systemInstruction) {
        messages.push({
          role: 'system',
          content: typeof params.config.systemInstruction === 'string'
            ? params.config.systemInstruction
            : params.config.systemInstruction.parts?.[0]?.text || ''
        });
      }

      // Convert contents
      if (typeof params.contents === 'string') {
        messages.push({ role: 'user', content: params.contents });
      } else if (Array.isArray(params.contents)) {
        for (const c of params.contents) {
          const role = c.role === 'model' ? 'assistant' : 'user';
          const text = c.parts?.[0]?.text || '';
          messages.push({ role, content: text });
        }
      }

      let openRouterModel = 'google/gemini-2.5-flash';
      if (params.model.includes('flash')) {
        openRouterModel = 'google/gemini-2.5-flash';
      }

      const openRouterRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openRouterKey}`,
          'HTTP-Referer': 'https://eventline-beta.vercel.app',
          'X-Title': 'EventLine',
        },
        body: JSON.stringify({
          model: openRouterModel,
          messages,
          response_format: params.config?.responseMimeType === 'application/json' ? { type: 'json_object' } : undefined,
        }),
      });

      if (openRouterRes.ok) {
        const data = await openRouterRes.json();
        const textContent = data.choices?.[0]?.message?.content || '';
        return {
          text: textContent,
        } as any;
      } else {
        const errorText = await openRouterRes.text();
        console.error('OpenRouter fallback request failed:', errorText);
      }
    } catch (err) {
      console.error('OpenRouter fallback exception:', err);
    }
  }

  throw lastError || new Error('All configured Gemini API keys and fallbacks failed.');
}
