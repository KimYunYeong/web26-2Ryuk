'use client';

import styles from './roomInfo.module.css';
import { SecondaryChip } from '@/app/components/shared/chip/Chip';
import { SecondaryIconCircle } from '@/app/components/shared/icon/IconCircle';
import { GhostIconButton } from '@/app/components/shared/icon/IconButton';
import Icon from '@/app/components/shared/icon/Icon';

interface RoomInfoProps {
  title: string;
  tags: string[];
  onEditClick?: () => void;
}

export default function RoomInfo({ title, tags, onEditClick }: RoomInfoProps) {
  return (
    <div className={styles.roomInfo}>
      <div className={styles.content}>
        <div className={styles.leftSection}>
          <Icon name="voice" size="medium" />
          <h2 className={styles.title}>{title}</h2>
        </div>
        <GhostIconButton name="edit" size="small" onClick={onEditClick} />
      </div>
      {tags.length > 0 && (
        <div className={styles.tags}>
          {tags.map((tag) => (
            <SecondaryChip key={tag} label={`#${tag}`} size="medium" />
          ))}
        </div>
      )}
    </div>
  );
}
