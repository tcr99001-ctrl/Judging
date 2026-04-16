'use client';

import React from 'react';
import { FXProvider } from './splendor/fx/FXProvider';
import FXLayer from './splendor/fx/FXLayer';
import PageInner from './splendor/pages/PageInner';

export default function Page() {
  return (
    <FXProvider debug={false}>
      <FXLayer />
      <PageInner />
    </FXProvider>
  );
}
