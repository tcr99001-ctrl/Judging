'use client';

import React, { memo } from 'react';
import { AlertTriangle, CheckCircle2, Sparkles } from 'lucide-react';

const TONE_CLASS = {
  success: 'border-emerald-400/30 bg-emerald-500/15 text-emerald-50',
  error: 'border-rose-400/30 bg-rose-500/15 text-rose-50',
  warn: 'border-amber-400/30 bg-amber-500/15 text-amber-50',
  info: 'border-sky-400/30 bg-sky-500/15 text-sky-50',
};

function ToneIcon({ tone }) {
  if (tone === 'success') return <CheckCircle2 size={16} />;
  if (tone === 'error') return <AlertTriangle size={16} />;
  return <Sparkles size={16} />;
}

function ToastStackImpl({ items = [] }) {
  if (!items.length) return null;

  return (
    <div className="toast-shell" aria-live="polite" aria-atomic="true" aria-relevant="additions text">
      <div className="toast-stack">
        {items.map((item) => (
          <div key={item.id} className={`toast-card ${TONE_CLASS[item.tone] || TONE_CLASS.info}`}>
            <div className="flex items-center gap-2">
              <ToneIcon tone={item.tone} />
              <span>{item.text}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function areEqual(prev, next) {
  const a = prev.items || [];
  const b = next.items || [];
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i].id !== b[i].id || a[i].text !== b[i].text || a[i].tone !== b[i].tone) return false;
  }
  return true;
}

const ToastStack = memo(ToastStackImpl, areEqual);
export default ToastStack;
