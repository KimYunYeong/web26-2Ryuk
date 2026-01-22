export interface SpeakerControlButtonProps {
  initialState?: boolean;
  onChange?: (state: boolean) => void;
}

export interface AudioControlsProps {
  micOn?: boolean;
  speakerOn?: boolean;
  onMicChange?: (state: boolean) => void;
  onSpeakerChange?: (state: boolean) => void;
}
