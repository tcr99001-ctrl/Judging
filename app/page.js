'use client';
import React, { useState, useEffect } from 'react';
import { Scale, AlertCircle, FileText, Search, ChevronRight } from 'lucide-react';

// ==================== [캐릭터 설정] ====================
const CHARACTERS = {
  judge: { 
    name: "재판장", 
    avatar: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='45' fill='%23374151'/%3E%3Ctext x='50' y='60' font-size='40' text-anchor='middle' fill='white'%3E⚖%3C/text%3E%3C/svg%3E",
    color: "#6B7280"
  },
  prosecutor: { 
    name: "나검사", 
    avatar: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='45' fill='%23DC2626'/%3E%3Ctext x='50' y='60' font-size='40' text-anchor='middle' fill='white'%3E검%3C/text%3E%3C/svg%3E",
    color: "#DC2626"
  },
  player: { 
    name: "김변호", 
    avatar: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='45' fill='%232563EB'/%3E%3Ctext x='50' y='60' font-size='40' text-anchor='middle' fill='white'%3E변%3C/text%3E%3C/svg%3E",
    color: "#2563EB"
  },
  witness: { 
    name: "최태오",
    avatars: {
      normal: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='45' fill='%2310B981'/%3E%3Ctext x='50' y='60' font-size='35' text-anchor='middle' fill='white'%3E태오%3C/text%3E%3C/svg%3E",
      sweat: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='45' fill='%23FBBF24'/%3E%3Ctext x='50' y='60' font-size='35' text-anchor='middle' fill='white'%3E😰%3C/text%3E%3C/svg%3E",
      angry: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='45' fill='%23EF4444'/%3E%3Ctext x='50' y='60' font-size='35' text-anchor='middle' fill='white'%3E😡%3C/text%3E%3C/svg%3E",
      shock: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='45' fill='%23F59E0B'/%3E%3Ctext x='50' y='60' font-size='35' text-anchor='middle' fill='white'%3E😱%3C/text%3E%3C/svg%3E",
      breakdown: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='45' fill='%23DC2626'/%3E%3Ctext x='50' y='60' font-size='35' text-anchor='middle' fill='white'%3E🤯%3C/text%3E%3C/svg%3E"
    },
    color: "#10B981"
  },
  jimin: { 
    name: "이지민", 
    avatar: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='45' fill='%238B5CF6'/%3E%3Ctext x='50' y='60' font-size='35' text-anchor='middle' fill='white'%3E지민%3C/text%3E%3C/svg%3E",
    color: "#8B5CF6"
  },
  narrator: { 
    name: "내레이션", 
    avatar: null,
    color: "#9CA3AF"
  },
  teacher: { 
    name: "미술 선생님", 
    avatar: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='45' fill='%2306B6D4'/%3E%3Ctext x='50' y='60' font-size='40' text-anchor='middle' fill='white'%3E선%3C/text%3E%3C/svg%3E",
    color: "#06B6D4"
  },
  member: { 
    name: "미술부원", 
    avatar: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='45' fill='%23EC4899'/%3E%3Ctext x='50' y='60' font-size='40' text-anchor='middle' fill='white'%3E부%3C/text%3E%3C/svg%3E",
    color: "#EC4899"
  },
  police: { 
    name: "경찰", 
    avatar: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='45' fill='%231F2937'/%3E%3Ctext x='50' y='60' font-size='40' text-anchor='middle' fill='white'%3E경%3C/text%3E%3C/svg%3E",
    color: "#1F2937"
  },
  janitor: { 
    name: "청소부", 
    avatar: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='45' fill='%2378716C'/%3E%3Ctext x='50' y='60' font-size='40' text-anchor='middle' fill='white'%3E청%3C/text%3E%3C/svg%3E",
    color: "#78716C"
  }
};

// ==================== [증거 설정] ====================
const ALL_EVIDENCE = [
  { id: 'knife', name: '미술용 나이프', icon: '🔪', desc: '지문이 묻은 공용 도구.' },
  { id: 'picture', name: '훼손된 그림', icon: '🖼️', desc: '붉은 물감으로 뒤덮인 태오의 작품.' },
  { id: 'cctv', name: '복도 CCTV', icon: '📹', desc: '15:58~16:02 복도에 아무도 없었다.' },
  { id: 'floor_map', name: '미술실 도면', icon: '🗺️', desc: '앞문과 뒷문 2개 출구.' },
  { id: 'storage_photo', name: '창고 창문 사진', icon: '🪟', desc: '쇠창살로 완전히 막혀있음.' },
  { id: 'police_report', name: '수색 보고서', icon: '👮', desc: '창고 안 아무도 없었음.' },
  { id: 'apron', name: '지민의 앞치마', icon: '🎽', desc: '물감 한 방울 없이 깨끗.' },
  { id: 'floor_photo', name: '현장 바닥 사진', icon: '📸', desc: '반경 2m 물감 범벅.' },
  { id: 'stained_glove', name: '태오의 장갑', icon: '🥊', desc: '★결정적★ 붉은 물감 범벅. [태오] 이름.' },
  { id: 'witness_statement', name: '태오 최초 진술서', icon: '📋', desc: '"복도로 도망"이라 진술.' }
];

