'use client';

import React from 'react';
import AssetImage from './AssetImage';
import { UI_ASSET } from '../shared/assets';
import { getDisplayName } from '../shared/utils';

export default function GameOverScreen({ roomData, players, myId }) {
  if (roomData?.status !== 'ended') return null;
  const winner = players.find((player) => player.id === roomData?.winnerId) || null;
  const reveal = roomData?.reveal || null;
  const reports = Array.isArray(roomData?.finalReports) ? roomData.finalReports : [];

  return (
    <div className="app-shell game-surface">
      <div className="mx-auto flex w-full max-w-[560px] flex-col px-4 pb-[calc(2rem+var(--safe-bottom))] pt-[calc(1rem+var(--safe-top))]">
        <section className="panel p-4 sm:p-5">
          <div className="border-b border-white/10 pb-5 text-center">
            <div className="mx-auto flex w-full max-w-[220px] items-center justify-center rounded-[24px] border border-white/10 bg-black/10 p-4">
              <AssetImage src={UI_ASSET.caseResolved} className="h-24 w-24" />
            </div>
            <div className="mt-3 text-[11px] font-black tracking-[0.2em] text-[#c7ae84]">사건 정리</div>
            <div className="mt-2 text-2xl font-black text-[#f7efe3]">{reveal?.headline || '결과'}</div>
            <div className="mt-3 break-words text-sm font-bold leading-6 text-[#e6d8c2]">{reveal?.summary || '정리된 기록이 없다.'}</div>
            <div className="mt-3 rounded-[18px] border border-[#7e3c2f]/20 bg-[#7e3c2f]/10 px-4 py-3 text-sm font-black text-[#f7e7e0]">
              승자 {winner ? (winner.id === myId ? '나' : getDisplayName(winner)) : '없음'}
            </div>
          </div>

          {reveal?.endingLines?.length ? (
            <div className="grid gap-2 border-b border-white/10 py-4">
              {reveal.endingLines.map((line) => (
                <div key={line} className="rounded-[18px] border border-white/10 bg-black/10 px-4 py-3 text-sm font-bold text-[#ecdfca] break-words">
                  {line}
                </div>
              ))}
            </div>
          ) : null}

          <div className="grid gap-3 pt-4">
            {reports.map((report) => (
              <div key={report.id} className="rounded-[22px] border border-white/10 bg-black/10 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-base font-black text-[#f7efe3]">{report.id === myId ? '나' : report.name}</div>
                  <div className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-black text-[#d6c7b4]">진척 {report.caseProgress || 0}</div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-sm font-black text-[#f7efe3]">
                  <div className="rounded-[18px] border border-white/10 bg-white/5 px-3 py-3 text-center">단서 {report.clueCount || 0}</div>
                  <div className="rounded-[18px] border border-white/10 bg-white/5 px-3 py-3 text-center">리드 {report.reservedCount || 0}</div>
                  <div className="rounded-[18px] border border-white/10 bg-white/5 px-3 py-3 text-center">추궁 {report.witnessCount || 0}</div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-sm font-black text-[#f7efe3]">
                  <div className="rounded-[18px] border border-white/10 bg-white/5 px-3 py-3 text-center">용의자 {report.notebook?.remainingSuspects?.length || 0}</div>
                  <div className="rounded-[18px] border border-white/10 bg-white/5 px-3 py-3 text-center">동기 {report.notebook?.remainingMotives?.length || 0}</div>
                  <div className="rounded-[18px] border border-white/10 bg-white/5 px-3 py-3 text-center">수법 {report.notebook?.remainingMethods?.length || 0}</div>
                </div>
                {report.notebook?.notes?.length ? (
                  <div className="mt-3 grid max-h-32 gap-2 overflow-y-auto pr-1 text-sm font-bold text-[#ecdfca]">
                    {report.notebook.notes.slice(-3).reverse().map((note) => (
                      <div key={note} className="break-words rounded-[18px] border border-white/8 bg-[#17120f]/70 px-3 py-2">
                        {note}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
