import React from 'react';
import AssetImage from './AssetImage';
import { GEM_LABEL } from '../shared/constants';
import { GEM_ASSET } from '../shared/assets';

export default function GemAsset({
  color,
  className = '',
  decorative = true,
  alt,
  eager = false,
}) {
  return (
    <AssetImage
      src={GEM_ASSET[color]}
      alt={alt || `${GEM_LABEL[color] || color} 토큰`}
      decorative={decorative}
      eager={eager}
      className={className}
    />
  );
}
