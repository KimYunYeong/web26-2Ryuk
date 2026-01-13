'use client';

import { GhostTextButton } from './TextButton';
import { GhostIconButton } from '../icon/IconButton';
import useNavigation from '@/app/hooks/useNavigation';
import useResponsive from '@/app/hooks/useResponsive';
import { GoBackButtonProps } from './type';

export default function GoBackButton({ onClick }: GoBackButtonProps) {
  const { goBack } = useNavigation();
  const { isDesktop } = useResponsive();

  const handleClick = () => {
    if (onClick) onClick();
    else goBack();
  };

  return isDesktop ? (
    <GhostTextButton iconName="left" text="돌아가기" size="medium" onClick={handleClick} />
  ) : (
    <GhostIconButton name="left" size="medium" onClick={handleClick} />
  );
}
