'use client';

import ChatPanel from './ChatPanel';
import { RoomChatPanelProps } from './type';
import styles from './chat.module.css';
import AudioControlButtons from '@/app/features/voice/components/AudioControlButtons';
import { useState } from 'react';

export default function RoomChatPanel({
  participantCount,
  chats,
  onMessageSubmit,
}: RoomChatPanelProps) {
  const [micState, setMicState] = useState(true);
  const [speakerState, setSpeakerState] = useState(true);

  const handleMicChange = (state: boolean) => setMicState(state);
  const handleSpeakerChange = (state: boolean) => setSpeakerState(state);

  const headerChildren = (
    <div className={styles.roomChatHeaderControls}>
      <AudioControlButtons
        initialMicState={micState}
        initialSpeakerState={speakerState}
        onMicChange={handleMicChange}
        onSpeakerChange={handleSpeakerChange}
      />
    </div>
  );

  return (
    <ChatPanel
      iconName="voice"
      type="local"
      participantCount={participantCount}
      chats={chats}
      onMessageSubmit={onMessageSubmit}
      headerChildren={headerChildren}
    />
  );
}
