'use client';

import { useState } from 'react';
import { AudioControlsProps } from './type';
import styles from './audioControlButtons.module.css';
import { IconButtonBase } from '@/app/components/shared/icon/IconButton';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { IconVariant as _IconVariant } from '@/app/components/shared/icon/type';

export default function AudioControlButtons({
  initialMicState = true,
  initialSpeakerState = true,
  onMicChange,
  onSpeakerChange,
}: AudioControlsProps) {
  const [micState, setMicState] = useState(initialMicState);
  const [speakerState, setSpeakerState] = useState(initialSpeakerState);

  const handleMicToggle = () => {
    setMicState((prev) => !prev);
    onMicChange?.(micState);
  };

  const handleSpeakerToggle = () => {
    if (micState) setMicState(false);
    setSpeakerState((prev) => !prev);
    onSpeakerChange?.(speakerState);
  };

  const getMicThemeColor = () => {
    if (!micState) return speakerState ? 'secondary' : 'error-secondary';
    return 'outline';
  };

  const getSpeakerThemeColor = () => {
    if (!speakerState) return 'error-secondary';
    return 'outline';
  };

  return (
    <div className={styles.audioControls}>
      <IconButtonBase
        name={micState ? 'mic' : 'micoff'}
        size="small"
        variant={getMicThemeColor()}
        onClick={handleMicToggle}
      />
      <IconButtonBase
        name={speakerState ? 'volume' : 'mute'}
        size="small"
        variant={getSpeakerThemeColor()}
        onClick={handleSpeakerToggle}
      />
    </div>
  );
}
