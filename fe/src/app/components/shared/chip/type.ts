export type ChipVariant = 'primary' | 'secondary' | 'outline' | 'default' | 'ghost';
export type ChipSize = 'small' | 'medium' | 'large';
export type ChipButtonVariant = ChipVariant;

export interface ChipProps {
  variant: ChipVariant;
  icon?: string;
  label: string;
  size?: ChipSize;
}

export interface ChipButtonProps {
  variant: ChipButtonVariant;
  icon?: string;
  label: string;
  size?: ChipSize;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  modalId?: string;
}

export interface ToggleChipProps {
  label: string;
  size: ChipSize;
  initialChecked?: boolean;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
}

export type StatusChipStatus = 'success' | 'warning' | 'error';

export interface StatusChipProps {
  status: StatusChipStatus;
  label: string;
  size?: ChipSize;
}