// ==================== [스크립트] ====================
const FULL_SCRIPT = [
  // 프롤로그
  { type: 'scene', bg: 'bg-gradient-to-b from-slate-900 to-black' },
  { type: 'talk', char: 'narrator', text: "어느 날 오후, 세화고 미술실에서 충격적인 사건이 발생했다." },
  { type: 'scene', bg: 'bg-gradient-to-br from-red-950 to-slate-900' },
  { type: 'talk', char: 'narrator', text: "미술부 부장 최태오의 수상작이 무참히 훼손당했다." },
  { type: 'talk', char: 'witness', text: "내 그림이... 내 그림이!!!!", face: 'angry' },
  { type: 'talk', char: 'narrator', text: "현장에 있던 유일한 사람, 이지민." },
  { type: 'talk', char: 'jimin', text: "저... 정말 아니에요...", face: 'normal' },
  { type: 'scene', bg: 'bg-gradient-to-b from-slate-900 to-slate-800' },
  { type: 'talk', char: 'narrator', text: "3일 후, 김변호는 지민의 변호를 맡기로 했다." },
  { type: 'talk', char: 'player', text: "걱정 마세요. 반드시 진실을 밝혀내겠습니다!" },
  
  // 탐정 파트 1
  { type: 'scene', bg: 'bg-gradient-to-br from-indigo-950 to-slate-900' },
  { type: 'talk', char: 'narrator', text: "탐정 파트 1: 충격의 현장" },
  { type: 'talk', char: 'player', text: "(미술실... 여기서 모든 일이 벌어졌어.)" },
  { type: 'talk', char: 'police', text: "변호사님, 아직 수사 중입니다. 증거는 나중에 법정에서 보세요." },
  
  { 
    type: 'choice',
    question: "경찰이 출입을 막고 있다.",
    options: [
      { text: "정중히 부탁한다", next: 'polite_ask', success: true },
      { text: "강제로 밀고 들어간다", next: 'force_enter', success: false },
      { text: "나중에 다시 온다", next: 'come_later', success: false }
    ]
  },
  
  { id: 'polite_ask', type: 'talk', char: 'player', text: "저는 피고인 변호사입니다. 변호 준비를 위해 현장 확인이 필요합니다." },
  { type: 'talk', char: 'police', text: "...알겠습니다. 단, 만지지는 마세요." },
  { type: 'talk', char: 'player', text: "(좋아, 들어갈 수 있게 됐어!)" },
  { type: 'jump', to: 'scene1_investigate' },
  
  { id: 'force_enter', type: 'talk', char: 'police', text: "뭐 하시는 겁니까?! 이건 증거 인멸 방해입니다!" },
  { type: 'talk', char: 'player', text: "(젠장... 실패했어. 다시 시도해야겠다.)" },
  { type: 'jump', to: 'investigation_1_start' },
  
  { id: 'come_later', type: 'talk', char: 'player', text: "(너무 소극적이었나... 다시 시도하자.)" },
  { type: 'jump', to: 'investigation_1_start' },
  
  { id: 'scene1_investigate', type: 'scene', bg: 'bg-gradient-to-br from-indigo-950 to-slate-900' },
  { type: 'talk', char: 'player', text: "(멀리서라도 관찰해보자... 뭔가 단서가 있을 거야.)" },
  
  {
    type: 'mini_game',
    game_type: 'observation',
    instruction: "현장을 관찰하세요",
    items: [
      { id: 'mess', name: '바닥 물감', result: 'floor_photo', correct: true },
      { id: 'chair', name: '의자', result: null, correct: false },
      { id: 'painting', name: '그림', result: 'picture', correct: true }
    ]
  },
  
  { type: 'talk', char: 'player', text: "(현장 사진을 찍었다. 반경 2m가 난장판이야...)" },
  { type: 'scene', bg: 'bg-gradient-to-b from-gray-900 to-slate-900' },
  { type: 'talk', char: 'jimin', text: "변호사님... 저... 정말...", face: 'normal' },
  { type: 'talk', char: 'player', text: "(지민이가 너무 겁먹었어... 지금은 말을 못 하겠군.)" },
  
  // 탐정 파트 2
  { type: 'scene', bg: 'bg-gradient-to-br from-gray-900 to-slate-900' },
  { type: 'talk', char: 'narrator', text: "탐정 파트 2: 최초의 의심" },
  { type: 'talk', char: 'member', text: "(...저기요, 변호사님...)" },
  { type: 'talk', char: 'member', text: "태오 부장... 요즘 지민이만 보면 얼굴이 굳었어요." },
  { type: 'talk', char: 'witness', text: "(...뭔가 수군대네?)", face: 'normal' },
  { type: 'talk', char: 'member', text: "앗! 태오 부장!" },
  { type: 'anim', name: 'run_away' },
  
  { type: 'scene', bg: 'bg-gradient-to-b from-slate-800 to-slate-900' },
  { type: 'talk', char: 'player', text: "(CCTV실 문이... 잠겨있다!)" },
  
  {
    type: 'choice',
    question: "CCTV실 문이 잠겨있다.",
    options: [
      { text: "선생님을 찾아 부탁한다", next: 'ask_teacher', success: true },
      { text: "문을 억지로 연다", next: 'break_door', success: false }
    ]
  },
  
  { id: 'ask_teacher', type: 'scene', bg: 'bg-gradient-to-br from-teal-950 to-slate-900' },
  { type: 'talk', char: 'teacher', text: "아, CCTV요? 여기 있습니다." },
  { type: 'evidence_add', id: 'cctv' },
  { type: 'talk', char: 'player', text: "(좋아! CCTV 획득!)" },
  { type: 'jump', to: 'investigation_2_end' },
  
  { id: 'break_door', type: 'talk', char: 'player', text: "(너무 위험해... 다른 방법을 찾자.)" },
  { type: 'jump', to: 'investigation_2_start' },
  
  { id: 'investigation_2_end', type: 'talk', char: 'player', text: "(복도 CCTV... 아무도 없어!)" },
  
  // 탐정 파트 3
  { type: 'scene', bg: 'bg-gradient-to-br from-amber-950 to-slate-900' },
  { type: 'talk', char: 'narrator', text: "탐정 파트 3: 창고의 비밀" },
  { type: 'talk', char: 'player', text: "(창고... 탈출 경로일까?)" },
  
  {
    type: 'mini_game',
    game_type: 'search',
    instruction: "창고를 수색하세요",
    attempts: 3,
    items: [
      { id: 'window', name: '창문', result: 'storage_photo' },
      { id: 'report', name: '수색 보고서', result: 'police_report' }
    ]
  },
  
  { type: 'talk', char: 'player', text: "(쇠창살이... 탈출 불가능이야!)" },
  { type: 'evidence_add', id: 'storage_photo' },
  { type: 'evidence_add', id: 'police_report' },
  { type: 'scene', bg: 'bg-gradient-to-br from-teal-950 to-slate-900' },
  { type: 'talk', char: 'teacher', text: "미술실 도면이요? 여기 있습니다." },
  { type: 'evidence_add', id: 'floor_map' },
  
  // 탐정 파트 4
  { type: 'scene', bg: 'bg-gradient-to-br from-indigo-950 to-slate-900' },
  { type: 'talk', char: 'narrator', text: "탐정 파트 4: 쓰레기통 속 진실" },
  { type: 'talk', char: 'player', text: "(쓰레기통... 안을 뒤져볼까?)" },
  
  {
    type: 'mini_game',
    game_type: 'timing',
    instruction: "청소부가 오기 전에 빨리!",
    time_limit: 5,
    result: 'stained_glove'
  },
  
  { type: 'talk', char: 'player', text: "(장갑?! [태오]라는 이름이!)" },
  { type: 'talk', char: 'janitor', text: "여기서 뭐하는 거야?!" },
  
  {
    type: 'choice',
    question: "청소부가 다가온다!",
    options: [
      { text: "장갑을 재빨리 숨긴다", next: 'hide_glove', success: true },
      { text: "정직하게 말한다", next: 'tell_truth', success: false }
    ]
  },
  
  { id: 'hide_glove', type: 'talk', char: 'player', text: "볼펜을 떨어뜨려서요..." },
  { type: 'evidence_add', id: 'stained_glove' },
  { type: 'talk', char: 'player', text: "(증거 확보!)" },
  { type: 'jump', to: 'investigation_4_end' },
  
  { id: 'tell_truth', type: 'talk', char: 'janitor', text: "경찰에 신고하겠어!" },
  { type: 'jump', to: 'investigation_4_start' },
  
  { id: 'investigation_4_end', type: 'talk', char: 'witness', text: "뭘 찾으시는 거죠?", face: 'normal' },
  { type: 'talk', char: 'player', text: "(태오가 의심하고 있어...)" },
  
  // 탐정 파트 5
  { type: 'scene', bg: 'bg-gradient-to-br from-purple-950 to-slate-900' },
  { type: 'talk', char: 'narrator', text: "탐정 파트 5: 마지막 퍼즐" },
  { type: 'talk', char: 'player', text: "지민 양, 앞치마를 볼 수 있을까요?" },
  { type: 'talk', char: 'jimin', text: "저... 태오 부장이...", face: 'normal' },
  
  {
    type: 'choice',
    question: "지민이가 두려워하고 있다.",
    options: [
      { text: "따뜻하게 격려한다", next: 'encourage', success: true },
      { text: "강압적으로 요구한다", next: 'force_apron', success: false }
    ]
  },
  
  { id: 'encourage', type: 'talk', char: 'player', text: "제가 당신을 지킬게요. 용기를 내세요." },
  { type: 'talk', char: 'jimin', text: "...여기... 앞치마예요.", face: 'normal' },
  { type: 'evidence_add', id: 'apron' },
  { type: 'jump', to: 'investigation_complete' },
  
  { id: 'force_apron', type: 'talk', char: 'player', text: "(너무 했군...)" },
  { type: 'jump', to: 'investigation_5_start' },
  
  { id: 'investigation_complete', type: 'scene', bg: 'bg-gradient-to-b from-slate-900 to-black' },
  { type: 'talk', char: 'narrator', text: "탐정 파트 완료" },
  { type: 'talk', char: 'player', text: "(이제 재판에서 진실을 밝힐 시간이야!)" },
  
  // 재판 1
  { type: 'scene', bg: 'bg-gradient-to-b from-slate-900 to-slate-800' },
  { type: 'talk', char: 'narrator', text: "제1회 공판" },
  { type: 'talk', char: 'judge', text: "재판을 시작합니다." },
  { type: 'talk', char: 'prosecutor', text: "증거는 세 가지입니다. ① 나이프 지문, ② 목격자, ③ 스케치북!", face: 'normal' },
  { type: 'anim', name: 'witness_enter' },
  { type: 'talk', char: 'witness', text: "미술부 부장 최태오입니다.", face: 'normal' },
  
  {
    type: 'cross_exam',
    title: '목격 증언',
    statements: [
      {
        text: "저는 4시에 앞문으로 미술실에 들어갔습니다.",
        weakness: false,
        press: "4시 정확히 들어갔나요?",
        pressResponse: [
          { type: 'talk', char: 'witness', text: "네, 시계를 봤습니다.", face: 'normal' }
        ]
      },
      {
        text: "그림이 망가져 있었고, 지민이가 나이프를 들고 있었습니다.",
        weakness: false,
        press: "정확히 '들고' 있었나요?",
        pressResponse: [
          { type: 'talk', char: 'witness', text: "옆에 떨어져 있었던 것 같네요.", face: 'sweat' }
        ]
      },
      {
        text: "지민이는 복도로 뛰어갔습니다!",
        weakness: true,
        contradiction: 'cctv',
        failMsg: "복도 CCTV와 관련이 있을 것 같은데..."
      }
    ]
  },
  
  { type: 'anim', name: 'objection' },
  { type: 'talk', char: 'player', text: "이의 있습니다!", size: 'text-3xl', color: 'text-blue-400' },
  { type: 'evidence_flash', id: 'cctv' },
  { type: 'talk', char: 'player', text: "복도 CCTV를 보십시오! 15:58~16:02 사이 아무도 없었습니다!", size: 'text-2xl' },
  { type: 'talk', char: 'prosecutor', text: "스케치북은 16:05에 발견됐습니다! CCTV가 끊긴 후입니다!", face: 'normal' },
  { type: 'talk', char: 'player', text: "하지만 전체 CCTV를 보면 완전히 비어있습니다!" },
  { type: 'talk', char: 'witness', text: "그, 그건...", face: 'sweat' },
  
  // 재판 2
  { type: 'talk', char: 'witness', text: "복도가 아니라 뒷문으로 창고에 갔어요!", face: 'normal' },
  
  {
    type: 'cross_exam',
    title: '수정된 증언',
    statements: [
      {
        text: "지민이는 뒷문으로 창고에 들어갔습니다.",
        weakness: false,
        press: "직접 봤나요?",
        pressResponse: [
          { type: 'talk', char: 'witness', text: "네! 뒷문이 열리는 걸 봤어요!", face: 'normal' }
        ]
      },
      {
        text: "창고를 열었을 땐 비어있었어요. 창문으로 탈출했을 겁니다!",
        weakness: true,
        contradiction: 'storage_photo',
        failMsg: "창고 창문에 대한 증거가..."
      }
    ]
  },
  
  { type: 'anim', name: 'objection' },
  { type: 'talk', char: 'player', text: "불가능합니다!", size: 'text-3xl', color: 'text-red-500' },
  { type: 'evidence_flash', id: 'storage_photo' },
  { type: 'talk', char: 'player', text: "쇠창살로 막혀있습니다! 탈출 불가능!", size: 'text-2xl' },
  
  // 재판 3
  {
    type: 'cross_exam',
    title: '현장 목격',
    isFinal: true,
    statements: [
      {
        text: "지민이가 나이프로 물감통을 찔렀습니다!",
        weakness: false,
        press: "직접 봤나요?",
        pressResponse: [
          { type: 'talk', char: 'witness', text: "펑 하고 터지는 걸 봤어요!", face: 'angry' }
        ]
      },
      {
        text: "지민이는 온몸에 물감을 뒤집어쓰고 웃고 있었어요!",
        weakness: true,
        contradiction: 'apron',
        failMsg: "지민의 옷에 관한 증거가..."
      }
    ]
  },
  
  { type: 'anim', name: 'objection' },
  { type: 'talk', char: 'player', text: "온몸에 물감을 뒤집어썼다고요?!", size: 'text-4xl text-red-500' },
  { type: 'evidence_flash', id: 'apron' },
  { type: 'talk', char: 'player', text: "지민의 앞치마를 보십시오! 물감 한 방울도 없습니다!", size: 'text-2xl' },
  
  // 재판 4
  { type: 'talk', char: 'witness', text: "저는 물감에 손도 안 댔어요!", face: 'sweat' },
  { type: 'evidence_flash', id: 'stained_glove' },
  { type: 'talk', char: 'player', text: "쓰레기통에서 발견된 물감 범벅 장갑! 손목에 [태오]라고 적혀있습니다!", size: 'text-3xl' },
  { type: 'talk', char: 'witness', text: "으... 으아아아악!", face: 'breakdown' },
  
  // 결말
  { type: 'anim', name: 'confetti' },
  { type: 'talk', char: 'witness', text: "...다 제가 했어요.", face: 'breakdown' },
  { type: 'talk', char: 'judge', text: "피고인 이지민에게 무죄를 선고합니다!", size: 'text-3xl' },
  { type: 'talk', char: 'narrator', text: "김변호는 또 한 번 역전승을 거두었다." },
  
  { type: 'end', text: "THE END" }
];

