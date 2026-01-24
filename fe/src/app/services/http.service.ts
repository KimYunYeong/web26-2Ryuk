import IS from '@/utils/is';
import { ApiResponse } from '@/app/features/room/services/type';
import { toastStore } from '@/app/components/shared/toast/toast.store';
import { goHome } from '@/app/hooks/useNavigation';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export function isApiResponse(value: unknown): value is ApiResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    'message' in value &&
    typeof (value as ApiResponse).success === 'boolean'
  );
}

export class HttpService {
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
    const response = await fetch(url, requestInit);

    // 204 No Content 응답 처리
    if (response.status === 204) {
      return { success: true, message: 'No Content' } as T;
    }

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const text = await response.text();
      if (!text || text.trim() === '') return {} as T;
      const parsed = JSON.parse(text) as T;

      // ApiResponse 형식이고 success가 false 이면 Toast 표시
      if (!response.ok && isApiResponse(parsed) && !parsed.success) {
        const errorMessage = parsed.message || '요청에 실패했습니다.';
        toastStore.getState().showErrorToast(errorMessage);
        goHome();
        throw new Error(errorMessage);
      }

      return parsed;
    }

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
