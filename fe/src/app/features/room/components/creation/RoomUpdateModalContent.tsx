'use client';

import RoomEditForm from './RoomEditForm';
import RoomEditModalContentBase from './RoomEditModalContentBase';
import { RoomEditFormProps } from '@/app/features/room/components/type';
import { useModal } from '@/app/components/shared/modal/useModal';

export default function RoomUpdateModalContent(props: RoomEditFormProps) {
  const { onSubmit } = props;
  const { closeModal } = useModal();

  const handleCancel = () => closeModal('room-update');
  const handleSubmit = (data: Parameters<NonNullable<typeof onSubmit>>[0]) => onSubmit?.(data);

  return (
    <RoomEditModalContentBase
      title="대화방 정보 수정"
      subtitle="여기서 대화방 정보를 수정할 수 있어요!"
    >
      <RoomEditForm {...props} onCancel={handleCancel} onSubmit={handleSubmit} />
    </RoomEditModalContentBase>
  );
}
