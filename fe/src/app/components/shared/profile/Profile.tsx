'use client';

import Avatar from './Avatar';
import { ProfileProps } from './type';
import styles from './profile.module.css';

export default function Profile({ nickname, profileImage }: ProfileProps) {
  return (
    <div className={styles.profile}>
      <Avatar nickname={nickname} profileImage={profileImage} />
      <span className={styles.nickname}>{nickname}</span>
    </div>
  );
}
