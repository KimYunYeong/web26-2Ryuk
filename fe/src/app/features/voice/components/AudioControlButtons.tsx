'use client';

import { AudioControlsProps } from './type';
import styles from './audioControlButtons.module.css';
import { OutlineIconButton } from '@/app/components/shared/icon/IconButton';

export default function AudioControlButtons({
  micOn, // 현재 마이크 상태 (true/false)
  speakerOn, // 현재 스피커 상태
  onMicChange, // 상태 변경 핸들러
  onSpeakerChange,
}: AudioControlsProps) {
  const handleMicToggle = () => {
    onMicChange?.(!micOn);
  };

  const handleSpeakerToggle = () => {
    onSpeakerChange?.(!speakerOn);
  };

  // 로직도 props인 micOn, speakerOn을 기준으로 판단합니다.
  const getMicThemeColor = () => {
    if (!micOn) return speakerOn ? 'secondary' : 'error';
    return 'default';
  };

  const getSpeakerThemeColor = () => {
    if (!speakerOn) return 'error';
    return 'default';
  };

  return (
    <div className={styles.audioControls}>
      <OutlineIconButton
        name={micOn ? 'mic' : 'micoff'}
        size="small"
        themeColor={getMicThemeColor()}
        onClick={handleMicToggle}
      />
      <OutlineIconButton
        name={speakerOn ? 'volume' : 'mute'}
        size="small"
        themeColor={getSpeakerThemeColor()}
        onClick={handleSpeakerToggle}
      />
    </div>
  );
}
