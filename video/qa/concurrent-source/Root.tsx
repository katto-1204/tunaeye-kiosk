import React from 'react';
import { Composition } from 'remotion';
import { TOTAL_DURATION_FRAMES, TunaEyeDemo } from './TunaEyeDemo';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="TunaEyeDemo"
      component={TunaEyeDemo}
      durationInFrames={TOTAL_DURATION_FRAMES}
      fps={60}
      width={1920}
      height={1080}
    />
  );
};
