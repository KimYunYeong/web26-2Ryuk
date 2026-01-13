import './globals.css';
import MSWProvider from '@/app/providers/MSWProvider';
import AuthProvider from '@/app/providers/AuthProvider';
import ModalEventDelegation from '@/app/components/shared/modal/ModalEventDelegation';
import Header from './components/layout/header/Header';
import { RootLayoutProps } from './type';
import type { Metadata } from 'next';
import GoBackWrapper from './layout/GoBackWrapper';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://moolbangwool.duckdns.org';
const siteName = '물방울톡';
const defaultDescription = '물방울톡 - 실시간 음성 채팅 및 커뮤니티 플랫폼';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteName,
    template: `%s | ${siteName}`,
  },
  description: defaultDescription,
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: siteUrl,
    siteName: siteName,
    title: siteName,
    description: defaultDescription,
    images: [
      {
        url: '/images/logo_circle.100x100.png',
        width: 100,
        height: 100,
        alt: siteName,
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: siteName,
    description: defaultDescription,
    images: ['/images/logo_circle.100x100.png'],
  },
  icons: {
    icon: '/images/logo_circle.100x100.png',
    apple: '/images/logo_circle.100x100.png',
  },
};

/**
 * 모든 페이지에 공통으로 적용
 */
export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ko">
      <body>
        <ModalEventDelegation />
        <MSWProvider>
          <AuthProvider>
            <Header />
            <div className="page">
              <GoBackWrapper />
              {children}
            </div>
          </AuthProvider>
        </MSWProvider>
      </body>
    </html>
  );
}
