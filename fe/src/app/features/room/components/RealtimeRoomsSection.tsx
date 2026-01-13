'use client';

import styles from './realtimeRoomsSection.module.css';
import RoomCard from './card/RoomCard';
import * as IconCircle from '@/app/components/shared/icon/IconCircle';
import * as TextButton from '@/app/components/shared/button/TextButton';
import SearchForm from '@/app/components/shared/form/search/SearchForm';
import { RealtimeRoomsSectionProps } from './type';
import { RoomEditData } from '@/app/features/room/dtos/type';
import { RoomConverter } from '@/app/features/room/dtos/Room';
import useResponsive from '@/app/hooks/useResponsive';
import CSSUtil from '@/utils/css';
import Modal from '@/app/components/shared/modal/Modal';
import RoomCreateModalContent from './creation/RoomCreateModalContent';
import roomService from '../services/RoomService';
import useNavigation from '@/app/hooks/useNavigation';
import { useModal } from '@/app/components/shared/modal/useModal';

export default function RealtimeRoomsSection({ rooms, onSearch }: RealtimeRoomsSectionProps) {
  const { isDesktop } = useResponsive();
  const router = useNavigation();
  const { closeModal } = useModal();
  const headerClassName = CSSUtil.buildCls(styles.headerDesktop, !isDesktop && styles.headerTablet);

  const handleSubmit = async (data: RoomEditData) => {
    try {
      const roomDto = RoomConverter.editToDto(data);
      const createdRoom = await roomService.createRoom(roomDto);

      closeModal('room-creation');
      router.goToRoom(createdRoom.id);
    } catch (error) {
      // 에러 처리 (필요시 토스트 메시지 등 추가)
      console.error('방 생성 실패:', error);
    }
  };

  return (
    <>
      <div className={styles.realtimeRoomsSection}>
        <div className={headerClassName}>
          <div className={styles.title}>
            <IconCircle.Secondary name="mic" size="medium" />
            <h2 className={styles.titleText}>실시간 대화방</h2>
          </div>
          <div className={styles.actions}>
            <div className={styles.search}>
              <SearchForm placeholder="제목, 내용, 작성자 검색" onSubmit={onSearch} />
            </div>
            <div className={styles.createRoom}>
              <TextButton.Primary
                text="방 만들기"
                size="medium"
                iconName="add"
                modalId="room-creation"
              />
            </div>
          </div>
        </div>
        <div className={styles.grid}>
          {rooms.map((room) => (
            <RoomCard key={room.id} {...room} />
          ))}
        </div>
      </div>
      <Modal id="room-creation">
        <RoomCreateModalContent onSubmit={handleSubmit} submitText="방 만들기" />
      </Modal>
    </>
  );
}
