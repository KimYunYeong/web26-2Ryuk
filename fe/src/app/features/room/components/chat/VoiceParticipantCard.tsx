'use client';

import HostBadge from '@/app/components/shared/badge/HostBadge';
import * as Chip from '@/app/components/shared/chip/Chip';
import Icon from '@/app/components/shared/icon/Icon';
import Avatar from '@/app/components/shared/profile/Avatar';
import { SliderBase } from '@/app/components/shared/slider/Slider';
import AudioControlButtons from '@/app/features/voice/components/AudioControlButtons';
import SpeakerControlButton from '@/app/features/voice/components/SpeakerControlButton';
import CSSUtil from '@/utils/css';
import { useEffect, useState } from 'react';
import styles from './chat.module.css';
import { VoiceParticipantCardProps } from './type';

export default function VoiceParticipantCard({
  nickname,
  profileImage,
  active = false,
  isMe = false,
  isHost = false,
  micOn = true,
  speakerOn = true,
  volume = 50,
  onSliderChange,
  onMicChange,
  onSpeakerChange,
}: VoiceParticipantCardProps) {
  const [sliderValue, setSliderValue] = useState(volume);
  const isSpeaking = active && micOn;
  const sliderVariant = isMe || active ? 'primary' : 'secondary';
  let statusText = '음소거됨';
  if (isSpeaking) {
    statusText = '말하는 중...';
  } else if (micOn) {
    statusText = '대기 중';
  }

  const handleSliderChange = (value: number) => {
    setSliderValue(value);
    onSliderChange?.(value);
  };

  useEffect(() => {
    setSliderValue(volume);
  }, [volume]);

  const className = CSSUtil.buildCls(
    styles.participantCard,
    isMe && styles.me,
    isSpeaking && styles.speaking,
  );

  return (
    <div className={className}>
      <div className={styles.cardTop}>
        <div className={styles.avatarWrapper}>
          <Avatar nickname={nickname} profileImage={profileImage} />
        </div>
        <div className={styles.meta}>
          <div className={styles.nameRow}>
            <span className={styles.participantName}>{nickname}</span>
            {isHost && <HostBadge />}
            {isMe && <Chip.Secondary label="나" size="small" />}
          </div>
          <div className={styles.statusRow}>
            <Icon name={micOn ? 'mic' : 'micoff'} size="small" />
            <span className={styles.statusText}>{statusText}</span>
          </div>
        </div>
        <div className={styles.controls}>
          {isMe ? (
            <AudioControlButtons
              micOn={micOn}
              speakerOn={speakerOn}
              onMicChange={onMicChange}
              onSpeakerChange={onSpeakerChange}
            />
          ) : (
            <SpeakerControlButton initialState={speakerOn} onChange={onSpeakerChange} />
          )}
        </div>
      </div>

      <div className={styles.sliderRow}>
        <Icon name={isMe ? 'mic' : 'volume'} size="small" />
        <SliderBase
          variant={sliderVariant}
          value={sliderValue} // 1. 현재 상태값 연결
          onChange={handleSliderChange} // 2. 바꿨을 때 실행될 핸들러 연결
          min={0}
          max={100}
        />
      </div>
    </div>
  );
}
