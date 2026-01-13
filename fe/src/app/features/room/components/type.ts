import { RoomEditData, RoomData } from '../dtos/type';

export interface RoomCardProps extends RoomData {}

export interface RoomGridProps {
  rooms: RoomData[];
}

export interface RealtimeRoomsSectionProps {
  rooms?: RoomData[];
  onSearch?: (query: string) => void;
}

export interface PasswordSettingProps {
  initialChecked: boolean;
  onChangeChecked?: (checked: boolean) => void;
  initialPassword: string;
  onChangePassword?: (password: string) => void;
}

export interface RoomEditFormProps {
  initialData?: Partial<RoomEditData>;
  onSubmit?: (data: RoomEditData) => void;
  onCancel?: () => void;
  submitText: string;
}

export interface RoomInfoProps {
  title: string;
  tags: string[];
  isHost: boolean;
  onEditClick?: () => void;
}

export interface RoomInfoWithModalProps {
  roomId: string;
  title: string;
  tags: string[];
  maxParticipants: number;
  isMicAvailable: boolean;
  isPrivate: boolean;
  password?: string;
  isHost: boolean;
  onUpdate?: (data: RoomEditData) => void;
}

export interface RoomGoBackButtonProps {
  roomId: string;
}
