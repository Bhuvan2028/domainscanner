export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface CustomRequestInit extends RequestInit {
  timeout?: number;
}

/**
 * A wrapper around the built-in fetch API to handle common tasks
 * like setting headers, handling JSON response, and error catching.
 */
export async function apiFetch<T>(endpoint: string, options: CustomRequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Create AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeout || 60000); // Dynamic timeout or 60s default
  
  // Try to get auth token from localStorage if we had authentication
  // const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('accept', 'application/json');
  
  // if (token) {
  //   headers.set('Authorization', `Bearer ${token}`);
  // }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    let data;
    try {
      data = await response.json();
    } catch (error) {
      // If response is not JSON
      data = null;
    }

    if (!response.ok) {
      const errorMessage = data?.detail || data?.message || response.statusText;
      throw new Error(errorMessage);
    }

    return data as T;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection.');
    }
    throw error;
  }
}
