'use client';

import React, { useMemo } from 'react';
import { Crown, Home, Link2, Trophy } from 'lucide-react';
import AssetImage from './AssetImage';
import { UI_ASSET } from '../shared/assets';
import { MOTIVES, METHODS, SUSPECTS } from '../shared/caseData';
import { CASE_TITLE } from '../shared/constants';
import { comparePlayersForVictory, getDisplayName, resolveCaseProgress } from '../shared/utils';

function mapCandidateNames(kind, ids = []) {
  if (kind === 'suspect') return ids.map((id) => SUSPECTS.find((item) => item.id === id)?.name || id);
  if (kind === 'motive') return ids.map((id) => MOTIVES.find((item) => item.id === id)?.label || id);
  return ids.map((id) => METHODS.find((item) => item.id === id)?.label || id);
}

export default function GameOverScreen({ roomData, players, roomCode, onCopyInvite, onGoLobby }) {
  const reports = useMemo(() => {
    if (Array.isArray(roomData?.finalReports) && roomData.finalReports.length) return roomData.finalReports;
    return [...players]
      .sort(comparePlayersForVictory)
      .map((player) => ({
        id: player.id,
        name: getDisplayName(player),
        caseProgress: resolveCaseProgress(player),
        score: resolveCaseProgress(player),
        breakthroughs: Number(player.breakthroughs || 0),
        accusationLocked: !!player.accusationLocked,
        cluesCount: (player.clues || player.cards || []).length,
        witnessesCount: (player.witnesses || player.nobles || []).length,
        remainingSuspects: [],
        remainingMotives: [],
        remainingMethods: [],
        notes: [],
        accusationHistory: [],
      }));
  }, [players, roomData?.finalReports]);

  const winner = reports.find((report) => report.id === roomData?.winnerId) || reports[0] || null;
  const reveal = roomData?.reveal || null;

  return (
    <div className="app-shell game-surface safe-top safe-bottom">
      <div className="mx-auto flex h-full w-full max-w-5xl flex-col overflow-auto px-4 py-4">
        <div className="panel motion-panel-in mx-auto w-full max-w-4xl overflow-hidden">
          <div className="relative overflow-hidden border-b border-white/10 px-5 py-6">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.22),_transparent_45%)]" />
            <div className="relative z-[1] flex flex-col items-center text-center">
              <div className="rounded-full border border-amber-300/24 bg-amber-500/10 p-4">
                <AssetImage src={UI_ASSET.victoryCrown} className="h-20 w-20" decorative />
              </div>
              <div className="mt-4 text-[11px] font-black tracking-[0.24em] text-amber-200/80">사건 종결</div>
              <h1 className="mt-2 text-3xl font-black text-white">{CASE_TITLE}</h1>
              <div className="mt-2 text-lg font-black text-amber-50">{reveal?.headline || '사건의 막이 내렸다'}</div>
              <div className="mt-3 max-w-2xl text-sm font-bold leading-7 text-slate-200">{reveal?.summary || '누군가 끝내 마지막 가면을 벗겼다.'}</div>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <span className="rounded-full border border-white/10 bg-slate-900/55 px-3 py-2 text-sm font-black text-white">방 코드 {roomCode}</span>
                {winner ? <span className="rounded-full border border-emerald-300/24 bg-emerald-500/12 px-3 py-2 text-sm font-black text-emerald-50">승자 {winner.name}</span> : null}
              </div>
            </div>
          </div>

          <div className="grid gap-5 px-5 py-5 lg:grid-cols-[1fr_1.1fr]">
            <div className="space-y-4">
              <div className="panel-soft px-4 py-4">
                <div className="flex items-center gap-2 text-sm font-black text-white"><Trophy size={16} /> 진상</div>
                <div className="mt-3 space-y-2 text-sm font-bold leading-6 text-slate-200">
                  <p>범인: <span className="text-white">{reveal?.culpritName || '불명'}</span></p>
                  <p>동기: <span className="text-white">{reveal?.motiveLabel || '불명'}</span></p>
                  <p>수법: <span className="text-white">{reveal?.methodLabel || '불명'}</span></p>
                </div>
                {Array.isArray(reveal?.endingLines) && reveal.endingLines.length ? (
                  <div className="mt-4 space-y-2 rounded-2xl border border-amber-300/16 bg-amber-500/8 px-4 py-4 text-sm font-bold leading-6 text-amber-50/95">
                    {reveal.endingLines.map((line) => <p key={line}>{line}</p>)}
                  </div>
                ) : null}
              </div>

              <div className="panel-soft px-4 py-4">
                <div className="text-[11px] font-black tracking-[0.18em] text-slate-400">다음 선택</div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={onCopyInvite}
                    className="tap-feedback motion-cta min-h-12 rounded-2xl border border-sky-300/24 bg-sky-500/12 px-4 py-3 text-sm font-black text-sky-50"
                  >
                    <span className="inline-flex items-center gap-2"><Link2 size={15} /> 링크 복사</span>
                  </button>
                  <button
                    type="button"
                    onClick={onGoLobby}
                    className="tap-feedback motion-cta min-h-12 rounded-2xl border border-white/10 bg-slate-900/58 px-4 py-3 text-sm font-black text-slate-100"
                  >
                    <span className="inline-flex items-center gap-2"><Home size={15} /> 로비로</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-[11px] font-black tracking-[0.18em] text-slate-400">수사관별 최종 추리</div>
              {reports.map((report, index) => (
                <article
                  key={report.id}
                  className={`rounded-3xl border px-4 py-4 ${report.id === roomData?.winnerId ? 'border-amber-300/24 bg-amber-500/10' : 'border-white/10 bg-slate-900/44'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-sm font-black text-white">
                        <span>{index + 1}위 · {report.name}</span>
                        {report.id === roomData?.winnerId ? <span className="rounded-full border border-amber-300/24 bg-amber-500/12 px-2 py-1 text-[10px] text-amber-50"><Crown size={12} className="mr-1 inline-block" />해결</span> : null}
                        {report.accusationLocked ? <span className="rounded-full border border-rose-300/24 bg-rose-500/12 px-2 py-1 text-[10px] text-rose-100">고발 봉인</span> : null}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-black text-slate-300">
                        <span className="rounded-full border border-white/10 bg-slate-950/45 px-2 py-1">진척 {report.caseProgress}</span>
                        <span className="rounded-full border border-white/10 bg-slate-950/45 px-2 py-1">단서 {report.cluesCount}</span>
                        <span className="rounded-full border border-white/10 bg-slate-950/45 px-2 py-1">증언 {report.witnessesCount}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-white/8 bg-white/5 px-3 py-3">
                      <div className="text-[11px] font-black tracking-[0.16em] text-slate-400">남긴 용의자</div>
                      <div className="mt-2 text-xs font-bold leading-5 text-slate-200">{mapCandidateNames('suspect', report.remainingSuspects).join(', ') || '기록 없음'}</div>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/5 px-3 py-3">
                      <div className="text-[11px] font-black tracking-[0.16em] text-slate-400">남긴 동기</div>
                      <div className="mt-2 text-xs font-bold leading-5 text-slate-200">{mapCandidateNames('motive', report.remainingMotives).join(', ') || '기록 없음'}</div>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/5 px-3 py-3">
                      <div className="text-[11px] font-black tracking-[0.16em] text-slate-400">남긴 수법</div>
                      <div className="mt-2 text-xs font-bold leading-5 text-slate-200">{mapCandidateNames('method', report.remainingMethods).join(', ') || '기록 없음'}</div>
                    </div>
                  </div>

                  {Array.isArray(report.notes) && report.notes.length ? (
                    <div className="mt-3 rounded-2xl border border-white/8 bg-slate-950/40 px-3 py-3 text-xs font-bold leading-5 text-slate-300">
                      {report.notes.slice(-2).map((note) => <p key={note}>{note}</p>)}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
