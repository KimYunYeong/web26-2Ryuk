import { RoomDto, RoomData, RoomCreationDto, RoomCreationData } from './type';
export class RoomConverter {
  static toData(dto: RoomDto): RoomData {
    return {
      id: dto.id,
      title: dto.title,
      tags: dto.tags,
      hostId: dto.host_id,
      currentParticipants: dto.current_participants,
      maxParticipants: dto.max_participants,
      isMicAvailable: dto.is_mic_available,
      isPrivate: dto.is_private,
      participantProfileImages: dto.participant_profile_images,
      createDate: new Date(dto.create_date),
    };
  }
  static toDto(data: RoomData): RoomDto {
    return {
      id: data.id,
      title: data.title,
      tags: data.tags,
      host_id: data.hostId,
      current_participants: data.currentParticipants,
      max_participants: data.maxParticipants,
      is_mic_available: data.isMicAvailable,
      is_private: data.isPrivate,
      participant_profile_images: data.participantProfileImages,
      create_date: data.createDate.toISOString(),
    };
  }
  static creationToDto(data: RoomCreationData): RoomCreationDto {
    return {
      title: data.title,
      tags: data.tags,
      max_participants: data.maxParticipants,
      is_mic_available: data.isMicAvailable,
      is_private: data.isPrivate,
      password: data.password,
    };
  }
  static creationToData(dto: RoomCreationDto): RoomCreationData {
    return {
      title: dto.title,
      tags: dto.tags,
      maxParticipants: dto.max_participants,
      isMicAvailable: dto.is_mic_available,
      isPrivate: dto.is_private,
      password: dto.password,
    };
  }
}
