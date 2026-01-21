import {
  ChatGlobalNewMessageDto,
  ChatGlobalParticipantsUpdatedDto,
  ChatGlobalSendDto,
  ChatReceiveDto,
  ChatRoomNewMessageDto,
  ChatRoomSendDto,
  GlobalChatRecentsDto,
} from './dto';
import {
  ChatGlobalNewMessageData,
  ChatGlobalParticipantsUpdatedData,
  ChatGlobalSendData,
  ChatReceiveData,
  ChatRoomNewMessageData,
  ChatRoomSendData,
  GlobalChatRecentsData,
  ChatSendData,
} from './data';

export const toGlobalSendDto = (data: ChatGlobalSendData): ChatGlobalSendDto => ({
  message: data.message,
});

export const toGlobalNewMessageData = (dto: ChatGlobalNewMessageDto): ChatGlobalNewMessageData => ({
  message: dto.message,
  sender: {
    role: dto.sender.role,
    nickname: dto.sender.nickname,
    profileImage: dto.sender.profile_image,
    isMe: dto.sender.is_me,
  },
  timestamp: new Date(dto.timestamp),
});

export const toGlobalParticipantsUpdatedData = (
  dto: ChatGlobalParticipantsUpdatedDto,
): ChatGlobalParticipantsUpdatedData => ({
  roomId: dto.room_id,
  currentParticipants: Number(dto.current_participants),
});

export const toRoomSendDto = (data: ChatRoomSendData): ChatRoomSendDto => ({
  room_id: data.roomId,
  message: data.message,
});

export const toRoomNewMessageData = (dto: ChatRoomNewMessageDto): ChatRoomNewMessageData => ({
  roomId: dto.room_id,
  message: dto.message,
  sender: {
    role: dto.sender.role,
    nickname: dto.sender.nickname,
    profileImage: dto.sender.profile_image,
    isMe: dto.sender.is_me,
  },
  timestamp: new Date(dto.timestamp),
});

export const toReceiveData = (dto: ChatReceiveDto): ChatReceiveData => ({
  message: dto.message,
  sender: {
    role: dto.sender.role,
    nickname: dto.sender.nickname,
    profileImage: dto.sender.profile_image,
    isMe: dto.sender.is_me,
  },
  timestamp: new Date(dto.timestamp),
  roomId: dto.room_id,
  userId: dto.user_id,
});

export const toGlobalChatRecentsData = (dto: GlobalChatRecentsDto): GlobalChatRecentsData => ({
  messages: dto.messages.map(toReceiveData),
  currentParticipants: dto.current_participants,
});

export const toSendDto = (data: ChatSendData): ChatRoomSendDto | ChatGlobalSendDto => {
  if (data.roomId) {
    return {
      room_id: data.roomId,
      message: data.message,
    };
  }

  return {
    message: data.message,
  };
};

export const ChatConverter = {
  toReceiveData,
  toSendDto,
  toGlobalNewMessageData,
  toRoomNewMessageData,
};
