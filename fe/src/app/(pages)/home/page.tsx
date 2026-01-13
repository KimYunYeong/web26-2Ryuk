import '@/app/page.css';
import HeroSection from '@/app/components/layout/heroSection/HeroSection';
import { PopularPostsSection } from '@/app/features/post/components/PopularPosts.server';
import RealtimeRoomsSection from '@/app/features/room/components/RealtimeRoomsSection';
import HomePageClient from './client';
import styles from './page.module.css';

export default function HomePage() {
  return (
    <HomePageClient>
      <div className="content">
        <div className={styles.contentWrapper}>
          <div className={styles.topSection}>
            <HeroSection />
            <div>
              <PopularPostsSection />
            </div>
          </div>
          <RealtimeRoomsSection />
        </div>
      </div>
    </HomePageClient>
  );
}
