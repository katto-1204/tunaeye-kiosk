import { AbsoluteFill, Audio, interpolate, staticFile, useCurrentFrame, Sequence } from 'remotion';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { slide } from '@remotion/transitions/slide';
import { fade } from '@remotion/transitions/fade';
import { wipe } from '@remotion/transitions/wipe';
import { HeroLockup, ProblemScene } from './scenes/HeroLockup';
import {
  AdminBentoScene,
  AlertSafeguardScene,
  CenterStageScene,
  CloudSyncScene,
  DashboardCascadeScene,
  GradeComparisonGrid,
  OverrideSpotlightScene,
  PiScanScene,
  PlacementFilmstripScene,
  ReceiptPrintScene,
  TailCutBranchScene,
} from './scenes/DynamicScenes';
import { fontCss, theme } from './theme';

export const TOTAL_DURATION_FRAMES = 2490;
export const ACTS = [0, 10, 20, 28, 48, 54, 63, 78, 83] as const;

export const CUES = [
  { frame: 0, file: 'intro.wav' },
  { frame: 150, file: 'lift.wav' },
  { frame: 300, file: 'tap.wav' },
  { frame: 420, file: 'keypad.wav' },
  { frame: 600, file: 'glide.wav' },
  { frame: 690, file: 'shutter.wav' },
  { frame: 840, file: 'gradeA.wav' },
  { frame: 1020, file: 'tail.wav' },
  { frame: 1170, file: 'alert.wav' },
  { frame: 1290, file: 'lock.wav' },
  { frame: 1440, file: 'print.wav' },
  { frame: 1620, file: 'tap.wav' },
  { frame: 1890, file: 'keypad.wav' },
  { frame: 2160, file: 'sync.wav' },
  { frame: 2340, file: 'intro.wav' },
];

const tFast = linearTiming({ durationInFrames: 7 });
const Serif = ({ children }: { children: React.ReactNode }) => (
  <span style={{ fontFamily: theme.serif, fontStyle: 'italic', fontWeight: 400 }}>{children}</span>
);

export const TunaEyeDemo = () => {
  const frame = useCurrentFrame();
  const fadeOut = interpolate(frame, [2460, 2489], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: '#0F172A' }}>
      <style>{fontCss}</style>
      <AbsoluteFill style={{ opacity: fadeOut }}>
        <TransitionSeries>
          <TransitionSeries.Sequence name="01 Problem" durationInFrames={157}>
            <ProblemScene />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition presentation={fade()} timing={tFast} />

          <TransitionSeries.Sequence name="01b Solution" durationInFrames={150}>
            <HeroLockup />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition presentation={fade()} timing={tFast} />

          <TransitionSeries.Sequence name="02 Welcome Live" durationInFrames={127}>
            <CenterStageScene
              act="01 / WELCOME"
              headline={
                <>
                  One tap to <Serif>begin.</Serif>
                </>
              }
              video="clip-01-welcome.mp4"
              pills={['Offline-first', 'Raspberry Pi 5', 'Station 01 · v2.7.0']}
            />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition presentation={slide({ direction: 'from-right' })} timing={tFast} />

          <TransitionSeries.Sequence name="02b Sign-In & Weight Live" durationInFrames={187}>
            <CenterStageScene
              act="02 / SIGN IN + WEIGHT"
              headline={
                <>
                  Owen Pilongo &amp; <Serif>touch weight.</Serif>
                </>
              }
              video="clip-02-signin-weight.mp4"
              playbackRate={1}
              pills={['Expert: Owen Pilongo', 'Valid range: 20–200 kg', '6-point preflight']}
            />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition presentation={wipe({ direction: 'from-left' })} timing={tFast} />

          <TransitionSeries.Sequence name="03 Placement Filmstrip" durationInFrames={97}>
            <PlacementFilmstripScene />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition presentation={fade()} timing={tFast} />

          <TransitionSeries.Sequence name="03b Pi Camera Scan Live" durationInFrames={157}>
            <PiScanScene />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition presentation={wipe({ direction: 'from-left' })} timing={tFast} />

          <TransitionSeries.Sequence name="04 Grade Comparison" durationInFrames={187}>
            <GradeComparisonGrid />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition presentation={slide({ direction: 'from-right' })} timing={tFast} />

          <TransitionSeries.Sequence name="04b Tail-Cut Live" durationInFrames={157}>
            <TailCutBranchScene />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition presentation={fade()} timing={tFast} />

          <TransitionSeries.Sequence name="04c Safeguards Live" durationInFrames={127}>
            <AlertSafeguardScene />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition presentation={slide({ direction: 'from-bottom' })} timing={tFast} />

          <TransitionSeries.Sequence name="04d Expert Override Live" durationInFrames={157}>
            <OverrideSpotlightScene />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition presentation={fade()} timing={tFast} />

          <TransitionSeries.Sequence name="05 Receipt Live" durationInFrames={187}>
            <ReceiptPrintScene />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition presentation={slide({ direction: 'from-right' })} timing={tFast} />

          <TransitionSeries.Sequence name="06 Grader Dashboard Live" durationInFrames={277}>
            <DashboardCascadeScene />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition presentation={wipe({ direction: 'from-left' })} timing={tFast} />

          <TransitionSeries.Sequence name="07 Admin Console Live" durationInFrames={277}>
            <AdminBentoScene />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition presentation={slide({ direction: 'from-right' })} timing={tFast} />

          <TransitionSeries.Sequence name="07b Cloud Sync" durationInFrames={187}>
            <CloudSyncScene />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition presentation={fade()} timing={tFast} />

          <TransitionSeries.Sequence name="08 Outro" durationInFrames={157}>
            <HeroLockup outro />
          </TransitionSeries.Sequence>
        </TransitionSeries>
      </AbsoluteFill>

      <Audio src={staticFile('audio/ocean-bed-98bpm.wav')} volume={0.14} />
      {CUES.map((cue, i) => (
        <Sequence key={i} from={cue.frame} durationInFrames={Math.min(90, TOTAL_DURATION_FRAMES - cue.frame)} layout="none">
          <Audio src={staticFile(`audio/${cue.file}`)} volume={0.55} />
        </Sequence>
      ))}
      {ACTS.slice(0, 8).map((sec, i) => (
        <Sequence
          key={sec}
          name={`Narration ${i + 1}`}
          from={sec * 30}
          durationInFrames={(ACTS[i + 1] - sec) * 30}
          layout="none"
        >
          <Audio src={staticFile(`audio/voice-${String(i + 1).padStart(2, '0')}.wav`)} v