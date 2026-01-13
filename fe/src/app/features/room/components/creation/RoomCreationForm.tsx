'use client';

import { useState, FormEvent } from 'react';
import { DefaultTextfield } from '@/app/components/shared/textfield/Textfield';
import { PrimaryTextButton, OutlineTextButton } from '@/app/components/shared/button/TextButton';
import ParticipantStepper from '@/app/components/shared/stepper/ParticipantStepper';
import TagSelector from '@/app/components/shared/tag/TagSelector';
import MicSetting from './MicSetting';
import PasswordSetting from './PasswordSetting';
import { RoomCreationData } from '@/app/features/room/dtos/type';
import styles from './roomCreationForm.module.css';
import { RoomCreationFormProps } from '@/app/features/room/components/type';

export default function RoomCreationForm({
  initialData = {},
  onSubmit,
  onCancel,
}: RoomCreationFormProps) {
  const [title, setTitle] = useState(initialData.title || '');
  const [tags, setTags] = useState<string[]>(initialData.tags || []);
  const [maxParticipants, setMaxParticipants] = useState(initialData.maxParticipants || 4);
  const [isMicAvailable, setIsMicAvailable] = useState(initialData.isMicAvailable ?? true);
  const [isPrivate, setIsPrivate] = useState(initialData.isPrivate ?? false);
  const [password, setPassword] = useState(initialData.password || '');
  const isDisabled = !title.trim() || tags.length === 0 || maxParticipants < 1;

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const data: RoomCreationData = {
      title: title.trim(),
      tags: tags,
      maxParticipants: maxParticipants,
      isMicAvailable: isMicAvailable,
      isPrivate: isPrivate,
      password: isPrivate ? password : undefined,
    };
    onSubmit?.(data);
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.inputArea}>
        <div className={styles.section}>
          <label className={styles.label}>대화방 제목</label>
          <DefaultTextfield
            placeholder="대화방 제목을 입력하세요"
            initialValue={title}
            onChange={setTitle}
          />
        </div>

        <div className={styles.section}>
          <label className={styles.label}>대화방 태그</label>
          <TagSelector
            defaultTags={['수다', '게임', '소통']}
            selectedTags={tags}
            onChange={setTags}
          />
        </div>

        <div className={styles.row}>
          <div className={styles.halfSection}>
            <label className={styles.label}>최대 인원 수 (Max 10)</label>
            <ParticipantStepper initialValue={maxParticipants} onChange={setMaxParticipants} />
          </div>
          <div className={styles.halfSection}>
            <label className={styles.label}>대화방 설정</label>
            <MicSetting initialChecked={isMicAvailable} onChange={setIsMicAvailable} />
          </div>
        </div>

        <div className={styles.section}>
          <PasswordSetting
            initialChecked={isPrivate}
            onChangeChecked={setIsPrivate}
            initialPassword={password}
            onChangePassword={setPassword}
          />
        </div>
      </div>

      <div className={styles.footer}>
        <OutlineTextButton text="취소" size="medium" onClick={onCancel} />
        <PrimaryTextButton
          text="대화방 만들기"
          size="medium"
          iconName="add"
          type="submit"
          disabled={isDisabled}
        />
      </div>
    </form>
  );
}
