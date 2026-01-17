import type { ApiResponse, CreatePromptRequest, User } from '@/types';
import { API_BASE_URL } from '@/types';
import { getAuthToken } from './storage';

const API_BASE = API_BASE_URL;

// Generic API request handler
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = await getAuthToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API request failed:', error);
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: 'Failed to connect to server',
      },
    };
  }
}

// Auth endpoints (using extension-specific endpoints with CORS)
export async function login(
  email: string,
  password: string
): Promise<ApiResponse<{ user: User; token?: string }>> {
  return apiRequest('/api/extension/auth', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function logout(): Promise<ApiResponse<void>> {
  // Extension logout just clears local storage, no API call needed
  return { success: true };
}

export async function getCurrentUser(): Promise<ApiResponse<{ user: User }>> {
  return apiRequest('/api/extension/auth');
}

// Prompt endpoints (using extension-specific endpoints with CORS)
export async function createPrompt(
  data: CreatePromptRequest
): Promise<ApiResponse<{ id: string; slug: string }>> {
  return apiRequest('/api/extension/prompts', {
    method: 'POST',
    body: JSON.stringify({
      ...data,
      metadata: {
        ...data.metadata,
        submissionSource: 'extension',
      },
    }),
  });
}

// Upload external image (downloads image from URL and uploads to our storage)
export async function uploadExternalImage(
  imageUrl: string
): Promise<ApiResponse<{ url: string }>> {
  return apiRequest('/api/extension/upload-external', {
    method: 'POST',
    body: JSON.stringify({ imageUrl }),
  });
}

// Check if API is available
export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/api/health`);
    return response.ok;
  } catch {
    return false;
  }
}
