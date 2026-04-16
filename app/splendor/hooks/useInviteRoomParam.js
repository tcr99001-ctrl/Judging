// app/splendor/hooks/useInviteRoomParam.js
'use client';

import { useEffect } from 'react';

/**
 * useInviteRoomParam
 *
 * URL 쿼리에서 ?room=ABCD 형태의 초대코드를 감지하여
 * - roomCode 세팅
 * - invite 모드 활성화
 *
 * 초기 1회만 실행되며, SSR 환경에서는 동작하지 않는다.
 */
export function useInviteRoomParam({ setRoomCode, setIsInviteMode }) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const code = params.get('room');

    // 방 코드는 4자리 영문 대문자 기준
    if (code && typeof code === 'string' && code.length === 4) {
      setRoomCode(code.toUpperCase());
      setIsInviteMode(true);
    }
  }, [setRoomCode, setIsInviteMode]);
}
