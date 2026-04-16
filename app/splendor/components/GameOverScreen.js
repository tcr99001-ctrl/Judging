'use client';

import React, { useMemo } from 'react';
import { Crown, Home, Link2, Trophy } from 'lucide-react';
import AssetImage from './AssetImage';
import { UI_ASSET } from '../shared/assets';
import { MOTIVES, METHODS, SUSPECTS } from '../shared/caseData';
import { CASE_TITLE } from '../shared/constants';
import { comparePlayersForVictory, getDisplayName, resolveCaseProgress } from '../shared/utils';

function namesFor(kind, ids = []) {
  if (kind === 'suspect') return ids.map((id) => SUSPECTS.find((item) => item.id === id)?.name || id);
  if (kind === 'motive') return ids.map((id) => MOTIVES.find((item) => item.id === id)?.label || id);
  return ids.map((id) => METHODS.find((item) => item.id === id)?.label || id);
}

export default function GameOverScreen({ roomData, players, roomCode, onCopyInvite, onGoLobby }) {
  const reveal = roomData?.reveal || null;
  const reports = useMemo(() => {
    if (Array.isArray(roomData?.finalReports) && roomData.finalReports.length) return roomData.finalReports;
    return [...players].sort(comparePlayersForVictory).map((player) => ({
      id: player.id,
      name: getDisplayName(player),
      caseProgress: resolveCaseProgress(player),
      cluesCount: (player.clues || player.cards || []).length,
      witnessesCount: (player.witnesses || player.nobles || []).length,
      accusationLocked: !!player.accusationLocked,
      remainingSuspects: [],
      remainingMotives: [],
      remainingMethods: [],
      notes: [],
      accusationHistory: [],
    }));
  }, [players, roomData?.finalReports]);

  return (
    <div className="app-shell game-surface">
      <div className="mx-auto min-h-screen w-full max-w-[480px] px-3 py-4">
        <section className="panel overflow-hidden">
          <div className="relative border-b border-white/10 px-4 py-6 text-center">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.18),_transparent_45%)]" />
            <div className="relative z-[1] mx-auto flex max-w-sm flex-col items-center">
              <div className="rounded-full border border-amber-300/25 bg-amber-500/10 p-4">
                <AssetImage src={UI_ASSET.victoryCrown} className="h-16 w-16" decorative />
              </div>
              <div className="mt-3 text-[11px] font-black tracking-[0.18em] text-amber-200/80">사건 종결</div>
              <h1 className="mt-2 text-2xl font-black text-white">{CASE_TITLE}</h1>
              <div className="mt-2 text-lg font-black text-amber-50">{reveal?.headline || '막이 내렸다'}</div>
              <div className="mt-3 text-sm font-bold leading-6 text-slate-200">{reveal?.summary || '누군가 마지막 가면을 벗겼다.'}</div>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <span className="rounded-full border border-white/10 bg-slate-900/52 px-3 py-1.5 text-[11px] font-black text-slate-100">방 코드 {roomCode}</span>
                {roomData?.winnerId ? <span className="rounded-full border border-emerald-300/25 bg-emerald-500/12 px-3 py-1.5 text-[11px] font-black text-emerald-50">승자 {reports.find((report) => report.id === roomData.winnerId)?.name || '수사관'}</span> : null}
              </div>
            </div>
          </div>

          <div className="grid gap-4 px-4 py-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-slate-900/46 px-4 py-3">
                <div className="text-[11px] font-black tracking-[0.16em] text-slate-400">범인</div>
                <div className="mt-2 text-sm font-black text-white">{reveal?.culpritName || '불명'}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/46 px-4 py-3">
                <div className="text-[11px] font-black tracking-[0.16em] text-slate-400">동기</div>
                <div className="mt-2 text-sm font-black text-white">{reveal?.motiveLabel || '불명'}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/46 px-4 py-3">
                <div className="text-[11px] font-black tracking-[0.16em] text-slate-400">수법</div>
                <div className="mt-2 text-sm font-black text-white">{reveal?.methodLabel || '불명'}</div>
              </div>
            </div>

            {Array.isArray(reveal?.endingLines) && reveal.endingLines.length ? (
              <div className="rounded-2xl border border-amber-300/20 bg-amber-500/10 px-4 py-4 text-sm font-bold leading-6 text-amber-50">
                {reveal.endingLines.map((line) => <div key={line}>{line}</div>)}
              </div>
            ) : null}

            <div className="grid gap-2">
              {reports.map((report, index) => (
                <article
                  key={report.id}
                  className={[
                    'rounded-3xl border px-4 py-4',
                    report.id === roomData?.winnerId ? 'border-amber-300/25 bg-amber-500/10' : 'border-white/10 bg-slate-900/44',
                  ].join(' ')}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-sm font-black text-white">
                        <span>{index + 1}위 · {report.name}</span>
                        {report.id === roomData?.winnerId ? <span className="rounded-full border border-amber-300/25 bg-amber-500/12 px-2 py-0.5 text-[10px] text-amber-50">해결</span> : null}
                        {report.accusationLocked ? <span className="rounded-full border border-rose-300/25 bg-rose-500/12 px-2 py-0.5 text-[10px] text-rose-100">고발 봉인</span> : null}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-black text-slate-300">
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">진척 {report.caseProgress}</span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">단서 {report.cluesCount}</span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">추궁 {report.witnessesCount}</span>
                      </div>
                    </div>
                    {report.id === roomData?.winnerId ? <Crown size={18} className="text-amber-200" /> : null}
                  </div>

                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <div className="rounded-2xl border border-white/8 bg-white/5 px-3 py-3">
                      <div className="text-[11px] font-black tracking-[0.16em] text-slate-400">남긴 용의자</div>
                      <div className="mt-2 text-xs font-bold leading-5 text-slate-200">{namesFor('suspect', report.remainingSuspects).join(', ') || '기록 없음'}</div>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/5 px-3 py-3">
                      <div className="text-[11px] font-black tracking-[0.16em] text-slate-400">남긴 동기</div>
                      <div className="mt-2 text-xs font-bold leading-5 text-slate-200">{namesFor('motive', report.remainingMotives).join(', ') || '기록 없음'}</div>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/5 px-3 py-3">
                      <div className="text-[11px] font-black tracking-[0.16em] text-slate-400">남긴 수법</div>
                      <div className="mt-2 text-xs font-bold leading-5 text-slate-200">{namesFor('method', report.remainingMethods).join(', ') || '기록 없음'}</div>
                    </div>
                  </div>

                  {Array.isArray(report.notes) && report.notes.length ? (
                    <div className="mt-3 rounded-2xl border border-white/8 bg-slate-950/40 px-3 py-3 text-xs font-bold leading-5 text-slate-300">
                      {report.notes.slice(-2).map((note) => <div key={note}>{note}</div>)}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onCopyInvite}
                className="tap-feedback min-h-12 rounded-2xl border border-sky-300/25 bg-sky-500/12 px-4 py-3 text-sm font-black text-sky-50"
              >
                <span className="inline-flex items-center gap-2"><Link2 size={15} /> 복사</span>
              </button>
              <button
                type="button"
                onClick={onGoLobby}
                className="tap-feedback min-h-12 rounded-2xl border border-white/10 bg-slate-900/55 px-4 py-3 text-sm font-black text-slate-100"
              >
                <span className="inline-flex items-center gap-2"><Home size={15} /> 로비</span>
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
