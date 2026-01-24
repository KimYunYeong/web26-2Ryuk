import { RoomJoinInfoData } from '@/app/features/room/dtos/data';
import { RoomData } from '@/app/features/room/dtos/data';
import { UseGameResult } from '@/app/features/game/hooks/type';

export interface UseRoomResult {
  roomData?: RoomData;
  roomJoinInfoData?: RoomJoinInfoData;
  isHost: boolean;
  showPasswordAuth: boolean;
  handlePasswordConfirm: (password: string) => Promise<void>;
  handlePasswordCancel: () => void;
  game: UseGameResult;
}
