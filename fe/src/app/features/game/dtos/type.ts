export type GameType = 'competition' | 'cooperation';

export interface GameDto {
  id: string;
  title: string;
  type: string;
  description: string;
  min_participants: number;
  max_participants: number;
}

export interface GameData {
  id: string;
  title: string;
  type: GameType;
  description: string;
  minParticipants: number;
  maxParticipants: number;
}
