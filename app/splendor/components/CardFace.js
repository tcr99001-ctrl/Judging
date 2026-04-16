'use client';

import React from 'react';
import AssetImage from './AssetImage';
import { CARD_MARK_ASSET, TIER_EMBLEM_ASSET, UI_ASSET } from '../shared/assets';
import { GEM_LABEL, TIER_LABEL } from '../shared/constants';

const TIER_FRAME = {
  1: 'border-[#76614d] bg-[#d7c7a7] text-[#221c17]',
  2: 'border-[#6a5a4c] bg-[#d3c0a2] text-[#211a16]',
  3: 'border-[#5d5248] bg-[#ccb794] text-[#211a16]',
};

const LINE_TONE = {
  white: 'border-[#84725e] bg-[#efe5d4] text-[#3a3028]',
  blue: 'border-[#5e6f81] bg-[#d5dfeb] text-[#223142]',
  green: 'border-[#5e745f] bg-[#d7e2d0] text-[#253121]',
  red: 'border-[#8b5a49] bg-[#ead2c8] text-[#5a2e22]',
  black: 'border-[#473f3a] bg-[#2c2622] text-[#f0e6d4]',
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
  const serial = String(card.id || card.key || '').replace(/[^A-Z0-9]/gi, '').slice(-6).toUpperCase() || 'CASE';

  return (
    <div
      className={[
        'relative flex h-full min-h-[186px] flex-col overflow-hidden rounded-[22px] border shadow-[0_18px_32px_rgba(10,7,6,0.26)]',
        TIER_FRAME[card.tier] || TIER_FRAME[1],
        compact ? 'min-h-[132px] rounded-[18px]' : '',
        emphasis ? 'ring-2 ring-[#8a4636]/40' : '',
        className,
      ].join(' ')}
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.22), rgba(0,0,0,0.04)), url(${UI_ASSET.clueBack})`,
        backgroundSize: 'cover, cover',
        backgroundPosition: 'center, center',
      }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.18] mix-blend-multiply">
        <AssetImage src={CARD_MARK_ASSET[card.mark]} className="absolute -right-3 top-3 h-24 w-24 rotate-[10deg]" />
      </div>

      <div className="relative flex items-start justify-between gap-3 border-b border-[#4b3a31]/20 px-3.5 pb-2 pt-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <AssetImage src={TIER_EMBLEM_ASSET[card.tier]} className={compact ? 'mt-0.5 h-7 w-7 shrink-0' : 'mt-0.5 h-8 w-8 shrink-0'} />
          <div className="min-w-0">
            <div className="text-[10px] font-black tracking-[0.24em] text-[#5b4a3f]">{TIER_LABEL[card.tier]}</div>
            <div className={[compact ? 'mt-1 text-sm' : 'mt-1.5 text-[15px]', 'line-clamp-2 font-black leading-snug text-[#231c18]'].join(' ')}>{card.title}</div>
          </div>
        </div>
        <div className="rounded-md border border-[#4b3a31]/20 bg-[#f2e8d5]/70 px-2 py-1 text-[10px] font-black tracking-[0.14em] text-[#4f4036]">
          {serial}
        </div>
      </div>

      <div className="relative flex flex-1 flex-col px-3.5 pb-3.5 pt-2.5">
        <div className="mb-2 flex flex-wrap gap-1.5">
          <span className={`rounded-full border px-2 py-1 text-[10px] font-black ${LINE_TONE[card.line] || LINE_TONE.white}`}>
            {GEM_LABEL[card.line]}
          </span>
          {directiveCount ? (
            <span className="rounded-full border border-[#8a4636]/30 bg-[#8a4636]/10 px-2 py-1 text-[10px] font-black text-[#5f2f25]">
              제거 {directiveCount}
            </span>
          ) : null}
          {card.unlockWitnesses?.length ? (
            <span className="rounded-full border border-[#203142]/20 bg-[#203142]/10 px-2 py-1 text-[10px] font-black text-[#203142]">
              인물 {card.unlockWitnesses.length}
            </span>
          ) : null}
        </div>

        <p className={[compact ? 'text-[11px]' : 'text-[12px]', 'line-clamp-3 font-bold leading-5 text-[#3b322b]'].join(' ')}>{card.summary}</p>

        <div className="mt-2">
          <AssetImage src={UI_ASSET.scratchDivider} className="h-4 w-full object-cover opacity-75" />
        </div>

        <div className="mt-1 line-clamp-2 text-[11px] font-black leading-5 text-[#6a5647]">{card.quote}</div>

        <div className="mt-auto pt-3">
          <div className="flex flex-wrap gap-1.5">
            {(card.threads || []).slice(0, compact ? 2 : 3).map((thread) => (
              <span key={thread} className="rounded-full border border-[#4b3a31]/18 bg-[#f7f0e3]/62 px-2 py-1 text-[10px] font-black text-[#4b3a31]">
                {thread}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
