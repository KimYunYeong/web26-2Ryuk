import { GameDto } from '@/app/features/game/dtos/type';

export interface GameCardProps extends GameDto {
  onSelect?: (id: string) => void;
}
