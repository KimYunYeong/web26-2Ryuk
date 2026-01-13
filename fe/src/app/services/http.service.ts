import IS from '@/utils/is';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

const MSW_HANDLED_PATHS: string[] = [
  '/api/rooms/all',
  '/api/rooms/:roomId',
  '/api/rooms/:id',
  '/api/posts/popular',
  '/api/users/:userId/profile',
  '/api/rooms',
];

function isMswHandled(path: string): boolean {
  if (MSW_HANDLED_PATHS.includes(path)) return true;

  return MSW_HANDLED_PATHS.some((pattern) => {
    const regexPattern = pattern.replace(/:[^/]+/g, '[^/]+');
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(path);
  });
}

export class HttpService {
  private static getBaseUrl(url: string): string {
    if (typeof window === 'undefined') {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      return apiUrl && apiUrl.trim() !== '' ? apiUrl : '';
    }

    if (process.env.NODE_ENV === 'development') {
      if (isMswHandled(url)) return '';
      return 'http://localhost:4000';
    }

    return '';
  }

  private static async request<T>(
    url: string,
    method: HttpMethod,
    body?: unknown,
    token?: string,
  ): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const requestInit: RequestInit = {
      method,
      headers,
      credentials: 'include',
    };

    if (!IS.nil(body)) requestInit.body = JSON.stringify(body);

    const baseUrl = this.getBaseUrl(url);
    const fullUrl = baseUrl ? baseUrl + url : url;

    const response = await fetch(fullUrl, requestInit);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) return response.json();

    return response.text() as T;
  }

  static async get<T>(url: string, token?: string): Promise<T> {
    return this.request<T>(url, 'GET', undefined, token);
  }

  static async post<T>(url: string, data?: unknown, token?: string): Promise<T> {
    return this.request<T>(url, 'POST', data, token);
  }

  static async put<T>(url: string, data?: unknown, token?: string): Promise<T> {
    return this.request<T>(url, 'PUT', data, token);
  }

  static async patch<T>(url: string, data?: unknown, token?: string): Promise<T> {
    return this.request<T>(url, 'PATCH', data, token);
  }

  static async delete<T>(url: string, token?: string): Promise<T> {
    return this.request<T>(url, 'DELETE', undefined, token);
  }
}
