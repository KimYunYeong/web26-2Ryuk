/**
 * 애플리케이션 라우트 상수 정의
 *
 * 모든 경로 문자열을 중앙에서 관리하여 하드코딩 방지
 * 동적 경로의 경우 함수로 제공
 */
export const ROUTES = {
  // 메인 페이지
  HOME: '/home',

  // 컴포넌트 페이지
  COMPONENTS: {
    ROOT: '/components',
    GLOBAL: '/components/global',
    FEATURE: '/components/feature',
    SHARED: '/components/shared',
    PAGE: '/components/page',
  },

  // 동적 경로 생성 함수
  post: (id: string | number) => `/post/${id}`,
  room: (id: string | number) => `/room/${id}`,
  game: (roomId: string | number, gameId: string | number) => `/room/${roomId}/game/${gameId}`,
  profile: (id: string | number) => `/profile/${id}`,
} as const;
