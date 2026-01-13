/**
 * MSW 핸들러 정의
 *
 * 개발 환경에서 API 요청을 모킹하기 위한 핸들러들을 정의
 */
import { http, HttpResponse } from 'msw';
import roomsMock from './data/rooms.json';
import postListCardMock from './data/postListCard.json';
import profilesMock from './data/profiles.json';
import type { RoomDto } from '@/app/features/room/dtos/type';

const rooms: RoomDto[] = [...roomsMock.rooms];

export const handlers = [
  // Rooms API (전체 방 목록 조회)
  // 상대 경로 패턴 사용 (절대/상대 모두 매칭됨)
  http.get('/api/rooms/all', () => {
    // 빈 배열인 경우 204 응답
    if (!rooms || rooms.length === 0) {
      return HttpResponse.json(
        {
          success: true,
          message: '방 목록 조회에 성공 했습니다.',
          data: { rooms: [] },
        },
        { status: 204 },
      );
    }

    // 정상 응답
    return HttpResponse.json({
      success: true,
      message: '방 목록 조회에 성공 했습니다.',
      data: {
        rooms: rooms,
      },
    });
  }),

  // Rooms Search API (방 검색)
  http.get('/api/rooms/search', ({ request }) => {
    const url = new URL(request.url);
    const keyword = url.searchParams.get('keyword');

    if (!keyword || keyword.trim() === '') {
      return HttpResponse.json(
        {
          success: true,
          message: '방 검색 조회에 성공 했습니다.',
          data: { rooms: [] },
        },
        { status: 200 },
      );
    }

    const searchKeyword = keyword.toLowerCase().trim();
    const filteredRooms = rooms.filter((room) => {
      // 제목에서 검색
      if (room.title.toLowerCase().includes(searchKeyword)) {
        return true;
      }
      // 태그에서 검색
      if (room.tags.some((tag) => tag.toLowerCase().includes(searchKeyword))) {
        return true;
      }
      return false;
    });

    // 검색 결과가 없으면 204 응답
    if (filteredRooms.length === 0) {
      return HttpResponse.json(
        {
          success: true,
          message: '방 검색 조회에 성공 했습니다.',
          data: { rooms: [] },
        },
        { status: 204 },
      );
    }

    // 정상 응답
    return HttpResponse.json({
      success: true,
      message: '방 검색 조회에 성공 했습니다.',
      data: {
        rooms: filteredRooms,
      },
    });
  }),

  // Room API (단일 방 조회)
  http.get('/api/rooms/:roomId', ({ params }) => {
    const { roomId } = params;
    const room = rooms.find((r) => r.id === roomId);
    if (!room) {
      return HttpResponse.json(
        { success: false, message: '존재하지 않는 방입니다.' },
        { status: 404 },
      );
    }
    return HttpResponse.json({
      success: true,
      message: '방 상세 조회에 성공 했습니다.',
      data: room,
    });
  }),

  // Popular Posts API
  http.get('/api/posts/popular', ({ request }) => {
    const url = new URL(request.url);
    const limit = url.searchParams.get('limit');

    // limit 파라미터가 있으면 posts를 제한
    if (limit) {
      const limitNum = parseInt(limit, 10);
      return HttpResponse.json({
        ...postListCardMock,
        posts: postListCardMock.posts.slice(0, limitNum),
      });
    }

    return HttpResponse.json(postListCardMock);
  }),

  // User Profile API (특정 사용자 정보)
  http.get('/api/users/:userId/profile', ({ params }) => {
    const { userId } = params;
    const profile = profilesMock.find((p) => p.id === userId);

    if (!profile) return HttpResponse.json({ error: 'Profile not found' }, { status: 404 });
    return HttpResponse.json(profile);
  }),

  // Room Creation API (대화방 생성)
  http.post('/api/rooms', async ({ request }) => {
    // Authorization 헤더 확인
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        {
          success: false,
          message: '인증이 필요합니다.',
        },
        { status: 401 },
      );
    }

    try {
      const body = (await request.json()) as {
        title?: string;
        tags?: string[];
        max_participants?: number;
        is_mic_available?: boolean;
        is_private?: boolean;
        password?: string;
      };

      // 필수 필드 검증
      if (!body.title || typeof body.title !== 'string' || body.title.trim() === '') {
        return HttpResponse.json(
          {
            success: false,
            message: '요청 값이 올바르지 않습니다.',
            data: { field: 'title', reason: '제목은 필수입니다.' },
          },
          { status: 400 },
        );
      }

      if (!Array.isArray(body.tags)) {
        return HttpResponse.json(
          {
            success: false,
            message: '요청 값이 올바르지 않습니다.',
            data: { field: 'tags', reason: '태그는 배열이어야 합니다.' },
          },
          { status: 400 },
        );
      }

      if (typeof body.max_participants !== 'number' || body.max_participants < 1) {
        return HttpResponse.json(
          {
            success: false,
            message: '요청 값이 올바르지 않습니다.',
            data: { field: 'max_participants', reason: '1 이상이어야 합니다.' },
          },
          { status: 400 },
        );
      }

      if (typeof body.is_mic_available !== 'boolean') {
        return HttpResponse.json(
          {
            success: false,
            message: '요청 값이 올바르지 않습니다.',
            data: { field: 'is_mic_available', reason: '불린 값이어야 합니다.' },
          },
          { status: 400 },
        );
      }

      if (typeof body.is_private !== 'boolean') {
        return HttpResponse.json(
          {
            success: false,
            message: '요청 값이 올바르지 않습니다.',
            data: { field: 'is_private', reason: '불린 값이어야 합니다.' },
          },
          { status: 400 },
        );
      }

      // 비공개 방인데 비밀번호가 없는 경우
      if (body.is_private && (!body.password || body.password.trim() === '')) {
        return HttpResponse.json(
          {
            success: false,
            message: '요청 값이 올바르지 않습니다.',
            data: { field: 'password', reason: '비공개 방은 비밀번호가 필요합니다.' },
          },
          { status: 400 },
        );
      }

      // UUID 생성 함수 (간단한 버전)
      const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
      };

      // 토큰에서 userId 추출 (호스트 ID로 사용)
      const token = authHeader.replace('Bearer ', '');
      const match = token.match(/^mock_token_(.+)_\d+$/);
      const hostId = match ? match[1] : 'unknown';

      // 새 방 생성
      const newRoom: RoomDto = {
        id: generateUUID(),
        host_id: hostId,
        title: body.title,
        tags: body.tags,
        current_participants: 0,
        max_participants: body.max_participants,
        is_mic_available: body.is_mic_available,
        is_private: body.is_private,
        participant_profile_images: [],
        create_date: new Date().toISOString(),
      };

      // rooms 배열에 새 방 추가
      rooms.unshift(newRoom);

      // 성공 응답 (RoomDto 전체 반환)
      return HttpResponse.json(
        {
          success: true,
          message: '대화방이 성공적으로 생성되었습니다.',
          data: newRoom,
        },
        { status: 201 },
      );
    } catch (error) {
      // JSON 파싱 오류 또는 기타 오류
      return HttpResponse.json(
        {
          success: false,
          message: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        },
        { status: 500 },
      );
    }
  }),

  // Room Update API (대화방 수정)
  http.put('/api/rooms/:id', async ({ request, params }) => {
    const { id } = params;

    // Authorization 헤더 확인
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        {
          success: false,
          message: '인증이 필요합니다.',
        },
        { status: 401 },
      );
    }

    try {
      // 방 존재 확인
      const roomIndex = rooms.findIndex((r) => r.id === id);
      if (roomIndex === -1) {
        return HttpResponse.json(
          {
            success: false,
            message: '존재하지 않는 방입니다.',
          },
          { status: 404 },
        );
      }

      const existingRoom = rooms[roomIndex];

      // 권한 확인 (호스트인지 확인)
      const token = authHeader.replace('Bearer ', '');
      const match = token.match(/^mock_token_(.+)_\d+$/);
      const userId = match ? match[1] : 'unknown';

      if (existingRoom.host_id !== userId) {
        return HttpResponse.json(
          {
            success: false,
            message: '방 수정 권한이 없습니다.',
          },
          { status: 403 },
        );
      }

      const body = (await request.json()) as {
        title?: string;
        tags?: string[];
        max_participants?: number;
        is_mic_available?: boolean;
        is_private?: boolean;
        password?: string;
      };

      // 필수 필드 검증
      if (!body.title || typeof body.title !== 'string' || body.title.trim() === '') {
        return HttpResponse.json(
          {
            success: false,
            message: '요청 값이 올바르지 않습니다.',
            data: { field: 'title', reason: '제목은 필수입니다.' },
          },
          { status: 400 },
        );
      }

      if (!Array.isArray(body.tags)) {
        return HttpResponse.json(
          {
            success: false,
            message: '요청 값이 올바르지 않습니다.',
            data: { field: 'tags', reason: '태그는 배열이어야 합니다.' },
          },
          { status: 400 },
        );
      }

      if (typeof body.max_participants !== 'number' || body.max_participants < 1) {
        return HttpResponse.json(
          {
            success: false,
            message: '요청 값이 올바르지 않습니다.',
            data: { field: 'max_participants', reason: '1 이상이어야 합니다.' },
          },
          { status: 400 },
        );
      }

      if (typeof body.is_mic_available !== 'boolean') {
        return HttpResponse.json(
          {
            success: false,
            message: '요청 값이 올바르지 않습니다.',
            data: { field: 'is_mic_available', reason: '불린 값이어야 합니다.' },
          },
          { status: 400 },
        );
      }

      if (typeof body.is_private !== 'boolean') {
        return HttpResponse.json(
          {
            success: false,
            message: '요청 값이 올바르지 않습니다.',
            data: { field: 'is_private', reason: '불린 값이어야 합니다.' },
          },
          { status: 400 },
        );
      }

      // 비공개 방인데 비밀번호가 없는 경우
      if (body.is_private && (!body.password || body.password.trim() === '')) {
        return HttpResponse.json(
          {
            success: false,
            message: '요청 값이 올바르지 않습니다.',
            data: { field: 'password', reason: '비공개 방은 비밀번호가 필요합니다.' },
          },
          { status: 400 },
        );
      }

      // 방 정보 업데이트
      const updatedRoom: RoomDto = {
        ...existingRoom,
        title: body.title,
        tags: body.tags,
        max_participants: body.max_participants,
        is_mic_available: body.is_mic_available,
        is_private: body.is_private,
      };

      rooms[roomIndex] = updatedRoom;

      // 성공 응답 (201 Created)
      return HttpResponse.json(
        {
          success: true,
          message: '대화방이 성공적으로 수정되었습니다.',
          data: updatedRoom,
        },
        { status: 201 },
      );
    } catch (error) {
      // JSON 파싱 오류 또는 기타 오류
      return HttpResponse.json(
        {
          success: false,
          message: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        },
        { status: 500 },
      );
    }
  }),

  // Room Delete API (대화방 삭제)
  http.delete('/api/rooms/:id', async ({ request, params }) => {
    const { id } = params;

    // Authorization 헤더 확인
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        {
          success: false,
          message: '인증이 필요합니다.',
        },
        { status: 401 },
      );
    }

    try {
      // 방 존재 확인
      const roomIndex = rooms.findIndex((r) => r.id === id);
      if (roomIndex === -1) {
        return HttpResponse.json(
          {
            success: false,
            message: '존재하지 않는 방입니다.',
          },
          { status: 404 },
        );
      }

      const existingRoom = rooms[roomIndex];

      // 권한 확인 (호스트인지 확인)
      const token = authHeader.replace('Bearer ', '');
      const match = token.match(/^mock_token_(.+)_\d+$/);
      const userId = match ? match[1] : 'unknown';

      if (existingRoom.host_id !== userId) {
        return HttpResponse.json(
          {
            success: false,
            message: '방 삭제 권한이 없습니다.',
          },
          { status: 403 },
        );
      }

      // 방 삭제
      rooms.splice(roomIndex, 1);

      // 성공 응답 (200 OK)
      return HttpResponse.json(
        {
          success: true,
          message: '대화방이 성공적으로 삭제되었습니다.',
          data: {
            id: id,
          },
        },
        { status: 200 },
      );
    } catch (error) {
      // 서버 오류
      return HttpResponse.json(
        {
          success: false,
          message: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        },
        { status: 500 },
      );
    }
  }),
];
