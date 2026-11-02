import crypto from 'crypto';

// In-memory cache for prompts & responses to save quotas
const promptCache = new Map();
const CACHE_TTL_MS = 1000 * 60 * 60 * 4; // 4 hours

// Per-user rate limiting tracker
const userRateLimits = new Map();

// Provider cooldown tracker (for 429 / quota errors)
const providerCooldowns = new Map();
const COOLDOWN_DURATION_MS = 3 * 60 * 1000; // 3 minutes

// Dynamic model caches for fallbacks
let cachedGroqModel = null;
let cachedGeminiModel = null;

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

function hashPrompt(system, messages, json) {
  const payload = JSON.stringify({ system, messages, json });
  return crypto.createHash('sha256').update(payload).digest('hex');
}

function isCoolingDown(provider) {
  const expire = providerCooldowns.get(provider);
  if (!expire) return false;
  if (Date.now() > expire) {
    providerCooldowns.delete(provider);
    return false;
  }
  return true;
}

function setCooldown(provider) {
  const until = Date.now() + COOLDOWN_DURATION_MS;
  providerCooldowns.set(provider, until);
  console.warn(`[AI Layer] Provider '${provider}' marked cooling down until ${new Date(until).toISOString()}`);
}

function isQuotaOrRateLimitError(status, errorText = '') {
  const lower = String(errorText).toLowerCase();
  return (
    status === 429 ||
    status === 402 ||
    lower.includes('quota') ||
    lower.includes('rate limit') ||
    lower.includes('resource_exhausted') ||
    lower.includes('insufficient_quota') ||
    lower.includes('credit')
  );
}

/**
 * 1. Call Ollama Cloud API (Primary)
 * POST {OLLAMA_BASE_URL}/api/chat
 */
async function callOllamaCloud({ system, messages, json = false, timeoutMs = 45000 }) {
  const rawBase = process.env.OLLAMA_BASE_URL || 'https://ollama.com';
  const baseUrl = rawBase.replace(/\/+$/, '');
  const apiKey = process.env.OLLAMA_API_KEY;
  const model = process.env.OLLAMA_MODEL || 'gemma4:31b';

  if (!apiKey) {
    throw new Error('OLLAMA_API_KEY is not configured in backend environment.');
  }

  const endpoint = `${baseUrl}/api/chat`;

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

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const textPreview = (await res.text()).slice(0, 150);
      throw new Error(`Ollama Cloud returned non-JSON response [status ${res.status}, content-type: ${contentType}]: ${textPreview}`);
    }

    const data = await res.json();
    if (!res.ok) {
      const errMessage = data.error || `HTTP ${res.status}`;
      if (isQuotaOrRateLimitError(res.status, errMessage)) {
        setCooldown('ollama');
      }
      throw new Error(`Ollama Cloud error [status ${res.status}]: ${errMessage}`);
    }

    const output = data.message?.content || data.response || '';
    return { text: output, provider: 'ollama', model };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * 2. Call Groq API (Fallback 1)
 * OpenAI-compatible: POST {GROQ_BASE_URL}/chat/completions
 */
