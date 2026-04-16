'use client';

import React from 'react';
import AssetImage from './AssetImage';
import GemAsset from './GemAsset';
import { useFX } from '../fx/FXProvider';
import { CARD_MARK_ASSET, TIER_EMBLEM_ASSET } from '../shared/assets';
import { COLORS, GEM_LABEL, TIER_LABEL, TIER_THEME } from '../shared/constants';
import { formatResourceList, summarizeNotebookEffect } from '../shared/utils';

export default function CardFace({
  card,
  compact = false,
  selected = false,
  onClick,
  sourceLabel = null,
  className = '',
}) {
  const fx = useFX();
  if (!card) return null;
  const theme = TIER_THEME[card.tier] || TIER_THEME[1];
  const insightLabel = GEM_LABEL[card.insight || card.bonus] || '조사 특성';
  const effectLines = card.effectLines?.length ? card.effectLines : summarizeNotebookEffect(card.effect);

  return (
    <button
      type="button"
      onClick={onClick}
      ref={fx?.anchorRef?.(`card:${card.id}`)}
      data-selected={selected ? 'true' : 'false'}
      className={[
        'market-card tap-feedback motion-card-enter relative overflow-hidden rounded-[1.35rem] border text-left text-slate-900',
        theme.frame,
        selected ? `ring-2 ${theme.glow}` : '',
        compact ? 'min-h-[180px] p-3' : 'min-h-[220px] p-4',
        className,
      ].join(' ')}
    >
      <div className="card-noise absolute inset-0" />
      <div className="relative z-[1] flex h-full flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className={`inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-black ${theme.badge}`}>
              {TIER_LABEL[card.tier] || `티어 ${card.tier}`}
            </div>
            <div className={`mt-2 line-clamp-2 font-black ${compact ? 'text-sm' : 'text-base'}`}>{card.title}</div>
            <div className={`mt-1 line-clamp-2 font-bold text-slate-600 ${compact ? 'text-[11px]' : 'text-xs'}`}>{card.subtitle}</div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="relative h-11 w-11 rounded-2xl border border-black/10 bg-white/70 p-2 shadow-[0_6px_14px_rgba(15,23,42,0.12)]">
              <AssetImage src={CARD_MARK_ASSET[card.mark]} className="h-full w-full" decorative />
            </div>
            <div className="relative h-9 w-9">
              <AssetImage src={TIER_EMBLEM_ASSET[card.tier]} className="h-full w-full" decorative />
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-black/8 bg-white/72 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
            <div className="text-[10px] font-black tracking-[0.16em] text-slate-500">사건 진척</div>
            <div className="mt-1 text-lg font-black text-slate-900">+{card.progress || card.points || 0}</div>
          </div>
          <div className="rounded-2xl border border-black/8 bg-white/72 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
            <div className="text-[10px] font-black tracking-[0.16em] text-slate-500">얻는 통찰</div>
            <div className="mt-1 flex items-center gap-2 text-sm font-black text-slate-900">
              <GemAsset color={card.insight || card.bonus} className="h-5 w-5" />
              <span>{insightLabel}</span>
            </div>
          </div>
        </div>

        <div className="mt-3 rounded-2xl border border-black/8 bg-white/72 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
          <div className="text-[10px] font-black tracking-[0.16em] text-slate-500">단서 메모</div>
          <div className={`mt-2 font-bold leading-5 text-slate-700 ${compact ? 'line-clamp-2 text-[11px]' : 'line-clamp-3 text-xs'}`}>
            {card.detail}
          </div>
          {effectLines?.length ? (
            <div className={`mt-2 rounded-2xl border border-amber-300/40 bg-amber-50/90 px-3 py-2 text-[11px] font-black text-amber-900 ${compact ? 'line-clamp-2' : ''}`}>
              {effectLines[0]}
            </div>
          ) : null}
        </div>

        <div className="mt-auto pt-3">
          {sourceLabel ? <div className="mb-2 text-[10px] font-black tracking-[0.18em] text-slate-500">{sourceLabel}</div> : null}
          <div className="rounded-2xl border border-black/8 bg-slate-900/88 px-3 py-2 text-white shadow-[0_10px_18px_rgba(15,23,42,0.2)]">
            <div className="text-[10px] font-black tracking-[0.16em] text-slate-400">확보 비용</div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {COLORS.filter((color) => Number(card.cost?.[color] || 0) > 0).map((color) => (
                <span key={color} className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/8 px-2 py-1 text-[11px] font-black text-slate-100">
                  <GemAsset color={color} className="h-4 w-4" />
                  {card.cost[color]}
                </span>
              ))}
              {!COLORS.some((color) => Number(card.cost?.[color] || 0) > 0) ? (
                <span className="text-xs font-black text-slate-300">비용 없음</span>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}
