import { RoomCreationData, RoomData } from '../dtos/type';

export interface RoomCardProps extends RoomData {}

export interface RoomGridProps {
  rooms: RoomData[];
}

export interface RealtimeRoomsSectionProps {
  rooms: RoomData[];
  onSearch?: (query: string) => void;
}

export interface PasswordSettingProps {
  initialChecked: boolean;
  onChangeChecked?: (checked: boolean) => void;
  initialPassword: string;
  onChangePassword?: (password: string) => void;
}

export interface RoomCreationFormProps {
  initialData?: Partial<RoomCreationData>;
  onSubmit?: (data: RoomCreationData) => void;
  onCancel?: () => void;
}

export interface RoomInfoProps {
  title: string;
  tags: string[];
  isHost: boolean;
  onEditClick?: () => void;
}