async function callGroq({ system, messages, json = false, timeoutMs = 45000 }) {
  const rawBase = process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1';
  const baseUrl = rawBase.replace(/\/+$/, '');
  const apiKey = process.env.GROQ_API_KEY;
  let model = cachedGroqModel || process.env.GROQ_MODEL || 'qwen/qwen3.8-27b';

  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured in backend environment.');
  }

  const endpoint = `${baseUrl}/chat/completions`;

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

  async function executeRequest(activeModel) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: activeModel,
          messages: formattedMessages,
          stream: false,
          ...(json ? { response_format: { type: 'json_object' } } : {})
        }),
        signal: controller.signal
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = (await res.text()).slice(0, 150);
        throw new Error(`Groq returned non-JSON response [status ${res.status}, content-type: ${contentType}]: ${text}`);
      }

      const data = await res.json();
      return { res, data };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  let { res, data } = await executeRequest(model);

  // If model not found (404 or error text contains model), dynamically list models and pick a working chat model
  if (!res.ok && (res.status === 404 || data.error?.message?.toLowerCase().includes('model'))) {
    console.warn(`[AI Layer] Groq model '${model}' not found. Fetching available models from /models...`);
    try {
      const listRes = await fetch(`${baseUrl}/models`, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      if (listRes.ok) {
        const listData = await listRes.json();
        const available = listData.data || [];
        const candidate = available.find(m =>
          !m.id.includes('whisper') &&
          !m.id.includes('guard') &&
          !m.id.includes('orpheus')
        );
        if (candidate) {
          cachedGroqModel = candidate.id;
          model = candidate.id;
          console.log(`[AI Layer] Selected available Groq model: ${model}`);
          const retry = await executeRequest(model);
          res = retry.res;
          data = retry.data;
        }
      }
    } catch (listErr) {
      console.warn('[AI Layer] Could not list Groq models:', listErr.message);
    }
  }

  if (!res.ok) {
    const errMsg = data.error?.message || `HTTP ${res.status}`;
    if (isQuotaOrRateLimitError(res.status, errMsg)) {
      setCooldown('groq');
    }
    throw new Error(`Groq API error [status ${res.status}]: ${errMsg}`);
  }

  const output = data.choices?.[0]?.message?.content || '';
  return { text: output, provider: 'groq', model };
}

/**
 * 3. Call Google Gemini API (Fallback 2)
 */
