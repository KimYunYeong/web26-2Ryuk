'use client';

import CSSUtil from '@/utils/css';
import styles from './selectedGameCard.module.css';

interface GameSelectionButtonProps {
  onChange?: () => void;
}

export default function GameSelectionButton({ onChange }: GameSelectionButtonProps) {
  const className = CSSUtil.buildCls(styles.selectionButton, 'clickable');

  return (
    <div className={className} aria-label="게임 선택 필요" onClick={onChange}>
      <h3 className={styles.title}>게임 선택하기</h3>
      <p className={styles.description}>
        게임이 선택되지 않았습니다
        <br />
        그룹원들과 같이 플레이할 게임을 선택해주세요
      </p>
    </div>
  );
}
