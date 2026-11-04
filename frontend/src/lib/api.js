const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

let tokenProvider = null;

export function setTokenProvider(fn) {
  tokenProvider = fn;
}

/**
 * Resolves a stored file or image path into a full URL.
 * If fileUrl starts with http:// or https://, returns it unchanged.
 * Otherwise joins it to the backend origin (VITE_API_BASE_URL with trailing /api removed)
 * without duplicating /api.
 */
export function resolveFileUrl(fileUrl) {
  if (!fileUrl || typeof fileUrl !== 'string') return '';
  const trimmed = fileUrl.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  const rawBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
  const backendOrigin = rawBase.replace(/\/api\/?$/i, '').replace(/\/+$/, '');
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${backendOrigin}${cleanPath}`;
}

/**
 * Builds query strings including ONLY params that are defined, non-null, and non-empty after trim.
 * Never includes "undefined" or "null".
 */
export function buildQueryString(params = {}) {
  if (!params || typeof params !== 'object') return '';
  const cleanParams = new URLSearchParams();
  for (const [key, val] of Object.entries(params)) {
    if (val === undefined || val === null) continue;
    const str = String(val).trim();
    if (str === '' || str.toLowerCase() === 'undefined' || str.toLowerCase() === 'null') continue;
    cleanParams.append(key, str);
  }
  const qs = cleanParams.toString();
  return qs ? `?${qs}` : '';
}

export async function apiRequest(endpoint, options = {}, isRetry = false) {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  const headers = {
    ...(options.headers || {})
  };

  // Only attach Authorization header if a valid token is returned
  if (tokenProvider) {
    try {
      const token = await tokenProvider(isRetry);
      if (typeof token === 'string') {
        const clean = token.trim();
        if (clean && clean !== 'undefined' && clean !== 'null') {
          headers['Authorization'] = `Bearer ${clean}`;
        }
      }
    } catch (e) {
      // Do not attach empty or undefined Authorization header
    }
  }

  // Auto-detect JSON payload vs FormData
  let body = options.body;
  if (!(body instanceof FormData) && body && typeof body === 'object') {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }

  try {
    const res = await fetch(url, { ...options, headers, body });

    // Retry once with a force-refreshed token on 401
    if (res.status === 401 && !isRetry && tokenProvider) {
      try {
        return await apiRequest(endpoint, options, true);
      } catch (retryErr) {
        throw retryErr;
      }
    }

    if (!res.ok) {
      let errorData;
      try {
        errorData = await res.json();
      } catch {
        errorData = { error: `Server returned status ${res.status}` };
      }
      const err = new Error(errorData.error || errorData.message || 'Request failed');
      err.status = res.status;
      err.code = errorData.code;
      err.details = errorData.details;
      throw err;
    }

    return await res.json();
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error('Connecting to server... (If this is a free deployment, the server might be waking up, please retry in 15 seconds)');
    }
    throw err;
  }
}

// API Methods
export const api = {
  // Health
  getHealth: () => apiRequest('/health'),
  getAIHealth: () => apiRequest('/health/ai'),

  // Profile
  getMe: () => apiRequest('/me'),
  updateMe: (data) => apiRequest('/me', { method: 'PUT', body: data }),

  // Study Tools
  uploadDocument: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiRequest('/upload/extract', {
      method: 'POST',
      body: formData
    });
  },

  summarize: (data) => apiRequest('/summarize', { method: 'POST', body: data }),
  generateQuiz: (data) => apiRequest('/quiz/generate', { method: 'POST', body: data }),
  submitQuizAttempt: (data) => apiRequest('/quiz/attempt', { method: 'POST', body: data }),
  explain: (data) => apiRequest('/explain', { method: 'POST', body: data }),
  generatePlan: (data) => apiRequest('/plan/generate', { method: 'POST', body: data }),

  // Library & Progress
  getLibrary: (params = {}) => apiRequest(`/library${buildQueryString(params)}`),
  deleteMaterial: (id) => apiRequest(`/materials/${id}`, { method: 'DELETE' }),
  getProgress: () => apiRequest('/progress'),

  // Past Questions & Safety
  getPastQuestions: (params = {}) => apiRequest(`/past-questions${buildQueryString(params)}`),
  submitPastQuestion: (data) => apiRequest('/past-questions', { method: 'POST', body: data }),
  extractPastQuestionFile: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiRequest('/past-questions/extract-file', {
      method: 'POST',
      body: formData
    });
  },
  getUserProfile: (uid) => apiRequest(`/users/${uid}`),
  report: (data) => apiRequest('/reports', { method: 'POST', body: data }),
  blockUser: (blockedUid) => apiRequest('/blocks', { method: 'POST', body: { blockedUid } }),

  // Student Network: Used-Book Marketplace
  getListings: (params = {}) => apiRequest(`/listings${buildQueryString(params)}`),
  getListing: (id) => apiRequest(`/listings/${id}`),
  createListing: (data) => apiRequest('/listings', { method: 'POST', body: data }),
  updateListing: (id, data) => apiRequest(`/listings/${id}`, { method: 'PUT', body: data }),
  markListingSold: (id) => apiRequest(`/listings/${id}/sold`, { method: 'PUT' }),
  deleteListing: (id) => apiRequest(`/listings/${id}`, { method: 'DELETE' }),
  aiAssistListing: (data) => apiRequest('/listings/ai-assist', { method: 'POST', body: data }),
  semanticSearchListings: (query) => apiRequest('/listings/search', { method: 'POST', body: { query } }),

  // Student Network: Collaborator Finder & Connections
  discoverPartners: (params = {}) => apiRequest(`/partners/discover${buildQueryString(params)}`),
  sendConnection: (data) => apiRequest('/connections', { method: 'POST', body: data }),
  getConnections: (params = {}) => apiRequest(`/connections${buildQueryString(params)}`),
  updateConnection: (id, status) => apiRequest(`/connections/${id}`, { method: 'PUT', body: { status } }),

  // Student Network: In-App Chat
  getChats: (params = {}) => apiRequest(`/chats${buildQueryString(params)}`),
  openChat: (data) => apiRequest('/chats', { method: 'POST', body: data }),
  getChatMessages: (chatId) => apiRequest(`/chats/${chatId}/messages`),
  sendMessage: (chatId, text) => apiRequest(`/chats/${chatId}/messages`, { method: 'POST', body: { text } }),

  // Student Network: Notifications
  getNotifications: (params = {}) => apiRequest(`/notifications${buildQueryString(params)}`),
  markNotificationRead: (id) => apiRequest(`/notifications/${id}/read`, { method: 'PUT' })
};
