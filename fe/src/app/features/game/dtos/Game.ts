import { GameData, GameDto, GameType } from './type';

export class GameConverter {
  static toData(dto: GameDto): GameData {
    return {
      id: dto.id,
      title: dto.title,
      type: dto.type as GameType,
      description: dto.description,
      minParticipants: dto.min_participants,
      maxParticipants: dto.max_participants,
    };
  }

  static toDto(data: GameData): GameDto {
    return {
      id: data.id,
      title: data.title,
      type: data.type,
      description: data.description,
      min_participants: data.minParticipants,
      max_participants: data.maxParticipants,
    };
  }
}
