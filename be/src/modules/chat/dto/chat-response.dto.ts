// 글로벌 채팅 메시지 응답 DTO
export class GlobalChatMessageResponseDto {
  data: {
    message: string;
    sender: {
      role: string;
      nickname: string;
      profile_image: string | null;
      is_me: boolean;
    };
    timestamp: string;
  };

  constructor(
    message: string,
    senderInfo: { role: string; nickname: string; profile_image: string | null },
    isMe: boolean,
    timestamp: string,
  ) {
    this.data = {
      message,
      sender: {
        role: senderInfo.role,
        nickname: senderInfo.nickname,
        profile_image: senderInfo.profile_image,
        is_me: isMe,
      },
      timestamp,
    };
  }
}

// 로컬 채팅 메시지 응답 DTO
export class LocalChatMessageResponseDto {
  data: {
    room_id: string;
    message: string;
    sender: {
      role: string;
      nickname: string;
      profile_image: string | null;
      is_me: boolean;
    };
    timestamp: string;
  };

  constructor(
    roomId: string,
    message: string,
    senderInfo: { role: string; nickname: string; profile_image: string | null },
    isMe: boolean,
    timestamp: string,
  ) {
    this.data = {
      room_id: roomId,
      message,
      sender: {
        role: senderInfo.role,
        nickname: senderInfo.nickname,
        profile_image: senderInfo.profile_image,
        is_me: isMe,
      },
      timestamp,
    };
  }
}

// 글로벌 채팅 최근 메시지 조회 응답 DTO
export class GlobalChatRecentMessageDto {
  message: string;
  sender: {
    role: string;
    nickname: string;
    profile_image: string;
    is_me: boolean;
  };
  timestamp: string;
}

export class GlobalChatRecentsResponseDto {
  messages: GlobalChatRecentMessageDto[];
  current_participants: number;

  constructor(messages: GlobalChatRecentMessageDto[], currentParticipants: number) {
    this.messages = messages;
    this.current_participants = currentParticipants;
  }
}

// 글로벌 채팅 참여자 수 업데이트 응답 DTO
export class GlobalChatParticipantsUpdatedResponseDto {
  roomId: string;
  current_participants: number;

  constructor(roomId: string, currentParticipants: number) {
    this.roomId = roomId;
    this.current_participants = currentParticipants;
  }
}
