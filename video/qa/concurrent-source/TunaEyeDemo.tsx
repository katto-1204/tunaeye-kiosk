import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile } from 'remotion';
import { TransitionSeries, springTiming } from '@remotion/transitions';
import { slide } from '@remotion/transitions/slide';
import { fade } from '@remotion/transitions/fade';
import type { SceneConfig } from './theme';
import { HeroLockup } from './scenes/HeroLockup';
import { TabletScene } from './scenes/TabletScene';

export const SCENES: SceneConfig[] = [
  {
    id: 'intro',
    act: 'Act 1 · Brand Hook',
    durationInFrames: 210,
    cue: 'intro',
    hero: true,
    kicker: 'TunaEye v2.7.0',
    titlePrefix: 'Sea',
    titleAccent: 'Beyond',
    titleSuffix: 'the Cut.',
    desc: "We don't replace the expert eye. We extend its reach. Built on expert knowledge and enhanced by computer vision.",
  },
  {
    id: 'landing',
    act: 'Act 1 · Landing & Portal',
    durationInFrames: 240,
    cue: 'tap',
    kicker: 'Public Portal -> Kiosk PWA',
    titlePrefix: 'One Tap to',
    titleAccent: 'Start Grading',
    desc: 'Desktop visitors explore station specs and install the PWA; tablets and Pi hosts open the kiosk welcome screen directly.',
    img: 'kiosk-screens/00-landing-page.png',
    bullets: [
      { text: 'Runs 100% offline on Raspberry Pi 5', color: 'blue' },
      { text: 'Version badge + live station readiness check', color: 'a' },
    ],
  },
  {
    id: 'welcome',
    act: 'Act 2 · Station Welcome',
    durationInFrames: 240,
    cue: 'tap',
    kicker: 'Step 0 · Welcome',
    titlePrefix: 'Ready at',
    titleAccent: 'Station 01',
    desc: 'Shows live station readiness, v2.7 changelog, and selective per-grader cloud sync right from the start screen.',
    img: 'kiosk-screens/01-welcome.png',
    bullets: [
      { text: '4-step workflow bar clearly visible', color: 'blue' },
      { text: 'Per-grader Sync modal queues cleanly offline', color: 'a' },
    ],
  },
  {
    id: 'weight',
    act: 'Act 2 · Sign-In & Weight',
    durationInFrames: 240,
    cue: 'keypad',
    kicker: 'Step 1 & 2 · Identity + Scale',
    titlePrefix: 'Fast Sign-In &',
    titleAccent: 'Weight Entry',
    desc: 'Operators enter their name (max 15 chars), verify Pi readiness, and enter fish weight (15–200 kg) on the touch keypad.',
    img: 'kiosk-screens/03-weight-entry.png',
    bullets: [
      { text: 'Pre-flight check verifies Pi network, camera & ONNX models', color: 'blue' },
      { text: 'Touch numeric keypad enforces 15–200 kg range', color: 'b' },
    ],
  },
  {
    id: 'guide',
    act: 'Act 3 · Chamber Guide',
    durationInFrames: 210,
    cue: 'glide',
    kicker: '5000K Chamber Tutorial',
    titlePrefix: 'Standardized',
    titleAccent: 'Placement',
    desc: 'A 3-step illustrated guide ensures clean, repeatable lighting — and auto-skips after 2 sessions in 30 minutes.',
    img: 'kiosk-screens/04-placement-guide.png',
    bullets: [
      { text: '2-second auto-advance across Steps 1–3', color: 'blue' },
      { text: 'Close / Skip button sits cleanly next to Next', color: 'a' },
    ],
  },
  {
    id: 'camera',
    act: 'Act 4 · Raspberry Pi Edge AI',
    durationInFrames: 240,
    cue: 'shutter',
    scan: true,
    kicker: 'Raspberry Pi Camera Only',
    titlePrefix: 'Sashibo Core',
    titleAccent: 'Edge Scan',
    desc: 'Locked directly to the Raspberry Pi chamber camera for consistent, glare-free Sashibo Core inference.',
    img: 'kiosk-screens/20-core-camera-live.png',
    bullets: [
      { text: 'Same-origin Pi /snapshot and /grade inference', color: 'blue' },
      { text: 'Zero reliance on phone webcams', color: 'a' },
    ],
  },
  {
    id: 'invalid',
    act: 'Act 4 · Non-Tuna Guardrail',
    durationInFrames: 240,
    cue: 'alert',
    glow: 'c',
    kicker: 'Invalid Sample Protection',
    titlePrefix: 'Cannot Be',
    titleAccent: 'Determined',
    desc: 'If an empty tray, hand, or non-tuna object is scanned, TunaEye rejects it immediately and resets the camera.',
    img: 'kiosk-screens/05b-invalid-sample-modal.png',
    bullets: [
      { text: 'Discards temporary image automatically', color: 'c' },
      { text: '2-second alert clears frame for instant rescan', color: 'blue' },
    ],
  },
  {
    id: 'grade-a',
    act: 'Act 5 · Direct Grade A',
    durationInFrames: 240,
    cue: 'gradeA',
    glow: 'a',
    kicker: 'Confidence >= 75% (A or B)',
    titlePrefix: 'Instant',
    titleAccent: 'Grade A',
    titleSuffix: 'Result',
    desc: 'Confident Sashibo Core scans (75%+) skip the Tail-Cut step and calculate total value (weight x rate) immediately.',
    img: 'kiosk-screens/demo-01-grade-a.png',
    bullets: [
      { text: 'Green Grade A (96.3%) · Yellow Grade B (94.0%)', color: 'a' },
      { text: 'Ready to print 58mm thermal receipt in 1 tap', color: 'blue' },
    ],
  },
  {
    id: 'tailneed',
    act: 'Act 5 · Tail-Cut Verification',
    durationInFrames: 240,
    cue: 'tail',
    glow: 'b',
    kicker: 'Confidence < 75% or Grade C',
    titlePrefix: 'Dual-Cut',
    titleAccent: 'Verification',
    desc: 'Uncertain Core scans or Grade C trigger a Tail-Cut check — letting graders scan the Tail-Cut face or mark Provisional.',
    img: 'kiosk-screens/demo-03-grade-c-tailneed.png',
    bullets: [
      { text: 'No Tail-Cut (60%+) tags session PROVISIONAL', color: 'b' },
      { text: 'Scan Tail-Cut combines both ONNX models', color: 'blue' },
    ],
  },
  {
    id: 'tail-upgrade',
    act: 'Act 5 · Tail-Cut Upgrades',
    durationInFrames: 240,
    cue: 'lift',
    glow: 'a',
    kicker: 'Blended Decision Engine',
    titlePrefix: 'Tail-Cut',
    titleAccent: 'Lifts to Grade A',
    desc: 'Combining Core (71.5% B) with a prime Tail-Cut (93.8% A) upgrades the fish to Grade A — with both photos saved.',
    img: 'kiosk-screens/demo-05-tail-upgrades-a.png',
    bullets: [
      { text: 'Both Core & Tail evidence photos saved side-by-side', color: 'a' },
      { text: 'Red Grade C card confirms Processing Quality when both are C', color: 'c' },
    ],
  },
  {
    id: 'grade-c',
    act: 'Act 5 · Final Grade C',
    durationInFrames: 210,
    cue: 'gradeB',
    glow: 'c',
    kicker: 'Processing Quality',
    titlePrefix: 'Confirmed',
    titleAccent: 'Grade C',
    desc: 'When both Core and Tail-Cut confirm Grade C (94.0%), TunaEye renders the red Processing Quality card and rate.',
    img: 'kiosk-screens/demo-03b-grade-c-final.png',
    bullets: [
      { text: 'Clear ₱280/kg rate & ₱23,800.00 value breakdown', color: 'c' },
      { text: 'Human Override remains available with Supervisor PIN', color: 'blue' },
    ],
  },
  {
    id: 'override',
    act: 'Act 5 · Expert Authority',
    durationInFrames: 240,
    cue: 'lock',
    kicker: 'Human Authority Always Wins',
    titlePrefix: 'Manual',
    titleAccent: 'Override',
    titleSuffix: 'Required',
    desc: 'When both cuts fall under 75% or disagree (A vs C), the Black Card locks printing until an expert enters Supervisor PIN.',
    img: 'kiosk-screens/demo-09-needs-expert.png',
    bullets: [
      { text: '2-column override records Grade, Reason & Actor', color: 'blue' },
      { text: 'Original model confidence stays preserved for audit', color: 'b' },
    ],
  },
  {
    id: 'receipt',
    act: 'Act 6 · 58mm Receipt',
    durationInFrames: 240,
    cue: 'print',
    kicker: '58mm Bluetooth POS-58',
    titlePrefix: 'Print &',
    titleAccent: 'Auto-Next',
    desc: 'Auto-prints via Web Bluetooth ESC/POS in 700ms when paired, then counts 3, 2, 1 straight to the next fish.',
    img: 'kiosk-screens/10-receipt.png',
    bullets: [
      { text: 'Full peso breakdown + Core & Tail metrics on ticket', color: 'blue' },
      { text: 'Skip confirmation keeps record safely stored locally', color: 'a' },
    ],
  },
  {
    id: 'dashboard',
    act: 'Act 7 · Grader Dashboard',
    durationInFrames: 240,
    cue: 'tap',
    kicker: 'Operator Workspace',
    titlePrefix: 'Grader',
    titleAccent: 'Dashboard',
    desc: 'Graders view their own records by default (or switch to All device records), inspect photos, and reprint receipts.',
    img: 'kiosk-screens/19-grader-dashboard.png',
    bullets: [
      { text: 'My records / All device records filter + pagination', color: 'blue' },
      { text: 'New graders start clean with "No records yet"', color: 'a' },
    ],
  },
  {
    id: 'admin',
    act: 'Act 8 · Admin Console',
    durationInFrames: 260,
    cue: 'lock',
    kicker: 'PIN 1234 · Full Station Control',
    titlePrefix: 'Admin',
    titleAccent: 'Overview & Audit',
    desc: 'Supervisors filter across 7 time ranges, audit evidence & overrides, manage Expert Graders, test Pi hardware, and export CSV.',
    img: 'kiosk-screens/13-admin-overview.png',
    bullets: [
      { text: 'Overview, Records, Prices, Expert Graders, Devices, Audit', color: 'blue' },
      { text: 'Secret Grade A presentation safety net next to Logout', color: 'a' },
    ],
  },
  {
    id: 'sync',
    act: 'Act 8 · Kiosk + Mobile Sync',
    durationInFrames: 240,
    cue: 'sync',
    kicker: 'Shared Supabase Ledger',
    titlePrefix: 'Offline-First',
    titleAccent: 'Cloud Sync',
    desc: 'Both Kiosk (source: kiosk) and Mobile App (source: mobile) sync records and private JPEG evidence to one shared ledger.',
    img: 'kiosk-screens/01b-welcome-sync-modal.png',
    bullets: [
      { text: 'Per-grader selective sync + Slow Wi-Fi background mode', color: 'blue' },
      { text: 'Verified row + storage persistence before marking Synced', color: 'a' },
    ],
  },
  {
    id: 'outro',
    act: 'Outro · TunaEye v2.7.0',
    durationInFrames: 240,
    cue: 'intro',
    hero: true,
    kicker: 'Raspberry Pi 5 · Kiosk PWA · Mobile Companion',
    titlePrefix: 'TunaEye —',
    titleAccent: 'Sea Beyond',
    titleSuffix: 'the Cut.',
    desc: 'Built on expert knowledge. Enhanced by computer vision.',
  },
];

