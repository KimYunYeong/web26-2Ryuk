import { ChatReceiveData } from '@/app/features/chat/dtos/type';

export type ChatPanelType = 'global' | 'local';

export interface ChatBubblesProps {
  chats: ChatReceiveData[];
}

export interface ChatPanelHeaderProps {
  iconName: string;
  type: ChatPanelType;
  participantCount: number;
  isCollapsed: boolean;
  onToggle: () => void;
  headerChildren?: React.ReactNode;
  isConnected?: boolean;
}

export interface ChatPanelProps {
  iconName: string;
  type: ChatPanelType;
  participantCount: number;
  chats: ChatReceiveData[];
  onMessageSubmit?: (message: string) => void;
  headerChildren?: React.ReactNode;
  participantsAvatars?: React.ReactNode;
  isConnected?: boolean;
  disabled?: boolean;
}

export interface GlobalChatHeaderProps {
  onlineCount: number;
  isCollapsed: boolean;
  onToggle: () => void;
}

export interface GlobalChatProps {
  chats: ChatReceiveData[];
  onlineCount: number;
  onMessageSubmit?: (message: string) => void;
  isConnected?: boolean;
}

export interface RoomChatPanelProps {
  participantCount: number;
  chats: ChatReceiveData[];
  onMessageSubmit?: (message: string) => void;
  onMicToggle?: () => void;
  onSpeakerToggle?: () => void;
}
