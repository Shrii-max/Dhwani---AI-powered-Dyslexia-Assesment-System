// Frontend API Service - Connect React to Backend

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Get JWT token from localStorage
const getToken = (): string | null => {
  return localStorage.getItem('dhwani_token');
};

// Set JWT token in localStorage
const setToken = (token: string): void => {
  localStorage.setItem('dhwani_token', token);
};

// Remove token
const removeToken = (): void => {
  localStorage.removeItem('dhwani_token');
};

// API call wrapper with auth
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  // Add authorization header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Add Content-Type for non-FormData requests
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// Auth APIs
export const authAPI = {
  async signup(data: {
    email: string;
    password: string;
    name: string;
    dateOfBirth?: string;
    grade?: string;
    parentEmail?: string;
  }) {
    const result = await apiCall<{ success: boolean; data: { user: any; token: string } }>(
      '/auth/signup',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    setToken(result.data.token);
    return result.data.user;
  },

  async login(email: string, password: string) {
    const result = await apiCall<{ success: boolean; data: { user: any; token: string } }>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }
    );
    setToken(result.data.token);
    return result.data.user;
  },

  async getCurrentUser() {
    const result = await apiCall<{ success: boolean; data: { user: any } }>(
      '/auth/me'
    );
    return result.data.user;
  },

  logout() {
    removeToken();
  }
};

// Assessment APIs
export const assessmentAPI = {
  async getAllTests() {
    const result = await apiCall<{ success: boolean; data: { tests?: any[]; items?: any[] } }>(
      '/assessments'
    );
    return result.data.tests || result.data.items || [];
  },

  async getBySection() {
    const result = await apiCall<{ success: boolean; data: { sections: any[]; total: number } }>(
      '/assessments/by-section'
    );
    return result.data.sections || [];
  },

  async getTestBySlug(slug: string) {
    const result = await apiCall<{ success: boolean; data: { test?: any; item?: any } }>(
      `/assessments/${slug}`
    );
    return result.data.test || result.data.item;
  },

  async startSession(deviceInfo?: string) {
    const result = await apiCall<{ success: boolean; data: { session?: any; attempt?: any } }>(
      '/assessments/session',
      {
        method: 'POST',
        body: JSON.stringify({
          deviceInfo: deviceInfo || navigator.userAgent,
          ipAddress: 'client'
        }),
      }
    );
    return result.data.session || result.data.attempt;
  },

  async getSession(sessionId: string) {
    const result = await apiCall<{ success: boolean; data: { session?: any; attempt?: any } }>(
      `/assessments/session/${sessionId}`
    );
    return result.data.session || result.data.attempt;
  },

  async completeSession(sessionId: string) {
    const result = await apiCall<{ success: boolean; data: { session?: any; attempt?: any } }>(
      `/assessments/session/${sessionId}/complete`,
      { method: 'PATCH' }
    );
    return result.data.session || result.data.attempt;
  }
};

export interface AudioEvaluationDetail {
  transcript: string;
  expectedAnswer: string;
  isCorrect: boolean;
  status: 'correct' | 'incorrect' | 'unclear';
  confidence: number;
  similarity: number;
  pronunciationScore: number;
  accuracyScore: number;
  fluencyScore: number;
  completenessScore: number;
  errorType: string | null;
  feedback: string;
}

// Response APIs
export const responseAPI = {
  async submitChoice(data: {
    sessionId: string;
    testId: number;
    selectedOption: string;
    responseTimeMs?: number;
  }) {
    const result = await apiCall<{
      success: boolean;
      data: {
        response: any;
        isCorrect: boolean;
        score: number;
        expectedAnswer?: string;
        givenAnswer?: string;
      };
    }>('/responses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return result.data;
  },

  async submitAudio(
    sessionId: string,
    testId: number,
    audioBlob: Blob,
    expectedText?: string,
    responseTimeMs?: number
  ) {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.wav');
    formData.append('sessionId', sessionId);
    formData.append('testId', testId.toString());
    if (expectedText) {
      formData.append('expectedText', expectedText);
    }
    if (responseTimeMs) {
      formData.append('responseTimeMs', responseTimeMs.toString());
    }

    const result = await apiCall<{
      success: boolean;
      data: {
        response: any;
        recording?: any;
        evaluation: AudioEvaluationDetail;
        assessment: {
          transcript: string;
          isCorrect: boolean;
          pronunciationScore: number;
          accuracyScore: number;
          fluencyScore: number;
          completenessScore: number;
          errorType: string | null;
        };
      };
    }>('/responses/audio', {
      method: 'POST',
      body: formData,
    });
    return result.data;
  },

  async getSessionResponses(sessionId: string) {
    const result = await apiCall<{ success: boolean; data: { responses: any[] } }>(
      `/responses/session/${sessionId}`
    );
    return result.data.responses;
  }
};

// Results APIs
export const resultsAPI = {
  async calculateRisk(sessionId: string) {
    const result = await apiCall<{ success: boolean; data: { result: any } }>(
      '/results/calculate',
      {
        method: 'POST',
        body: JSON.stringify({ sessionId }),
      }
    );
    return result.data.result;
  },

  async getResultBySession(sessionId: string) {
    const result = await apiCall<{ success: boolean; data: { result: any } }>(
      `/results/${sessionId}`
    );
    return result.data.result;
  },

  async getUserResults(userId: string) {
    const result = await apiCall<{ success: boolean; data: { results: any[] } }>(
      `/results/user/${userId}`
    );
    return result.data.results;
  }
};

// Dashboard APIs
export const dashboardAPI = {
  async getProgress() {
    const result = await apiCall<{ success: boolean; data: { progress: any } }>(
      '/dashboard/progress'
    );
    return result.data.progress;
  },

  async getRecommendations() {
    const result = await apiCall<{ success: boolean; data: { activities: any[] } }>(
      '/dashboard/recommendations'
    );
    return result.data.activities;
  },

  async getSummary() {
    const result = await apiCall<{ success: boolean; data: { summary: any } }>(
      '/dashboard/summary'
    );
    return result.data.summary;
  }
};

export { getToken, setToken, removeToken };
