const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

let tokenProvider = null;

export function setTokenProvider(fn) {
  tokenProvider = fn;
}

export async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  const headers = {
    ...(options.headers || {})
  };

  if (tokenProvider) {
    try {
      const token = await tokenProvider();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    } catch (e) {
      console.warn('[API Client] Could not retrieve ID token:', e);
    }
  }

  // Auto-detect JSON payload vs FormData
  if (!(options.body instanceof FormData) && options.body && typeof options.body === 'object') {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  try {
    const res = await fetch(url, { ...options, headers });

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
  getLibrary: () => apiRequest('/library'),
  deleteMaterial: (id) => apiRequest(`/materials/${id}`, { method: 'DELETE' }),
  getProgress: () => apiRequest('/progress'),

  // Past Questions & Safety
  getPastQuestions: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/past-questions${query ? `?${query}` : ''}`);
  },
  submitPastQuestion: (data) => apiRequest('/past-questions', { method: 'POST', body: data }),
  report: (data) => apiRequest('/reports', { method: 'POST', body: data }),
  blockUser: (blockedUid) => apiRequest('/blocks', { method: 'POST', body: { blockedUid } }),

  // Student Network: Used-Book Marketplace
  getListings: (params = {}) => {
    const cleanParams = {};
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') cleanParams[k] = v;
    });
    const query = new URLSearchParams(cleanParams).toString();
    return apiRequest(`/listings${query ? `?${query}` : ''}`);
  },
  getListing: (id) => apiRequest(`/listings/${id}`),
  createListing: (data) => apiRequest('/listings', { method: 'POST', body: data }),
  updateListing: (id, data) => apiRequest(`/listings/${id}`, { method: 'PUT', body: data }),
  markListingSold: (id) => apiRequest(`/listings/${id}/sold`, { method: 'PUT' }),
  deleteListing: (id) => apiRequest(`/listings/${id}`, { method: 'DELETE' }),
  aiAssistListing: (data) => apiRequest('/listings/ai-assist', { method: 'POST', body: data }),
  semanticSearchListings: (query) => apiRequest('/listings/search', { method: 'POST', body: { query } }),

  // Student Network: Collaborator Finder & Connections
  discoverPartners: (params = {}) => {
    const cleanParams = {};
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') cleanParams[k] = v;
    });
    const query = new URLSearchParams(cleanParams).toString();
    return apiRequest(`/partners/discover${query ? `?${query}` : ''}`);
  },
  sendConnection: (data) => apiRequest('/connections', { method: 'POST', body: data }),
  getConnections: () => apiRequest('/connections'),
  updateConnection: (id, status) => apiRequest(`/connections/${id}`, { method: 'PUT', body: { status } }),

  // Student Network: In-App Chat
  getChats: () => apiRequest('/chats'),
  openChat: (data) => apiRequest('/chats', { method: 'POST', body: data }),
  getChatMessages: (chatId) => apiRequest(`/chats/${chatId}/messages`),
  sendMessage: (chatId, text) => apiRequest(`/chats/${chatId}/messages`, { method: 'POST', body: { text } }),

  // Student Network: Notifications
  getNotifications: () => apiRequest('/notifications'),
  markNotificationRead: (id) => apiRequest(`/notifications/${id}/read`, { method: 'PUT' })
};

