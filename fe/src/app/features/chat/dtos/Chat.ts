import { ChatReceiveDto, ChatReceiveData, ChatSendDto, ChatSendData } from './type';

export const ChatConverter = {
  /**
   * WebSocket 수신 DTO를 ChatReceiveData로 변환
   * @param dto WebSocket 이벤트에서 받은 DTO
   */
  toReceiveData(dto: ChatReceiveDto): ChatReceiveData {
    return {
      id: `chat_${Date.now()}_${Math.random()}`,
      message: dto.message,
      sender: {
        role: dto.sender.role,
        nickname: dto.sender.nickname,
        profileImage: dto.sender.profile_image,
        isMe: dto.sender.is_me,
      },
      timestamp: new Date(dto.timestamp),
      roomId: dto.room_id,
    };
  },

  /**
   * ChatReceiveData를 WebSocket 수신 DTO로 변환
   * @param data ChatReceiveData
   */
  toReceiveDto(data: ChatReceiveData): ChatReceiveDto {
    return {
      message: data.message,
      sender: {
        role: data.sender.role,
        nickname: data.sender.nickname,
        profile_image: data.sender.profileImage,
        is_me: data.sender.isMe,
      },
      timestamp: data.timestamp.toISOString(),
      room_id: data.roomId,
      user_id: undefined,
    };
  },

  /**
   * ChatSendData를 WebSocket 전송 DTO로 변환
   * @param data ChatSendData
   */
  toSendDto(data: ChatSendData): ChatSendDto {
    return { message: data.message };
  },

  /**
   * ChatSendDto를 ChatSendData로 변환
   * @param dto ChatSendDto
   */
  toSendData(dto: ChatSendDto): ChatSendData {
    return { message: dto.message };
  },
};
