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
  ROOM_JOIN_ACK: 'room:join:ack',
  ROOM_LEAVE: 'room:leave',
  ROOM_LEAVE_ACK: 'room:leave:ack',
  ROOM_PARTICIPANT_LEFT: 'room:participant:left',
  ROOM_PARTICIPANT_JOINED: 'room:participant:joined',

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

  // 게임 모집 이벤트
  GAME_RECRUIT: 'game:recruit',
  GAME_RECRUIT_ACK: 'game:recruit:ack',
  GAME_RECRUIT_STARTED: 'game:recruit:started',
  GAME_JOIN: 'game:join',
  GAME_JOIN_ACK: 'game:join:ack',
  GAME_PARTICIPANT_JOINED: 'game:participant:joined',
  GAME_LEAVE: 'game:leave',
  GAME_PARTICIPANT_LEAVE: 'game:participant:leave',
  GAME_JOIN_FAILED: 'game:join:failed',
  GAME_STATE: 'game:state',
  GAME_STATE_ACK: 'game:state:ack',
} as const;
