// Websocket Data

export type ChatReceiveData = {
  message: string;
  sender: {
    role: string;
    nickname: string;
    profileImage?: string;
    isMe: boolean;
  };
  timestamp: Date;
  roomId?: string;
  userId?: string;
};

export type ChatSendData = {
  message: string;
  roomId?: string;
};

export type ChatGlobalSendData = {
  message: string;
};

export type ChatGlobalNewMessageData = {
  message: string;
  sender: {
    role: string;
    nickname: string;
    profileImage?: string;
    isMe: boolean;
  };
  timestamp: Date;
};

export type ChatGlobalParticipantsUpdatedData = {
  roomId: string;
  currentParticipants: number;
};

export type ChatRoomSendData = {
  roomId: string;
  message: string;
};

export type ChatRoomNewMessageData = {
  roomId: string;
  message: string;
  sender: {
    role: string;
    nickname: string;
    profileImage?: string;
    isMe: boolean;
  };
  timestamp: Date;
};

export type GlobalChatRecentsData = {
  messages: ChatReceiveData[];
  currentParticipants?: number;
};
