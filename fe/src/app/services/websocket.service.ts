import IS from '@/utils/is';
import { io, Socket } from 'socket.io-client';

export class WebSocketService {
  private static socket: Socket | null = null;

  /**
   * WebSocket 연결
   * @param url 서버 URL
   * @param userId Mock 인증에서 사용할 userId
   * @param onMessage 메시지 수신 콜백
   * @param onError 에러 콜백
   */
  static connect(
    url: string,
    userId?: string,
    onMessage?: (data: unknown) => void,
    onError?: (error: Error) => void,
  ): void {
    // 이미 연결되어 있으면 재연결
    if (this.socket?.connected) this.disconnect();

    const connectionOptions: any = {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 100, // 재연결 지연 시간을 100ms로 단축
      reconnectionDelayMax: 1000, // 최대 재연결 지연 시간
      reconnectionAttempts: 10, // 재연결 시도 횟수 증가
      timeout: 5000, // 연결 타임아웃 5초
    };

    // Mock 인증: query.userId 또는 auth.token 사용
    if (userId) connectionOptions.query = { userId };
    else {
      const mockToken = this.getMockToken();
      if (mockToken) connectionOptions.auth = { token: mockToken };
    }

    this.socket = io(url, connectionOptions);

    // 이벤트 리스너 설정
    this.socket.on('connect', () => {
      console.log('WebSocket connected:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason: any) => {
      console.log('WebSocket disconnected:', reason);
    });

    this.socket.on('connect_error', (error: any) => {
      console.error('WebSocket connection error:', error);
      if (onError) onError(error);
    });

    // 모든 이벤트를 onMessage로 전달
    if (onMessage) {
      this.socket.onAny((event: string, ...args: any[]) => onMessage({ event, data: args }));
    }
  }

  /**
   * Socket 인스턴스 가져오기 (이벤트 핸들러 등록용)
   */
  static getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * WebSocket 연결 해제
   */
  static disconnect(): void {
    if (!this.socket) return;
    this.socket.disconnect();
    this.socket = null;
  }

  /**
   * 메시지 전송
   * @param event 이벤트 이름
   * @param data 전송할 데이터
   */
  static send(event: string, data?: unknown): void {
    if (!this.socket?.connected) {
      console.error('WebSocket is not connected');
      return;
    }
    this.socket.emit(event, data);
  }

  /**
   * 연결 상태 확인
   */
  static isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Mock 토큰 가져오기 (authStore에서)
   */
  private static getMockToken(): string | null {
    if (IS.undefined(window)) return null;
    try {
      const { authStore } = require('@/app/features/user/stores/auth');
      const token = authStore.getState().token;
      return token || localStorage.getItem('mock_token');
    } catch {
      return localStorage.getItem('mock_token');
    }
  }

  /**
   * Mock 토큰 저장
   */
  static setMockToken(token: string): void {
    if (IS.undefined(window)) return;
    localStorage.setItem('mock_token', token);
  }

  /**
   * 특정 이벤트 리스너 등록
   */
  static on(event: string, callback: (...args: any[]) => void): void {
    if (!this.socket) {
      // socket이 생성될 때까지 대기 후 등록
      const checkAndRegister = () => {
        if (!this.socket) {
          setTimeout(checkAndRegister, 10);
          return;
        }

        this.socket.on(event, callback);
        if (event === 'connect' && this.socket.connected) callback();
      };
      checkAndRegister();
      return;
    }

    this.socket.on(event, callback);
    if (event === 'connect' && this.socket.connected) callback();
  }

  /**
   * 특정 이벤트 리스너 제거
   */
  static off(event: string, callback?: (...args: any[]) => void): void {
    if (!this.socket) return;
    if (callback) this.socket.off(event, callback);
    else this.socket.removeAllListeners(event);
  }
}
