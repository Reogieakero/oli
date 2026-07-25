const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1';

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  authenticated?: boolean;
}

async function getAccessToken(): Promise<string | null> {
  const match = document.cookie.match(/(?:^|;\s*)access_token=([^;]*)/);
  return match ? match[1] : null;
}

export class ApiError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

export async function apiClient<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = 'GET', body, headers = {}, authenticated = false } = options;

  const isFormData = body instanceof FormData;

  const requestHeaders: Record<string, string> = {
    ...headers,
  };

  if (!isFormData) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  if (authenticated) {
    const token = await getAccessToken();
    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: requestHeaders,
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    const message = errorBody?.error?.message || `Request failed with status ${res.status}`;
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}
