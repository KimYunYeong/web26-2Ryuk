const Rules = {
  DATETIME_FORMAT: {
    DATE: 'YYYY-MM-DD',
    TIME: 'HH:mm',
    FULL: 'YYYY-MM-DD HH:mm:ss',
  },
  ROOM: {
    PARTICIPANT_MAX_COUNT: 10,
  },
  GAME: {
    BEAKER: {
      MAX_LEVEL: 500,
    },
  },
} as const;

export default Rules;
