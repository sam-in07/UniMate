import crypto from 'crypto';

// In-memory cache for prompts & responses to save quotas
const promptCache = new Map();
const CACHE_TTL_MS = 1000 * 60 * 60 * 4; // 4 hours

// Per-user rate limiting tracker
const userRateLimits = new Map();

/**
 * Check if a user has exceeded rate limits.
 * Default: 25 requests/min for registered, 10 requests/min for guests
 */
export function checkUserRateLimit(userId, isGuest = false) {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = isGuest ? 10 : 25;

  if (!userRateLimits.has(userId)) {
    userRateLimits.set(userId, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  const userRecord = userRateLimits.get(userId);
  if (now > userRecord.resetAt) {
    userRecord.count = 1;
    userRecord.resetAt = now + windowMs;
    return { allowed: true };
  }

  if (userRecord.count >= maxRequests) {
    const retryAfter = Math.ceil((userRecord.resetAt - now) / 1000);
    return { allowed: false, retryAfter, maxRequests };
  }

  userRecord.count++;
  return { allowed: true };
}

/**
 * Generate a hash for prompt caching
 */
function hashPrompt(system, messages, json) {
  const payload = JSON.stringify({ system, messages, json });
  return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * Call Ollama Cloud API (Primary)
 */
async function callOllamaCloud({ system, messages, json = false, timeoutMs = 45000 }) {
  const baseUrl = (process.env.OLLAMA_BASE_URL || 'https://ollama.com/api').replace(/\/+$/, '');
  const apiKey = process.env.OLLAMA_API_KEY;
  const model = process.env.OLLAMA_MODEL || 'gemma4:31b';

  if (!apiKey) {
    throw new Error('OLLAMA_API_KEY is not configured in backend environment.');
  }

  const endpoint = baseUrl.endsWith('/api') ? `${baseUrl}/chat` : `${baseUrl}/api/chat`;

  const formattedMessages = [];
  if (system) {
    formattedMessages.push({ role: 'system', content: system });
  }
  for (const m of messages) {
    formattedMessages.push({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content
    });
  }

  const requestBody = {
    model,
    messages: formattedMessages,
    stream: false,
    ...(json ? { format: 'json' } : {})
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Ollama Cloud error [status ${res.status}]: ${errorText}`);
    }

    const data = await res.json();
    const output = data.message?.content || data.response || '';
    return { text: output, provider: 'ollama', model };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Call Google Gemini API (Fallback)
 */
async function callGemini({ system, messages, json = false, timeoutMs = 45000 }) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in backend environment.');
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const contents = [];
  for (const m of messages) {
    contents.push({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    });
  }

  const requestBody = {
    contents,
    ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
    generationConfig: {
      temperature: 0.3,
      ...(json ? { responseMimeType: 'application/json' } : {})
    }
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Gemini API error [status ${res.status}]: ${errorText}`);
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return { text, provider: 'gemini', model };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Clean markdown code fences for JSON strings
 */
function stripCodeFences(text) {
  if (!text) return '';
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```\s*$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/```\s*$/, '');
  }
  return cleaned.trim();
}

/**
 * Main AI generation function with automatic fallback & JSON validation
 */
export async function generateAI({
  system = '',
  messages = [],
  json = false,
  zodSchema = null,
  timeoutMs = 45000,
  skipCache = false
}) {
  // Shared system prompt rules
  const baseRules = 
    `You are UniMate's AI academic companion for students in Bangladesh and worldwide.\n` +
    `CRITICAL INSTRUCTIONS:\n` +
    `1. Answer accurately and honestly. If uncertain, state clearly what is unknown.\n` +
    `2. Respond in the requested language (Bangla, English, or mixed Banglish). If user speaks Banglish, understand and reply naturally.\n` +
    `3. Never claim to be official university material or policy.\n` +
    `4. Never invent citations, book chapters, verse numbers, or grade thresholds.\n` +
    `5. If Islamic/Arabic mode is enabled: clearly separate explanation from source references, only cite authentic Quran/Hadith if confident, never invent references, and append a reminder to verify with a qualified scholar. Render Arabic with proper diacritics where appropriate.`;

  const fullSystemPrompt = system ? `${baseRules}\n\n${system}` : baseRules;

  // Check cache
  const cacheKey = hashPrompt(fullSystemPrompt, messages, json);
  if (!skipCache && promptCache.has(cacheKey)) {
    const cached = promptCache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return { ...cached.data, cached: true };
    }
  }

  const primaryChoice = (process.env.AI_PRIMARY || 'ollama').toLowerCase();
  const primaryFn = primaryChoice === 'gemini' ? callGemini : callOllamaCloud;
  const fallbackFn = primaryChoice === 'gemini' ? callOllamaCloud : callGemini;
  const primaryName = primaryChoice;
  const fallbackName = primaryChoice === 'gemini' ? 'ollama' : 'gemini';

  let rawOutput = '';
  let providerUsed = '';
  let modelUsed = '';

  // Attempt Primary
  try {
    const result = await primaryFn({ system: fullSystemPrompt, messages, json, timeoutMs });
    rawOutput = result.text;
    providerUsed = result.provider;
    modelUsed = result.model;
    console.log(`[AI Layer] Generated successfully via primary (${providerUsed} - ${modelUsed})`);
  } catch (primaryErr) {
    console.warn(`[AI Layer] Primary provider (${primaryName}) failed: ${primaryErr.message}. Retrying fallback (${fallbackName})...`);
    // Attempt Fallback
    try {
      const result = await fallbackFn({ system: fullSystemPrompt, messages, json, timeoutMs });
      rawOutput = result.text;
      providerUsed = result.provider;
      modelUsed = result.model;
      console.log(`[AI Layer] Fallback succeeded (${providerUsed} - ${modelUsed})`);
    } catch (fallbackErr) {
      console.error(`[AI Layer] Both primary and fallback failed:`, fallbackErr.message);
      throw new Error(`AI generation failed on both providers. Primary: ${primaryErr.message}; Fallback: ${fallbackErr.message}`);
    }
  }

  // Handle JSON mode with validation and repair retry
  if (json) {
    let cleaned = stripCodeFences(rawOutput);
    let parsedData = null;

    try {
      parsedData = JSON.parse(cleaned);
      if (zodSchema) {
        parsedData = zodSchema.parse(parsedData);
      }
    } catch (err) {
      console.warn(`[AI Layer] JSON parse/validation error: ${err.message}. Triggering repair prompt...`);
      // Retry once with repair prompt
      const repairMessages = [
        ...messages,
        { role: 'assistant', content: rawOutput },
        {
          role: 'user',
          content: `Your previous response had a JSON parsing/schema validation error: ${err.message}. Return ONLY a raw, valid JSON object strictly matching the required schema. Do NOT include markdown fences, comments, or extra text.`
        }
      ];

      try {
        const repairResult = await (providerUsed === primaryName ? primaryFn : fallbackFn)({
          system: fullSystemPrompt,
          messages: repairMessages,
          json: true,
          timeoutMs
        });
        cleaned = stripCodeFences(repairResult.text);
        parsedData = JSON.parse(cleaned);
        if (zodSchema) {
          parsedData = zodSchema.parse(parsedData);
        }
      } catch (repairErr) {
        console.error(`[AI Layer] JSON repair failed: ${repairErr.message}`);
        throw new Error(`Failed to generate valid structured data: ${repairErr.message}`);
      }
    }

    const payload = {
      data: parsedData,
      provider: providerUsed,
      model: modelUsed
    };
    promptCache.set(cacheKey, { timestamp: Date.now(), data: payload });
    return payload;
  }

  // Text response
  const payload = {
    text: rawOutput,
    provider: providerUsed,
    model: modelUsed
  };
  promptCache.set(cacheKey, { timestamp: Date.now(), data: payload });
  return payload;
}

/**
 * Health check for AI providers
 */
export async function checkAIHealth() {
  const results = {
    configuredPrimary: process.env.AI_PRIMARY || 'ollama',
    providers: {
      ollama: {
        configured: Boolean(process.env.OLLAMA_API_KEY),
        model: process.env.OLLAMA_MODEL || 'gemma4:31b',
        status: 'unknown'
      },
      gemini: {
        configured: Boolean(process.env.GEMINI_API_KEY),
        model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
        status: 'unknown'
      }
    }
  };

  // Test Ollama if key exists
  if (results.providers.ollama.configured) {
    try {
      await callOllamaCloud({
        system: '',
        messages: [{ role: 'user', content: 'ping' }],
        timeoutMs: 8000
      });
      results.providers.ollama.status = 'reachable';
    } catch (err) {
      results.providers.ollama.status = 'unreachable';
      results.providers.ollama.error = err.message;
    }
  } else {
    results.providers.ollama.status = 'not_configured';
  }

  // Test Gemini if key exists
  if (results.providers.gemini.configured) {
    try {
      await callGemini({
        system: '',
        messages: [{ role: 'user', content: 'ping' }],
        timeoutMs: 8000
      });
      results.providers.gemini.status = 'reachable';
    } catch (err) {
      results.providers.gemini.status = 'unreachable';
      results.providers.gemini.error = err.message;
    }
  } else {
    results.providers.gemini.status = 'not_configured';
  }

  return results;
}
