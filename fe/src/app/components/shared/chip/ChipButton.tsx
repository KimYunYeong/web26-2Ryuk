import styles from './chip.module.css';
import { ChipButtonProps } from './type';
import { ChipBase } from './Chip';

function ChipButtonBase({
  variant,
  icon,
  label,
  size = 'medium',
  onClick,
  disabled = false,
  type = 'button',
  modalId,
}: ChipButtonProps) {
  return (
    <button
      type={type}
      className={styles.chipButton}
      onClick={onClick}
      disabled={disabled}
      modal-id={modalId}
    >
      <ChipBase label={label} icon={icon} size={size} variant={variant} />
    </button>
  );
}

export function PrimaryChipButton(props: Omit<ChipButtonProps, 'variant'>) {
  return <ChipButtonBase {...props} variant="primary" />;
}

export function SecondaryChipButton(props: Omit<ChipButtonProps, 'variant'>) {
  return <ChipButtonBase {...props} variant="secondary" />;
}

export function OutlineChipButton(props: Omit<ChipButtonProps, 'variant'>) {
  return <ChipButtonBase {...props} variant="outline" />;
}

export function GhostChipButton(props: Omit<ChipButtonProps, 'variant'>) {
  return <ChipButtonBase {...props} variant="ghost" />;
}

export function DefaultChipButton(props: Omit<ChipButtonProps, 'variant'>) {
  return <ChipButtonBase {...props} variant="default" />;
}

export {
  PrimaryChipButton as Primary,
  SecondaryChipButton as Secondary,
  OutlineChipButton as Outline,
  GhostChipButton as Ghost,
  DefaultChipButton as Default,
} from './ChipButton';
