'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import useNavigation from '@/app/hooks/useNavigation';
import { useModal } from '@/app/components/shared/modal/useModal';
import Modal from '@/app/components/shared/modal/Modal';
import Dialog from '@/app/components/shared/dialog/Dialog';
import Paths from '@/app/shared/path';
import GoBackButton from '@/app/components/shared/button/GoBackButton';
import roomService from '@/app/features/room/services/RoomService';
import { RoomGoBackButtonProps } from '@/app/features/room/components/type';

export default function RoomGoBackButton({ roomId }: RoomGoBackButtonProps) {
  const { goBack } = useNavigation();
  const { openModal, closeModal } = useModal();
  const [modalId] = useState(() => `room-exit-${Date.now()}`);

  const handleGoBackClick = () => openModal(modalId);
  const handleConfirm = async () => {
    if (roomId) {
      await roomService.deleteRoom(roomId);
      closeModal(modalId);
    }
    goBack();
  };
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
