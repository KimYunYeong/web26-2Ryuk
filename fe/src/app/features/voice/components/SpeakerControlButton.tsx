'use client';

import { OutlineIconButton } from '@/app/components/shared/icon/IconButton';
import { SpeakerControlButtonProps } from './type';

export default function SpeakerControlButton({
  speakerOn,
  onChange,
  disabled = false,
}: SpeakerControlButtonProps) {
  const handleStateChange = () => {
    if (disabled) return;
    onChange?.(!speakerOn);
  };

  return (
    <OutlineIconButton
      name={speakerOn ? 'volume' : 'mute'}
      size="small"
      themeColor={speakerOn ? 'default' : 'secondary'}
      onClick={handleStateChange}
      disabled={disabled}
    />
  );
}
