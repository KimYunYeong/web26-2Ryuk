/* eslint-disable no-nested-ternary */
'use client';

import Avatar from '@/app/components/shared/profile/Avatar';
import Icon from '@/app/components/shared/icon/Icon';
import * as Chip from '@/app/components/shared/chip/Chip';
import { SliderBase } from '@/app/components/shared/slider/Slider';
import AudioControlButtons from '@/app/features/voice/components/AudioControlButtons';
import SpeakerControlButton from '@/app/features/voice/components/SpeakerControlButton';
import { VoiceParticipantCardProps } from './type';
import styles from './chat.module.css';
import CSSUtil from '@/utils/css';
import HostBadge from '@/app/components/shared/badge/HostBadge';

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
  const isSpeaking = active && micOn;
  const sliderVariant = isMe || active ? 'primary' : 'secondary';

  const className = CSSUtil.buildCls(
    styles.participantCard,
    isMe && styles.me,
    isSpeaking && styles.speaking,
  );

  const audioControls = isMe ? (
    <AudioControlButtons
      initialMicState={micOn}
      initialSpeakerState={speakerOn}
      onMicChange={onMicChange}
      onSpeakerChange={onSpeakerChange}
    />
  ) : (
    <SpeakerControlButton initialState={speakerOn} onChange={onSpeakerChange} />
  );

  const volumeIconName = isMe ? 'mic' : 'volume';

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
            <span className={styles.statusText}>
              {isSpeaking ? '말하는 중...' : micOn ? '대기 중' : '음소거됨'}
            </span>
          </div>
        </div>
        <div className={styles.controls}>{audioControls}</div>
      </div>

      <div className={styles.sliderRow}>
        <Icon name={volumeIconName} size="small" />
        <SliderBase variant={sliderVariant} initialValue={volume} onChange={onSliderChange} />
      </div>
    </div>
  );
}
