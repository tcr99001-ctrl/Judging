export const COLORS = ['white', 'blue', 'green', 'red', 'black'];
export const ALL = [...COLORS, 'gold'];

export const CASE_TITLE = '가면 경매장의 마지막 증언';
export const CASE_TAGLINE = '왕관은 사라졌고, 누군가는 거짓말을 하고 있다.';

export const GEM_STYLE = {
  white: 'bg-slate-50 border-slate-300 text-slate-900',
  blue: 'bg-sky-500 border-sky-700 text-white',
  green: 'bg-emerald-500 border-emerald-700 text-white',
  red: 'bg-rose-500 border-rose-700 text-white',
  black: 'bg-slate-800 border-slate-950 text-white',
  gold: 'bg-amber-300 border-amber-500 text-amber-950',
};

export const RESOURCE_LABEL = {
  white: '알리바이',
  blue: '기록 열람',
  green: '현장 감식',
  red: '동기 추적',
  black: '은폐 흔적',
  gold: '특권',
};

export const GEM_LABEL = RESOURCE_LABEL;

export const RESOURCE_SHORT = {
  white: '알',
  blue: '기',
  green: '현',
  red: '동',
  black: '은',
  gold: '특',
};

export const GEM_SHORT = RESOURCE_SHORT;

export const RESOURCE_DESC = {
  white: '증언, 출입 시간, 눈에 띄는 부재를 다룬다.',
  blue: '명부, 계약서, 보관 기록을 훑는다.',
  green: '현장 흔적과 손상, 미세한 오차를 건진다.',
  red: '감정, 갈등, 원한의 결을 쫓는다.',
  black: '은닉, 위조, 뒤처리의 자국을 파고든다.',
  gold: '영장, 특권, 비공식 협조를 뜻하는 와일드 자원이다.',
};

export const GEM_SYMBOL = {
  white: '◈',
  blue: '◆',
  green: '✦',
  red: '⬟',
  black: '⬢',
  gold: '✶',
};

export const TIER_LABEL = {
  1: '현장 단서',
  2: '인물 추적',
  3: '결정적 모순',
};

export const TIER_SHORT_LABEL = {
  1: '현장',
  2: '인물',
  3: '모순',
};

export const TIER_THEME = {
  1: {
    frame: 'border-slate-300 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.95),_rgba(226,232,240,0.92))] shadow-[0_10px_24px_rgba(15,23,42,0.18)]',
    accent: 'text-slate-700 bg-slate-100 border-slate-300',
    badge: 'bg-slate-100 text-slate-700 border-slate-300',
    deck: 'from-slate-100 via-slate-200 to-slate-300 border-slate-400',
    glow: 'ring-slate-300/70',
  },
  2: {
    frame: 'border-sky-200 bg-[radial-gradient(circle_at_top_left,_rgba(239,246,255,0.98),_rgba(224,242,254,0.94))] shadow-[0_12px_28px_rgba(2,132,199,0.16)]',
    accent: 'text-sky-700 bg-sky-50 border-sky-200',
    badge: 'bg-sky-50 text-sky-700 border-sky-200',
    deck: 'from-sky-50 via-sky-100 to-sky-200 border-sky-300',
    glow: 'ring-sky-300/70',
  },
  3: {
    frame: 'border-violet-200 bg-[radial-gradient(circle_at_top_left,_rgba(250,245,255,0.98),_rgba(243,232,255,0.94))] shadow-[0_14px_30px_rgba(109,40,217,0.18)]',
    accent: 'text-violet-700 bg-violet-50 border-violet-200',
    badge: 'bg-violet-50 text-violet-700 border-violet-200',
    deck: 'from-violet-50 via-fuchsia-50 to-violet-100 border-violet-300',
    glow: 'ring-violet-300/70',
  },
};

export const ACTION_LABEL = {
  COLLECT_LEADS: '수사 자원 확보',
  SECURE_CLUE: '단서 확보',
  PIN_LEAD: '리드 고정',
  PIN_TOP_LEAD: '상단 리드 고정',
  DISCARD_EXCESS: '자원 정리',
  CHOOSE_WITNESS: '증언 선택',
  ACCUSE: '최종 고발',
  END_TURN: '턴 정리',
  FORCE_STALE_SKIP: '강제 정리',
};

export const WIN_SCORE = 99;
export const ACCUSATION_THRESHOLD = 12;
export const MAX_GEMS = 10;
export const MAX_RESOURCES = MAX_GEMS;
export const MAX_RESERVED = 3;
export const ROOM_MAX_PLAYERS = 4;
export const LOG_LIMIT = 40;

export const BOT_NAME = '수사 자동기록관';
export const BOT_LOOP_MS = 950;
export const BOT_THINK_DELAY_MS = 420;

export const STALE_PLAYER_MS = 45000;

export const NOTEBOOK_LABELS = {
  suspects: '용의자',
  motives: '동기',
  methods: '수법',
};
