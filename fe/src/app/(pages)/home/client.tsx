'use client';

import useResponsive from '@/app/hooks/useResponsive';
import CSSUtil from '@/utils/css';
import styles from './page.module.css';
import { PageClientProps } from '../type';
import GlobalChatPanel from '@/app/features/chat/components/GlobalChatPanel';

export default function HomePageClient({ children }: PageClientProps) {
  const { status } = useResponsive();
  return (
    <div className={styles[status]}>
      {children}
      <div className={styles.globalChatContainer}>
        <GlobalChatPanel />
      </div>
    </div>
  );
}
