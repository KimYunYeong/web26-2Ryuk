export class GameInfoResponseDto {
  id: string;
  title: string;
  type: string;
  description?: string;
  min_participants: number;
  max_participants: number;
}

export class GameListResponseDto {
  games: GameInfoResponseDto[];
}

export class GameParticipantDto {
  user_id: string;
  nickname: string;
  profile_image: string;
  is_ready: boolean;
  score?: string;
  rank?: string;
}

export class GamePlayerDto {
  nickname: string;
  profile_image: string;
  is_ready: boolean;
}

export class GameHostDto {
  nickname: string;
  profile_image: string;
}

export class GameInfoPayloadDto {
  id: string;
  title: string;
  description?: string;
  type: string;
  min_participants: string;
  max_participants: string;
}

export class GameJoinAckResponseDto {
  current_players: string;
  max_players: string;
  host: GameHostDto;
  players: GamePlayerDto[];
  game?: GameInfoPayloadDto;

  constructor(
    currentPlayers: number,
    maxPlayers: number,
    host: GameHostDto,
    players: GamePlayerDto[],
    game?: GameInfoPayloadDto,
  ) {
    this.current_players = currentPlayers.toString();
    this.max_players = maxPlayers.toString();
    this.host = host;
    this.players = players;
    if (game) {
      this.game = game;
    }
  }
}
