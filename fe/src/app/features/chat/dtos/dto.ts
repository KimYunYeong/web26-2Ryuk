// WebSocket DTOs

export type ChatReceiveDto = {
  message: string;
  sender: {
    role: string;
    nickname: string;
    profile_image?: string;
    is_me: boolean;
  };
  timestamp: string;
  room_id?: string;
  user_id?: string;
};

export type ChatSendDto = {
  message: string;
  room_id?: string;
};

export type ChatGlobalSendDto = {
  message: string;
};

export type ChatGlobalNewMessageDto = {
  message: string;
  sender: {
    role: string;
    nickname: string;
    profile_image?: string;
    is_me: boolean;
  };
  timestamp: string;
};

export type ChatGlobalParticipantsUpdatedDto = {
  room_id: string;
  current_participants: string;
};

export type ChatRoomSendDto = {
  room_id: string;
  message: string;
};

export type ChatRoomNewMessageDto = {
  room_id: string;
  message: string;
  sender: {
    role: string;
    nickname: string;
    profile_image?: string;
    is_me: boolean;
  };
  timestamp: string;
};

export type GlobalChatRecentsDto = {
  messages: ChatReceiveDto[];
  current_participants?: number;
};
