'use client';

import { useState } from 'react';
import { GhostTextButton } from '@/app/components/shared/button/TextButton';
import { GhostIconButton } from '@/app/components/shared/icon/IconButton';
import useNavigation from '@/app/hooks/useNavigation';
import useResponsive from '@/app/hooks/useResponsive';
import { useModal } from '@/app/components/shared/modal/useModal';
import Modal from '@/app/components/shared/modal/Modal';
import Dialog from '@/app/components/shared/dialog/Dialog';
import Paths from '@/app/shared/path';
import GoBackButton from '@/app/components/shared/button/GoBackButton';

/**
 * Room 페이지 전용 GoBackButton
 * 나가기 전에 확인 모달을 띄웁니다.
 */
export default function RoomGoBackButton() {
  const { goBack } = useNavigation();
  const { openModal, closeModal } = useModal();
  const [modalId] = useState(() => `room-exit-${Date.now()}`);

  const handleGoBackClick = () => openModal(modalId);
  const handleConfirm = () => goBack();
  const handleCancel = () => closeModal(modalId);

  return (
    <>
      <GoBackButton modalId={modalId} onClick={handleGoBackClick} />
      <Modal id={modalId}>
        <Dialog
          modalId={modalId}
          src={Paths.images('mascot_surprise')}
          title="정말 나가시겠습니까?"
          content="현재 진행 중인 대화 정보가 사라질 수 있으니 신중하게 결정해주세요!"
          onCancel={handleCancel}
          onConfirm={handleConfirm}
        />
      </Modal>
    </>
  );
}