async function callGemini({ system, messages, json = false, timeoutMs = 45000 }) {
  const apiKey = process.env.GEMINI_API_KEY;
  let model = cachedGeminiModel || process.env.GEMINI_MODEL || 'gemini-3.5-flash';

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in backend environment.');
  }

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

  async function executeRequest(activeModel) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent`;

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = (await res.text()).slice(0, 150);
        throw new Error(`Gemini returned non-JSON response [status ${res.status}, content-type: ${contentType}]: ${text}`);
      }

      const data = await res.json();
      return { res, data };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  let { res, data } = await executeRequest(model);

  // On 404 (model not found), call ListModels and pick a flash or flash-lite model
  if (!res.ok && res.status === 404) {
    console.warn(`[AI Layer] Gemini model '${model}' returned 404. Calling ListModels...`);
    try {
      const listRes = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
        headers: { 'x-goog-api-key': apiKey }
      });
      if (listRes.ok) {
        const listData = await listRes.json();
        const models = listData.models || [];
        const flashCandidate = models.find(m =>
          m.supportedGenerationMethods?.includes('generateContent') &&
          (m.name.includes('flash') || m.name.includes('flash-lite'))
        );
        if (flashCandidate) {
          const pickedModel = flashCandidate.name.replace(/^models\//, '');
          cachedGeminiModel = pickedModel;
          model = pickedModel;
          console.log(`[AI Layer] Discovered working Gemini model: ${model}`);
          const retry = await executeRequest(model);
          res = retry.res;
          data = retry.data;
        }
      }
    } catch (listErr) {
      console.warn('[AI Layer] Could not list Gemini models:', listErr.message);
    }
  }

  if (!res.ok) {
    const errMsg = data.error?.message || `HTTP ${res.status}`;
    if (isQuotaOrRateLimitError(res.status, errMsg)) {
      setCooldown('gemini');
    }
    throw new Error(`Gemini API error [status ${res.status}]: ${errMsg}`);
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return { text, provider: 'gemini', model };
}

/**
 * Provider Registry
 */
const PROVIDER_HANDLERS = {
  ollama: {
    fn: callOllamaCloud,
    isConfigured: () => Boolean(process.env.OLLAMA_API_KEY && process.env.OLLAMA_API_KEY.trim()),
    getModel: () => process.env.OLLAMA_MODEL || 'gemma4:31b'
  },
  groq: {
    fn: callGroq,
    isConfigured: () => Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim()),
    getModel: () => cachedGroqModel || process.env.GROQ_MODEL || 'qwen/qwen3.8-27b'
  },
  gemini: {
    fn: callGemini,
    isConfigured: () => Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()),
    getModel: () => cachedGeminiModel || process.env.GEMINI_MODEL || 'gemini-3.5-flash'
  }
};

/**
 * Get ordered list of providers to try
 */
function getProviderChain() {
  const primary = (process.env.AI_PRIMARY || 'ollama').toLowerCase().trim();
  const rawFallbacks = (process.env.AI_FALLBACKS || 'groq,gemini').split(',');
  const fallbacks = rawFallbacks.map(f => f.toLowerCase().trim()).filter(Boolean);

  const seen = new Set();
  const chain = [];

  if (PROVIDER_HANDLERS[primary]) {
    chain.push(primary);
    seen.add(primary);
  }

  for (const f of fallbacks) {
    if (PROVIDER_HANDLERS[f] && !seen.has(f)) {
      chain.push(f);
      seen.add(f);
    }
  }

  return chain;
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
 * Main AI generation function with multi-provider fallback & JSON validation
 */
export async function generateAI({
  system = '',
  messages = [],
  json = false,
  zodSchema = null,
  timeoutMs = 45000,
  skipCache = false
}) {
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

  const chain = getProviderChain();
  let rawOutput = '';
  let providerUsed = '';
  let modelUsed = '';
  const providerErrors = [];

  for (const providerName of chain) {
    const handler = PROVIDER_HANDLERS[providerName];
    if (!handler.isConfigured()) {
      continue;
    }

    if (isCoolingDown(providerName)) {
      console.warn(`[AI Layer] Skipping '${providerName}' due to active cooldown.`);
      continue;
    }

    try {
      const result = await handler.fn({
        system: fullSystemPrompt,
        messages,
        json,
        timeoutMs
      });
      rawOutput = result.text;
      providerUsed = result.provider;
      modelUsed = result.model;
      console.log(`[AI Layer] Answered by: ${providerUsed} (model: ${modelUsed})`);
      break;
    } catch (err) {
      console.warn(`[AI Layer] Provider '${providerName}' failed: ${err.message}`);
      providerErrors.push(`${providerName}: ${err.message}`);
    }
  }

  if (!providerUsed) {
    throw new Error(`All configured AI providers failed. Details: ${providerErrors.join(' | ') || 'No providers available'}`);
  }

  // Handle JSON mode with validation and 1 repair retry
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
      const repairMessages = [
        ...messages,
        { role: 'assistant', content: rawOutput },
        {
          role: 'user',
          content: `Your previous response had a JSON parsing/schema validation error: ${err.message}. Return ONLY a raw, valid JSON object strictly matching the required schema. Do NOT include markdown fences, comments, or extra text.`
        }
      ];

      try {
        const handler = PROVIDER_HANDLERS[providerUsed];
        const repairResult = await handler.fn({
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

  // Plain text response
  const payload = {
    text: rawOutput,
    provider: providerUsed,
    model: modelUsed
  };
  promptCache.set(cacheKey, { timestamp: Date.now(), data: payload });
  return payload;
}

/**
 * Health check: tests EVERY provider with a tiny REAL generation call
 * Lists every provider as ok, error, or not_configured
 * NEVER leaks secret keys
 */
export async function checkAIHealth() {
  const providers = {};
  const chain = ['ollama', 'groq', 'gemini'];

  for (const name of chain) {
    const handler = PROVIDER_HANDLERS[name];
    const configured = handler.isConfigured();
    const model = handler.getModel();

    if (!configured) {
      providers[name] = {
        configured: false,
        status: 'not_configured',
        model
      };
      continue;
    }

    // Provider is configured: make a real test call
    try {
      const res = await handler.fn({
        system: '',
        messages: [{ role: 'user', content: 'Reply with OK' }],
        timeoutMs: 10000
      });
      providers[name] = {
        configured: true,
        status: 'ok',
        model: res.model || model,
        reply: res.text?.trim()?.slice(0, 30) || 'OK'
      };
    } catch (err) {
      providers[name] = {
        configured: true,
        status: 'error',
        model,
        error: err.message?.replace(/(key|token)=[^\s&]+/gi, '$1=***') || 'Request failed'
      };
    }
  }

  return {
    primary: process.env.AI_PRIMARY || 'ollama',
    fallbacks: process.env.AI_FALLBACKS || 'groq,gemini',
    providers
  };
}
