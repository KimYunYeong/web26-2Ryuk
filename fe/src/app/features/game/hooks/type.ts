import { GamePlayerData } from '@/app/features/game/dtos/data';

export interface UseGameResult {
  myStatus: GamePlayerData;
  gamePlayers: GamePlayerData[];
  isGameRecruiting: boolean;
  isReadyModalOpen: boolean;
  handleGameRecruitClick: () => Promise<void>;
  handleReadyChange: (isReady: boolean) => Promise<void>;
  handleLeaveGame: () => Promise<void>;
  handleCloseGame: () => Promise<void>;
}
