'use client';

import RoomInfo from './RoomInfo';
import Modal from '@/app/components/shared/modal/Modal';
import RoomUpdateModalContent from '../creation/RoomUpdateModalContent';
import { useModal } from '@/app/components/shared/modal/useModal';
import { RoomEditData } from '@/app/features/room/dtos/type';
import { RoomInfoWithModalProps } from '@/app/features/room/components/type';
import { RoomConverter } from '@/app/features/room/dtos/Room';
import roomService from '@/app/features/room/services/RoomService';

export default function RoomInfoWithModal({
  roomId,
  title,
  tags,
  maxParticipants,
  isMicAvailable,
  isPrivate,
  password,
  isHost,
  onUpdate,
}: RoomInfoWithModalProps) {
  const { openModal, closeModal } = useModal();
  const modalId = `room-update-${roomId}`;

  const handleEditClick = () => openModal(modalId);

  const handleCancel = () => closeModal(modalId);
  const handleSubmit = async (data: RoomEditData) => {
    try {
      const roomDto = RoomConverter.editToDto(data);
      await roomService.updateRoom(roomId, roomDto);

      closeModal(modalId);
      onUpdate?.(data);
    } catch (error) {
      // 에러 처리 (필요시 토스트 메시지 등 추가)
      console.error('방 수정 실패:', error);
    }
  };

  const initialData: Partial<RoomEditData> = {
    title,
    tags,
    maxParticipants,
    isMicAvailable,
    isPrivate,
    password,
  };

  return (
    <>
      <RoomInfo title={title} tags={tags} isHost={isHost} onEditClick={handleEditClick} />
      <Modal id={modalId}>
        <RoomUpdateModalContent
          initialData={initialData}
          onCancel={handleCancel}
          onSubmit={handleSubmit}
          submitText="수정하기"
        />
      </Modal>
    </>
  );
}