// ==================== [게임 엔진] ====================
function AceAttorneyGame() {
  const [index, setIndex] = useState(0);
  const [collectedEvidence, setCollectedEvidence] = useState([]);
  const [currentBg, setCurrentBg] = useState('bg-gradient-to-b from-slate-900 to-black');
  const [hp, setHp] = useState(5);
  const [shake, setShake] = useState(false);
  const [flash, setFlash] = useState(false);
  const [effectText, setEffectText] = useState(null);
  const [isEnding, setIsEnding] = useState(false);
  
  const [evidenceMode, setEvidenceMode] = useState(false);
  const [pressMode, setPressMode] = useState(false);
  const [pressIndex, setPressIndex] = useState(0);
  const [choiceMode, setChoiceMode] = useState(false);
  const [miniGameMode, setMiniGameMode] = useState(false);
  const [miniGameData, setMiniGameData] = useState(null);
  const [ceIndex, setCeIndex] = useState(0);
  
  const currentLine = FULL_SCRIPT[index] || {};
  const isCE = currentLine.type === 'cross_exam';
  const stmt = isCE ? currentLine.statements?.[ceIndex] : null;
  const txt = pressMode && stmt?.pressResponse?.[pressIndex]?.text 
    ? stmt.pressResponse[pressIndex].text 
    : isCE ? stmt?.text : currentLine.text;
  const char = (() => {
    if (pressMode && stmt?.pressResponse?.[pressIndex]?.char) {
      return CHARACTERS[stmt.pressResponse[pressIndex].char];
    }
    if (isCE) return CHARACTERS.witness;
    return currentLine.char ? CHARACTERS[currentLine.char] : null;
  })();
  const charFace = (() => {
    if (pressMode && stmt?.pressResponse?.[pressIndex]?.face) {
      return stmt.pressResponse[pressIndex].face;
    }
    return currentLine.face || 'normal';
  })();

  const handleNext = () => {
    if (evidenceMode || pressMode || choiceMode || miniGameMode || isEnding) return;
    
    if (isCE) {
      setCeIndex(prev => (prev + 1) % currentLine.statements.length);
      return;
    }

    if (currentLine.type === 'jump') {
      const target = FULL_SCRIPT.findIndex(l => l.id === currentLine.to);
      setIndex(target !== -1 ? target : index + 1);
      return;
    }

    setIndex(prev => Math.min(prev + 1, FULL_SCRIPT.length - 1));
  };

  const handleChoice = (option) => {
    const target = FULL_SCRIPT.findIndex(l => l.id === option.next);
    setIndex(target !== -1 ? target : index + 1);
    setChoiceMode(false);
  };

  const handleMiniGameComplete = (success, evidenceId) => {
    if (success && evidenceId) {
      const ev = ALL_EVIDENCE.find(e => e.id === evidenceId);
      if (ev && !collectedEvidence.some(e => e.id === evidenceId)) {
        setCollectedEvidence([...collectedEvidence, ev]);
      }
    }
    setMiniGameMode(false);
    setMiniGameData(null);
    setIndex(index + 1);
  };

  const addEvidence = (id) => {
    const ev = ALL_EVIDENCE.find(e => e.id === id);
    if (ev && !collectedEvidence.some(e => e.id === id)) {
      setCollectedEvidence([...collectedEvidence, ev]);
      setFlash(true);
      setTimeout(() => setFlash(false), 300);
    }
  };

  const handlePress = () => {
    if (!isCE || !stmt?.pressResponse) {
      return;
    }
    setPressMode(true);
    setPressIndex(0);
  };

  const handlePressNext = () => {
    if (!stmt?.pressResponse) return;
    if (pressIndex < stmt.pressResponse.length - 1) {
      setPressIndex(pressIndex + 1);
    } else {
      setPressMode(false);
      setPressIndex(0);
    }
  };

  const presentEvidence = (id) => {
    if (!isCE || !stmt) return;
    
    if (stmt.weakness && stmt.contradiction === id) {
      setEffectText("OBJECTION!");
      setShake(true);
      setTimeout(() => {
        setEffectText(null);
        setShake(false);
        setEvidenceMode(false);
        setCeIndex(0);
        setIndex(index + 1);
      }, 1500);
    } else {
      const newHp = Math.max(0, hp - 1);
      setHp(newHp);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      if (newHp <= 0) {
        alert("HP 0. 게임 오버!");
        window.location.reload();
      }
    }
  };

  useEffect(() => {
    if (!currentLine?.type) return;
    
    const type = currentLine.type;
    
    if (type === 'scene') {
      if (currentLine.bg) setCurrentBg(currentLine.bg);
      setIndex(index + 1);
    }
    else if (type === 'evidence_add') {
      addEvidence(currentLine.id);
      setIndex(index + 1);
    }
    else if (type === 'choice') {
      setChoiceMode(true);
    }
    else if (type === 'mini_game') {
      setMiniGameMode(true);
      setMiniGameData(currentLine);
    }
    else if (type === 'anim') {
      const name = currentLine.name;
      if (name === 'objection') {
        setEffectText("OBJECTION!");
        setShake(true);
        setTimeout(() => {
          setEffectText(null);
          setShake(false);
          setIndex(index + 1);
        }, 1500);
      } else if (name === 'witness_enter' || name === 'run_away') {
        setFlash(true);
        setTimeout(() => {
          setFlash(false);
          setIndex(index + 1);
        }, 500);
      } else if (name === 'confetti') {
        setEffectText("VICTORY");
        setTimeout(() => {
          setEffectText(null);
          setIndex(index + 1);
        }, 2000);
      } else {
        setIndex(index + 1);
      }
    }
    else if (type === 'evidence_flash') {
      setFlash(true);
      setTimeout(() => {
        setFlash(false);
        setIndex(index + 1);
      }, 500);
    }
    else if (type === 'end') {
      setIsEnding(true);
    }
  }, [index, currentLine?.type]);

  if (isEnding) {
    return (
      <div className="h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white flex flex-col items-center justify-center p-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500 rounded-full blur-3xl"></div>
        </div>
        <div className="relative z-10 text-center">
          <Scale className="w-24 h-24 mx-auto mb-8 text-blue-400" strokeWidth={1.5} />
          <h1 className="text-7xl font-bold mb-6 tracking-tight" style={{ fontFamily: 'Georgia, serif' }}>
            역전의 미술실
          </h1>
          <div className="w-24 h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent mx-auto mb-8"></div>
          <p className="text-xl text-gray-300 mb-12 max-w-lg mx-auto leading-relaxed" style={{ fontFamily: 'system-ui, sans-serif' }}>
            지민이의 누명은 벗겨졌고, 진범 최태오는 처벌을 받았습니다.
            <br/>김변호의 명성은 더욱 높아졌습니다.
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-10 py-4 bg-white text-black font-semibold rounded-md hover:bg-gray-100 transition-all duration-300 hover:scale-105"
            style={{ fontFamily: 'system-ui, sans-serif' }}
          >
            처음부터 다시하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-screen w-full relative overflow-hidden select-none transition-all duration-700 ${currentBg} ${shake ? 'animate-shake' : ''}`}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&family=Inter:wght@400;500;600;700&display=swap');
        
        @keyframes shake {
          0%, 100% { transform: translate(0); }
          25% { transform: translate(-8px, 4px); }
          75% { transform: translate(8px, -4px); }
        }
        .animate-shake { animation: shake 0.25s ease-in-out 3; }
        
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in { animation: fadeIn 0.5s ease-out; }
      `}</style>

      {/* 배경 그라데이션 오버레이 */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none"></div>

      {/* HP 바 - 미니멀 디자인 */}
      <div className="absolute top-8 left-8 z-50">
        <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md px-5 py-3 rounded-full border border-white/10">
          <Scale className="w-5 h-5 text-blue-400" strokeWidth={2} />
          <div className="flex gap-1.5">
            {[...Array(5)].map((_, i) => (
              <div 
                key={i} 
                className={`w-2 h-2 rounded-full transition-all duration-300 ${i < hp ? 'bg-blue-400 shadow-lg shadow-blue-400/50' : 'bg-gray-700'}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 증거 카운터 */}
      <div className="absolute top-8 right-8 z-50">
        <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md px-5 py-3 rounded-full border border-white/10">
          <FileText className="w-5 h-5 text-amber-400" strokeWidth={2} />
          <span className="text-sm font-semibold text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
            {collectedEvidence.length} / 10
          </span>
        </div>
      </div>

      {/* 특수 효과 - OBJECTION */}
      {effectText && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-gradient-to-br from-blue-600/20 to-red-600/20 backdrop-blur-sm">
          <div className="relative">
            <div className="absolute inset-0 bg-white/10 blur-3xl animate-pulse"></div>
            <h1 
              className="relative text-9xl font-bold tracking-tighter text-white drop-shadow-2xl"
              style={{ 
                fontFamily: 'Crimson Pro, serif',
                textShadow: '0 0 40px rgba(59, 130, 246, 0.8), 0 0 80px rgba(59, 130, 246, 0.4)'
              }}
            >
              {effectText}
            </h1>
          </div>
        </div>
      )}

      {flash && (
        <div className="absolute inset-0 z-[90] bg-white/20 pointer-events-none" 
             style={{ animation: 'fadeIn 0.15s ease-out reverse' }}></div>
      )}

      {/* 캐릭터 표시 - 미니멀 아바타 */}
      {char && (
        <div className="absolute bottom-80 left-1/2 transform -translate-x-1/2 z-10 animate-fade-in">
          <div className="relative">
            {/* 글로우 효과 */}
            <div 
              className="absolute inset-0 rounded-full blur-2xl opacity-30"
              style={{ backgroundColor: char.color }}
            ></div>
            {/* 아바타 */}
            <img 
              src={char.avatars?.[charFace] || char.avatar} 
              alt={char.name}
              className="relative w-32 h-32 rounded-full border-2 border-white/20 shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* 심문 상태 표시 - 미니멀 */}
      {isCE && (
        <div className="absolute top-32 left-1/2 transform -translate-x-1/2 z-20 animate-slide-up">
          <div className={`px-8 py-3 rounded-full border ${
            currentLine.isFinal 
              ? 'bg-red-950/80 border-red-500/50 text-red-200' 
              : 'bg-blue-950/80 border-blue-500/50 text-blue-200'
          } backdrop-blur-md`}>
            <div className="flex items-center gap-3">
              <AlertCircle className="w-4 h-4" strokeWidth={2} />
              <span className="text-sm font-semibold" style={{ fontFamily: 'Inter, sans-serif' }}>
                {currentLine.isFinal ? '최후의 증언' : currentLine.title} · {ceIndex + 1}/{currentLine.statements?.length}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 대화창 - 현대적 디자인 */}
      <div 
        onClick={pressMode ? handlePressNext : handleNext}
        className={`absolute bottom-0 left-0 right-0 p-8 z-30 transition-all duration-500 ${
          evidenceMode || choiceMode || miniGameMode ? 'translate-y-full opacity-0' : 'translate-y-0 opacity-100'
        }`}
      >
        <div className="max-w-5xl mx-auto">
          {/* 캐릭터 이름 태그 */}
          {char && (
            <div className="mb-3 ml-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-t-xl bg-black/60 backdrop-blur-md border-t border-x border-white/10">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: char.color }}></div>
                <span className="text-sm font-semibold text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
                  {char.name}
                </span>
              </div>
            </div>
          )}
          
          {/* 대화 박스 */}
          <div className="relative bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 min-h-[160px] cursor-pointer hover:border-white/20 transition-all duration-300 group">
            <p 
              className={`text-xl leading-relaxed ${currentLine.color || 'text-white'} ${currentLine.size || ''}`}
              style={{ fontFamily: 'Inter, sans-serif', fontWeight: 500 }}
            >
              {txt}
            </p>

            {/* 심문 버튼 */}
            {isCE && !pressMode && (
              <div className="absolute -top-20 right-0 flex gap-3">
                <button 
                  onClick={(e) => { e.stopPropagation(); handlePress(); }}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600/90 hover:bg-blue-500 text-white font-semibold rounded-xl backdrop-blur-sm transition-all duration-300 hover:scale-105 border border-blue-400/30"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  <Search className="w-5 h-5" strokeWidth={2} />
                  <span>추궁</span>
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setEvidenceMode(true); }}
                  className="flex items-center gap-2 px-6 py-3 bg-amber-600/90 hover:bg-amber-500 text-white font-semibold rounded-xl backdrop-blur-sm transition-all duration-300 hover:scale-105 border border-amber-400/30"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  <FileText className="w-5 h-5" strokeWidth={2} />
                  <span>증거 제시</span>
                </button>
              </div>
            )}

            {/* 클릭 인디케이터 */}
            <div className="absolute bottom-6 right-6 opacity-40 group-hover:opacity-100 transition-opacity">
              <ChevronRight className="w-6 h-6 text-white animate-pulse" strokeWidth={2} />
            </div>
          </div>
        </div>
      </div>

      {/* 선택지 - 미니멀 카드 */}
      {choiceMode && currentLine.options && (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-xl z-40 flex items-center justify-center p-8">
          <div className="max-w-2xl w-full space-y-6 animate-slide-up">
            <h2 className="text-2xl font-semibold text-white text-center mb-8" style={{ fontFamily: 'Crimson Pro, serif' }}>
              {currentLine.question}
            </h2>
            <div className="space-y-4">
              {currentLine.options.map((opt, i) => (
                <button 
                  key={i}
                  onClick={() => handleChoice(opt)}
                  className="w-full p-6 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl text-left transition-all duration-300 hover:scale-[1.02] group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-semibold group-hover:bg-blue-500/30 transition-colors">
                      {i + 1}
                    </div>
                    <span className="text-lg font-medium text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
                      {opt.text}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 미니게임 - 현대적 그리드 */}
      {miniGameMode && miniGameData && (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-xl z-40 flex items-center justify-center p-8">
          <div className="max-w-4xl w-full animate-slide-up">
            <h2 className="text-3xl font-semibold text-white text-center mb-12" style={{ fontFamily: 'Crimson Pro, serif' }}>
              {miniGameData.instruction}
            </h2>
            
            {(miniGameData.game_type === 'observation' || miniGameData.game_type === 'search') && (
              <div className="grid grid-cols-2 gap-6">
                {miniGameData.items.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => handleMiniGameComplete(item.correct || true, item.result)}
                    className="p-8 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-400/50 rounded-2xl transition-all duration-300 hover:scale-105 group"
                  >
                    <div className="text-center">
                      <div className="text-5xl mb-4 opacity-60 group-hover:opacity-100 transition-opacity">
                        {item.id === 'mess' ? '🎨' : item.id === 'painting' ? '🖼️' : item.id === 'window' ? '🪟' : '📋'}
                      </div>
                      <h3 className="text-xl font-semibold text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
                        {item.name}
                      </h3>
                    </div>
                  </button>
                ))}
              </div>
            )}
            
            {miniGameData.game_type === 'timing' && (
              <div className="flex justify-center">
                <button
                  onClick={() => handleMiniGameComplete(true, miniGameData.result)}
                  className="px-16 py-12 bg-red-600/80 hover:bg-red-500 text-white text-2xl font-bold rounded-2xl transition-all duration-300 hover:scale-110 border-2 border-red-400/30 animate-pulse"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  빨리 클릭! ⏱️
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 증거창 - 갤러리 스타일 */}
      {evidenceMode && (
        <div className="absolute inset-0 bg-black/95 backdrop-blur-xl z-40 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-8">
            <div className="flex items-center justify-between mb-12">
              <div className="flex items-center gap-4">
                <FileText className="w-8 h-8 text-amber-400" strokeWidth={2} />
                <h2 className="text-3xl font-semibold text-white" style={{ fontFamily: 'Crimson Pro, serif' }}>
                  증거 목록
                </h2>
              </div>
              <button 
                onClick={() => setEvidenceMode(false)}
                className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl border border-white/10 transition-all"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                닫기
              </button>
            </div>
            
            {collectedEvidence.length === 0 ? (
              <div className="text-center text-gray-400 py-32">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" strokeWidth={1} />
                <p className="text-xl" style={{ fontFamily: 'Inter, sans-serif' }}>수집한 증거가 없습니다</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {collectedEvidence.map(item => (
                  <button
                    key={item.id}
                    onClick={() => presentEvidence(item.id)}
                    className="p-6 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-400/50 rounded-2xl transition-all duration-300 hover:scale-[1.02] text-left group"
                  >
                    <div className="flex items-start gap-6">
                      <div className="text-5xl flex-shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                        {item.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-semibold text-white mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                          {item.name}
                        </h3>
                        <p className="text-sm text-gray-400 leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
                          {item.desc}
                        </p>
                        <div className="mt-3 text-xs text-amber-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                          클릭하여 제시 →
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AceAttorneyGame;
