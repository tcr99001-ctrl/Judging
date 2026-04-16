export const COLORS = ['white', 'blue', 'green', 'red', 'black'];
export const ALL = [...COLORS, 'gold'];

export const CASE_TITLE = '가면 경매장의 마지막 증언';
export const CASE_TAGLINE = '경매는 멈췄다. 왕관은 사라졌다.';

export const TIER_LABEL = {
  1: '현장',
  2: '인물',
  3: '기록',
};

export const TIER_ZONE = {
  1: 'scene',
  2: 'people',
  3: 'record',
};

export const ZONE_LABEL = {
  scene: '현장 수색',
  people: '인물 면담',
  record: '기록 대조',
};

export const GEM_LABEL = {
  white: '알리바이',
  blue: '장부',
  green: '현장',
  red: '동기',
  black: '은폐',
  gold: '특권',
};

export const GEM_SHORT = {
  white: '알',
  blue: '장',
  green: '현',
  red: '동',
  black: '은',
  gold: '특',
};

export const LINE_LABEL = GEM_LABEL;

export const ROOM_MAX_PLAYERS = 4;
export const MAX_RESERVED = 3;
export const ACCUSATION_THRESHOLD = 4;
export const LOG_LIMIT = 32;
export const STALE_PLAYER_MS = 45000;
export const BOT_LOOP_MS = 1100;
export const BOT_THINK_DELAY_MS = 420;
export const BOT_NAME = '기록관';

export const ACTION_LABEL = {
  TAKE_CLUE: '확보',
  FILE_LEAD: '정리',
  CROSSCHECK: '대조',
  INTERROGATE: '추궁',
  ACCUSE: '고발',
  END_TURN: '종료',
  FORCE_STALE_SKIP: '강제 종료',
};
