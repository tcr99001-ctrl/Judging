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
      <div className="mx-auto min-h-screen w-full max-w-[480px] px-3 py-4">
        <section className="panel overflow-hidden">
          <div className="border-b border-white/10 px-4 py-5 text-center">
            <div className="mx-auto flex w-full max-w-[220px] items-center justify-center rounded-[28px] border border-white/10 bg-black/10 p-4">
              <AssetImage src={UI_ASSET.caseResolved} className="h-28 w-28" />
            </div>
            <div className="mt-3 text-[11px] font-black tracking-[0.22em] text-[#c7ae84]">사건 종결</div>
            <div className="mt-2 text-2xl font-black text-[#f7efe3]">{reveal?.headline || '가면이 찢어졌다.'}</div>
            <div className="mt-3 text-sm font-bold leading-6 text-[#e6d8c2]">{reveal?.summary || '기록이 끝났다.'}</div>
            <div className="mt-3 rounded-2xl border border-[#7e3c2f]/25 bg-[#7e3c2f]/12 px-4 py-3 text-sm font-black text-[#f7e7e0]">
              승자 {winner ? (winner.id === myId ? '나' : getDisplayName(winner)) : '없음'}
            </div>
          </div>

          {reveal?.endingLines?.length ? (
            <div className="grid gap-2 border-b border-white/10 px-4 py-4">
              {reveal.endingLines.map((line) => (
                <div key={line} className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm font-bold text-[#ecdfca]">
                  {line}
                </div>
              ))}
            </div>
          ) : null}

          <div className="grid gap-3 px-4 py-4">
            {reports.map((report) => (
              <div key={report.id} className="rounded-3xl border border-white/10 bg-black/10 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-base font-black text-[#f7efe3]">{report.id === myId ? '나' : report.name}</div>
                  <div className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-black text-[#d6c7b4]">진척 {report.caseProgress || 0}</div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-sm font-black text-[#f7efe3]">
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-center">단서 {report.clueCount || 0}</div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-center">리드 {report.reservedCount || 0}</div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-center">추궁 {report.witnessCount || 0}</div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-sm font-black text-[#f7efe3]">
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-center">용의자 {report.notebook?.remainingSuspects?.length || 0}</div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-center">동기 {report.notebook?.remainingMotives?.length || 0}</div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-center">수법 {report.notebook?.remainingMethods?.length || 0}</div>
                </div>
                {report.notebook?.notes?.length ? (
                  <div className="mt-3 grid gap-2 text-sm font-bold text-[#ecdfca]">
                    {report.notebook.notes.slice(-3).reverse().map((note) => (
                      <div key={note} className="rounded-2xl border border-white/8 bg-[#17120f]/70 px-3 py-2">
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
