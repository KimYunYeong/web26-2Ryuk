'use client';

import { useEffect, useState, useCallback } from 'react';
import { globalChatService } from '@/app/features/chat/services/GlobalChatService';
import { ChatReceiveData } from '@/app/features/chat/dtos/type';
import { authStore, type AuthStore } from '@/app/features/user/stores/auth';
import ChatPanel from './ChatPanel';

/**
 * GlobalChat 클라이언트 컴포넌트
 * WebSocket 연결 및 메시지 관리 담당
 */
export default function GlobalChatPanel() {
  const [chats, setChats] = useState<ChatReceiveData[]>([]);
  const [currentParticipants, setCurrentParticipants] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  // WebSocket 연결 및 구독
  useEffect(() => {
    // GlobalChatService를 통해 WebSocket 연결 및 구독
    globalChatService.subscribe();

    // 저장된 메시지 복원 (subscribe() 후에 호출)
    const savedMessages = globalChatService.getMessages();
    if (savedMessages.length > 0) setChats(savedMessages);

    // 메시지 수신 콜백 등록
    const unsubscribeMessage = globalChatService.onMessage((message) =>
      setChats((prev) => [...prev, message]),
    );

    // 연결 상태 변경 콜백 등록
    const unsubscribeConnection = globalChatService.onConnectionChange((connected) =>
      setIsConnected(connected),
    );

    // 참여자 수 변경 콜백 등록 (브로드캐스트 받은 데이터로 업데이트)
    const unsubscribeParticipants = globalChatService.onParticipantsChange((count) =>
      setCurrentParticipants(count),
    );

    // 초기 연결 상태 설정
    setIsConnected(globalChatService.isConnected());

    // 정리 함수
    return () => {
      unsubscribeMessage();
      unsubscribeConnection();
      unsubscribeParticipants();
      globalChatService.unsubscribe();
    };
  }, []);

  // 메시지 전송 핸들러
  const handleMessageSubmit = useCallback((message: string) => {
    globalChatService.sendMessage(message);
  }, []);

  const isAuthenticated = authStore((state: AuthStore) => state.isAuthenticated);

  return (
    <ChatPanel
      iconName="globe"
      type="global"
      participantCount={currentParticipants}
      chats={chats}
      onMessageSubmit={handleMessageSubmit}
      isConnected={isConnected}
      disabled={!isConnected || !isAuthenticated}
    />
  );
}