const TRANSITION_FRAMES = 18;

export const TOTAL_DURATION_FRAMES =
  SCENES.reduce((acc, s) => acc + s.durationInFrames, 0) - (SCENES.length - 1) * TRANSITION_FRAMES;

export const TunaEyeDemo: React.FC = () => {
  let offset = 0;
  const sfxStarts = SCENES.map((s, idx) => {
    const start = offset;
    offset += s.durationInFrames - (idx < SCENES.length - 1 ? TRANSITION_FRAMES : 0);
    return { id: s.id, cue: s.cue, from: start };
  });

  return (
    <AbsoluteFill style={{ backgroundColor: '#060d1f' }}>
      {/* Continuous 98 BPM Ocean Marimba Bed */}
      <Audio src={staticFile('audio/ocean-bed-98bpm.wav')} volume={0.26} loop />

      {/* Synchronized SFX Cues */}
      {sfxStarts.map((item) => (
        <Sequence key={item.id} from={item.from} durationInFrames={90}>
          <Audio src={staticFile(`audio/${item.cue}.wav`)} volume={0.68} />
        </Sequence>
      ))}

      <TransitionSeries>
        {SCENES.map((scene, i) => (
          <React.Fragment key={scene.id}>
            <TransitionSeries.Sequence durationInFrames={scene.durationInFrames}>
              {scene.hero ? (
                <HeroLockup
                  kicker={scene.kicker}
                  titlePrefix={scene.titlePrefix}
                  titleAccent={scene.titleAccent}
                  titleSuffix={scene.titleSuffix}
                  desc={scene.desc}
                />
              ) : (
                <TabletScene scene={scene} />
              )}
            </TransitionSeries.Sequence>
            {i < SCENES.length - 1 && (
              <TransitionSeries.Transition
                presentation={i % 2 === 0 ? slide({ direction: 'from-right' }) : fade()}
                timing={springTiming({ config: { damping: 200 }, durationInFrames: TRANSITION_FRAMES })}
              />
            )}
          </React.Fragment>
        ))}
      </TransitionSeries>
    </AbsoluteFill>
  );
};
