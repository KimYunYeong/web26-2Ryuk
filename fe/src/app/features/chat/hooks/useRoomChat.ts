import { useState, useEffect } from 'react';
import { roomChatService } from '../services/RoomChatService';
import { ChatReceiveData } from '../dtos/type';

export function useRoomChat(roomId: string | null, isJoined: boolean) {
  const [chats, setChats] = useState<ChatReceiveData[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!roomId || !isJoined) {
      setIsConnected(false);
      setChats([]);
      return;
    }

    const initializeRoomChat = async () => {
      await roomChatService.subscribe(roomId);
      setIsConnected(roomChatService.isConnected());

      const savedMessages = roomChatService.getMessages();
      if (savedMessages.length > 0) setChats(savedMessages);
    };

    initializeRoomChat().catch(() => setIsConnected(false));

    // 메시지 수신 콜백 등록
    const unsubscribeMessage = roomChatService.onMessage((message: ChatReceiveData) => {
      setChats((prev) => [...prev, message]);
    });

    // 연결 상태 변경 콜백 등록
    const unsubscribeConnection = roomChatService.onConnectionChange(setIsConnected);

    return () => {
      unsubscribeMessage();
      unsubscribeConnection();
    };
  }, [roomId, isJoined]);

  return { chats, isConnected };
}
