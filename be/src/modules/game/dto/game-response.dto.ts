// 게임 목록 조회
export class GameInfoResponseDto {
  id: string;
  title: string;
  type: string;
  description?: string;
  min_players: number;
  max_players: number;
}

export class GameListResponseDto {
  games: GameInfoResponseDto[];
}

// 게임 참가자 정보
export class GameParticipantDto {
  user_id: string;
  nickname: string;
  profile_image: string;
  is_ready: boolean;
  score?: string;
  rank?: string;
}

// 게임 참가자 정보 (게임 플레이어)
export class GamePlayerDto {
  user_id: string;
  nickname: string;
  profile_image: string;
  is_ready: boolean;
}

// 게임 호스트 정보
export class GameHostDto {
  user_id: string;
  nickname: string;
  profile_image: string;
}

// 게임 정보
export class GameInfoPayloadDto {
  id: string;
  title: string;
  description?: string;
  type: string;
  min_players: string;
  max_players: string;
}

// 게임 선택 브로드캐스트
export class GameSelectBroadcastDto {
  game: GameInfoPayloadDto;
}

// 게임 참가 응답
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

// 게임 준비 완료 브로드캐스트
export class GameReadyBroadcastDto {
  player_id: string;
  is_ready: boolean;
}

// 게임 시작 브로드캐스트
export class GameStartBroadcastDto {
  start_time: string;
}

// 게임 닫기 브로드캐스트
export class GameCloseBroadcastDto {
  is_game_recruiting: boolean;

  constructor(isGameRecruiting: boolean) {
    this.is_game_recruiting = isGameRecruiting;
  }
}

// 게임 실시간 상태 브로드캐스트
export class GameRealtimeBroadcastDto {
  highest_score: string;
  average_score: string;
  ranks: string[];
}
