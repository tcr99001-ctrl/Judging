'use client';

import React from 'react';
import AssetImage from './AssetImage';
import { CARD_MARK_ASSET, TIER_EMBLEM_ASSET } from '../shared/assets';
import { GEM_LABEL, TIER_LABEL } from '../shared/constants';

const TIER_FRAME = {
  1: 'border-slate-300/80 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.96),_rgba(226,232,240,0.94))] text-slate-900',
  2: 'border-sky-200/80 bg-[radial-gradient(circle_at_top_left,_rgba(239,246,255,0.98),_rgba(224,242,254,0.95))] text-slate-900',
  3: 'border-violet-200/80 bg-[radial-gradient(circle_at_top_left,_rgba(250,245,255,0.98),_rgba(243,232,255,0.95))] text-slate-900',
};

const LINE_TONE = {
  white: 'bg-slate-100 text-slate-700 border-slate-300',
  blue: 'bg-sky-100 text-sky-700 border-sky-300',
  green: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  red: 'bg-rose-100 text-rose-700 border-rose-300',
  black: 'bg-slate-800 text-slate-100 border-slate-950',
};

export default function CardFace({
  card,
  size = 'board',
  className = '',
  emphasis = false,
}) {
  if (!card) return null;

  const compact = size === 'mini';
  const directiveCount = (card.directives?.eliminateSuspects?.length || 0)
    + (card.directives?.eliminateMotives?.length || 0)
    + (card.directives?.eliminateMethods?.length || 0);

  return (
    <div
      className={[
        'relative flex h-full min-h-[182px] flex-col overflow-hidden rounded-[24px] border shadow-[0_16px_36px_rgba(15,23,42,0.18)]',
        TIER_FRAME[card.tier] || TIER_FRAME[1],
        compact ? 'min-h-[128px] rounded-[20px]' : '',
        emphasis ? 'ring-2 ring-amber-300/70' : '',
        className,
      ].join(' ')}
    >
      <div className="pointer-events-none absolute inset-0 opacity-10">
        <AssetImage src={CARD_MARK_ASSET[card.mark]} className="absolute -right-6 top-5 h-24 w-24 rotate-[12deg]" />
      </div>

      <div className="relative flex items-start justify-between gap-3 px-3.5 pb-2 pt-3.5">
        <div className="min-w-0">
          <div className="text-[10px] font-black tracking-[0.22em] text-slate-500">{TIER_LABEL[card.tier]}</div>
          <div className={[compact ? 'mt-1 text-sm' : 'mt-1.5 text-[15px]', 'line-clamp-2 font-black leading-snug'].join(' ')}>{card.title}</div>
        </div>
        <AssetImage src={TIER_EMBLEM_ASSET[card.tier]} className={compact ? 'h-8 w-8 shrink-0' : 'h-9 w-9 shrink-0'} />
      </div>

      <div className="relative flex flex-1 flex-col px-3.5 pb-3.5">
        <div className="mb-2 flex flex-wrap gap-1.5">
          <span className={`rounded-full border px-2 py-1 text-[10px] font-black ${LINE_TONE[card.line] || LINE_TONE.white}`}>
            {GEM_LABEL[card.line]}
          </span>
          {directiveCount ? (
            <span className="rounded-full border border-amber-300 bg-amber-100 px-2 py-1 text-[10px] font-black text-amber-700">
              제거 {directiveCount}
            </span>
          ) : null}
        </div>

        <p className={[compact ? 'text-[11px]' : 'text-[12px]', 'line-clamp-3 font-bold leading-5 text-slate-700'].join(' ')}>{card.summary}</p>

        <div className="mt-auto pt-3">
          <div className="flex flex-wrap gap-1.5">
            {(card.threads || []).slice(0, compact ? 2 : 3).map((thread) => (
              <span key={thread} className="rounded-full border border-slate-300/80 bg-white/80 px-2 py-1 text-[10px] font-black text-slate-600">
                {thread}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
