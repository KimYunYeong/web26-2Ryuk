/**
 * WebSocket 이벤트 이름 상수
 */
export const WS_EVENTS = {
  // Socket.io 기본 이벤트
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',

  // 방 관련 이벤트
  ROOM_JOIN: 'room:join',
  ROOM_JOINED: 'room:joined',
  ROOM_LEAVE: 'room:leave',
  ROOM_LEFT: 'room:left',

  // 방 채팅 이벤트
  CHAT_ROOM_SEND: 'chat:room:send',
  CHAT_ROOM_NEW_MESSAGE: 'chat:room:new-message',

  // 글로벌 채팅 이벤트
  CHAT_GLOBAL_JOIN: 'chat:global:join',
  CHAT_GLOBAL_SEND: 'chat:global:send',
  CHAT_GLOBAL_NEW_MESSAGE: 'chat:global:new-message',
  CHAT_GLOBAL_PARTICIPANTS_UPDATED: 'chat:global:participants-updated',
  CHAT_GLOBAL_RECENTS: 'chat:global:recents',

  // 인증 이벤트
  AUTH_LOGOUT: 'auth:logout',
} as const;
