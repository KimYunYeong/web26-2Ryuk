export interface DialogProps {
  modalId: string;
  src: string;
  title: string;
  content: string;
  onCancel?: () => void;
  onConfirm?: () => void;
}
