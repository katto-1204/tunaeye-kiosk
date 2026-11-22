import { Composition } from 'remotion';
import { TunaEyeDemo, TOTAL_DURATION_FRAMES } from './TunaEyeDemo';

export const RemotionRoot = () => (
  <Composition
    id="TunaEyeDemo"
    component={TunaEyeDemo}
    durationInFrames={TOTAL_DURATION_FRAMES}
    fps={30}
    width={1920}
    height={1080}
  />
);
