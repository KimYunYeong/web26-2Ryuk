'use client';

import IS from './is';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/ko';

dayjs.extend(relativeTime);
dayjs.locale('ko');

interface DateFormatOptions {
  format?: string;
  fallback?: string;
}

interface DateDescribeOptions {
  fallback?: string;
  now?: Date;
}

const DateUtil = {
  format(
    dt?: Date | null,
    { format, fallback }: DateFormatOptions = { format: 'YYYY-MM-DD', fallback: '' },
  ): string {
    if (IS.nil(dt)) return fallback!;
    return dayjs(dt).format(format);
  },

  fromNow(dt?: Date | null, fallback: string = ''): string {
    if (IS.nil(dt)) return fallback;
    return dayjs(dt).fromNow();
  },

  describe(
    dt?: Date | null,
    { fallback = '-', now = new Date() }: DateDescribeOptions = {},
  ): string {
    if (IS.nil(dt)) return fallback;

    const diffMs = now.getTime() - dt!.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);

    if (diffSeconds < 60) return `${diffSeconds}초전`;
    if (diffSeconds < 60 * 60) {
      const minutes = Math.floor(diffSeconds / 60);
      return `${minutes}분전`;
    }

    if (diffSeconds < 60 * 60 * 24) {
      const hours = Math.floor(diffSeconds / (60 * 60));
      return `${hours}시간전`;
    }

    return DateUtil.format(dt, { format: 'YYYY. MM. DD', fallback });
  },
};

export default DateUtil;
