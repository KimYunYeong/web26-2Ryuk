'use client';

import { usePathname } from 'next/navigation';
import GoBackButton from '@/app/components/shared/button/GoBackButton';
import RoomGoBackButton from '@/app/features/room/components/RoomGoBackButton';

export default function GoBackWrapper() {
  const pathname = usePathname();

  const hideGoBackPaths = ['/home', '/components'];
  const shouldShowGoBack = !hideGoBackPaths.some((path) => pathname.startsWith(path));

  if (!shouldShowGoBack) return null;

  // Room 페이지인 경우 커스텀 GoBackButton 사용
  const isRoomPage = pathname.startsWith('/room/') && pathname !== '/room';
  const roomId = pathname.split('/').pop() ?? '';

  return (
    <div className="go-back">
      {isRoomPage ? <RoomGoBackButton roomId={roomId} /> : <GoBackButton />}
    </div>
  );
}
