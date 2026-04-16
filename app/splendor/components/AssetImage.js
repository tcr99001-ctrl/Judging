import React from 'react';

export default function AssetImage({
  src,
  alt = '',
  className = '',
  decorative = true,
  eager = false,
}) {
  if (!src) return null;

  return (
    <img
      src={src}
      alt={decorative ? '' : alt}
      aria-hidden={decorative ? true : undefined}
      className={`select-none object-contain ${className}`.trim()}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
    />
  );
}
