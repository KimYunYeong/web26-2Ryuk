'use client';

import { useEffect } from 'react';
import { WebSocketService } from '@/app/services/websocket.service';

// 앱 로드 직후 한 번 connect()를 호출해서 미리 소켓을 연결함
// 사용자가 방 입장/채팅/음성 등 WS가 필요한 행동을 할 때,
// 이미 연결된 상태일 가능성이 높아져, 첫 동작에서 연결 대기 시간 감소
export default function WebSocketInitializer() {
  useEffect(() => WebSocketService.connect(), []);
  return null;
}
