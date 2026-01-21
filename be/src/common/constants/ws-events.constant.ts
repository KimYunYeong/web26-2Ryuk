/**
 * 인증 관련 이벤트
 */
export const WS_EVENTS_AUTH = {
  LOGOUT: 'auth:logout',
} as const;

/**
 * 채팅 관련 이벤트
 */
export const WS_EVENTS_CHAT = {
  // 수신 이벤트
  GLOBAL_JOIN: 'chat:global:join',
  GLOBAL_SEND: 'chat:global:send',
  ROOM_SEND: 'chat:room:send',

  // 송신 이벤트
  GLOBAL_RECENTS: 'chat:global:recents',
  GLOBAL_PARTICIPANTS_UPDATED: 'chat:global:participants-updated',
  GLOBAL_NEW_MESSAGE: 'chat:global:new-message',
  ROOM_NEW_MESSAGE: 'chat:room:new-message',
} as const;

/**
 * 방(Room) 관련 이벤트
 */
export const WS_EVENTS_ROOM = {
  // 수신 이벤트
  JOIN: 'room:join',
  LEAVE: 'room:leave',

  // 송신 이벤트
  PARTICIPANT_JOIN: 'room:participant:join',
  PARTICIPANT_LEAVE: 'room:participant:leave',
} as const;

/**
 * 게임 관련 이벤트
 */
export const WS_EVENTS_GAME = {
  // 수신 이벤트
  RECRUIT: 'game:recruit',
  JOIN: 'game:join',
  SELECT: 'game:select',
  READY: 'game:ready',
  UNREADY: 'game:unready',
  START: 'game:start',
  CLOSE: 'game:close',
  LEAVE: 'game:leave',
  REALTIME: 'game:realtime',

  // 송신 이벤트
  PARTICIPANT_RECRUIT: 'game:participant:recruit',
  PARTICIPANT_SELECT: 'game:participant:select',
  PARTICIPANT_JOIN: 'game:participant:join',
  PARTICIPANT_READY: 'game:participant:ready',
  PARTICIPANT_UNREADY: 'game:participant:unready',
  PARTICIPANT_START: 'game:participant:start',
  PARTICIPANT_CLOSE: 'game:participant:close',
  PARTICIPANT_LEAVE: 'game:participant:leave',
  PARTICIPANT_REALTIME: 'game:participant:realtime',
} as const;

/**
 * 에러 이벤트
 */
export const WS_EVENTS_ERROR = {
  ERROR: 'error',
} as const;
