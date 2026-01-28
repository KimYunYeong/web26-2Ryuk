/**
 * 브라우저 환경용 MSW 설정
 *
 * 클라이언트 사이드(브라우저)에서 API 요청을 가로채기 위한 Service Worker를 설정합니다.
 * MSWProvider 컴포넌트에서 이 worker를 초기화하여 사용합니다.
 */
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);
