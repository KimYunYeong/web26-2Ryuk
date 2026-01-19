// WebSocket 채팅 메시지 수신 DTO
export interface ChatReceiveDto {
  message: string;
  sender: {
    role: string;
    nickname: string;
    profile_image: string | null;
    is_me: boolean;
  };
  timestamp: string;
  room_id?: string;
  user_id?: string;
}

// WebSocket 채팅 메시지 수신 데이터
export interface ChatReceiveData {
  id: string;
  message: string;
  sender: {
    role: string;
    nickname: string;
    profileImage: string | null;
    isMe: boolean;
  };
  timestamp: Date;
  roomId?: string;
}

// WebSocket 채팅 메시지 전송 DTO
export interface ChatSendDto {
  message: string;
}

// WebSocket 채팅 메시지 전송 데이터
export interface ChatSendData {
  message: string;
}
