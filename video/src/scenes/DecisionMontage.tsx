import React from 'react';
import {Series} from 'remotion';
import {TabletScene} from './TabletScene';

export const DECISION_BEATS = [
  {frame: 0, duration: 360, screen: 'demo-01-grade-a.png', label: 'Grade A'},
  {frame: 360, duration: 240, screen: 'demo-02-grade-b.png', label: 'Grade B'},
  {frame: 600, duration: 240, screen: 'demo-08-borderline-75.png', label: '75% boundary'},
  {frame: 840, duration: 180, screen: 'demo-03-grade-c-tailneed.png', label: 'Grade C requests Tail-Cut'},
  {frame: 1020, duration: 180, screen: '21-tail-needed-correct.png', label: 'Tail-Cut choices'},
  {frame: 1200, duration: 240, screen: 'demo-04-needs-tail.png', label: 'Combined Grade B'},
  {frame: 1440, duration: 180, screen: 'demo-05-tail-upgrades-a.png', label: 'Tail upgrades to A'},
  {frame: 1620, duration: 120, screen: 'demo-06-tail-confirms-c.png', label: 'Tail confirms C evidence'},
  {frame: 1740, duration: 180, screen: 'demo-03b-grade-c-final.png', label: 'Final Grade C'},
  {frame: 1920, duration: 240, screen: 'demo-07-no-tail-provisional.png', label: 'No Tail-Cut provisional'},
  {frame: 2160, duration: 120, screen: 'demo-11-invalid-core.png', label: 'Invalid Sashibo core'},
  {frame: 2280, duration: 120, screen: '05b-invalid-sample-modal.png', label: 'Cannot Be Determined'},
  {frame: 2400, duration: 120, screen: 'demo-12-invalid-tail.png', label: 'Invalid Tail-Cut'},
  {frame: 2520, duration: 240, screen: '20-core-camera-live.png', label: 'Camera reset'},
  {frame: 2760, duration: 180, screen: 'demo-09-needs-expert.png', label: 'Black override card'},
  {frame: 2940, duration: 180, screen: 'demo-10-tail-uncertain-expert.png', label: 'Both cuts uncertain'},
  {frame: 3120, duration: 240, screen: '27-override-dialog.png', label: 'Supervisor PIN override'},
] as const;

export const DECISION_CUES = [
  {frame: 120, file: 'gradeA.wav'},
  {frame: 360, file: 'gradeB.wav'},
  {frame: 600, file: 'tap.wav'},
  {frame: 840, file: 'tail.wav'},
  {frame: 1200, file: 'gradeB.wav'},
  {frame: 1440, file: 'lift.wav'},
  {frame: 1740, file: 'tail.wav'},
  {frame: 1920, file: 'tap.wav'},
  {frame: 2160, file: 'alert.wav'},
  {frame: 2400, file: 'alert.wav'},
  {frame: 2520, file: 'glide.wav'},
  {frame: 2760, file: 'lock.wav'},
  {frame: 3120, file: 'keypad.wav'},
] as const;

// Keep the authored cuts contiguous and the act exactly 56 seconds at 60 fps.
if (DECISION_BEATS.some((beat, i) => beat.frame !== DECISION_BEATS.slice(0, i).reduce((end, previous) => end + previous.duration, 0)) ||
  DECISION_BEATS.reduce((end, beat) => end + beat.duration, 0) !== 3360) {
  throw new Error('DecisionMontage must cover exactly 3360 contiguous frames');
}

export const DecisionMontage: React.FC = () => (
  <Series>
    <Series.Sequence name="Confident Grade A" durationInFrames={360}>
      <TabletScene act="04 / DECISIONS" eyebrow="01 · CONFIDENT CORE" title="A clear Grade A." description="96.3% confidence. The Sashibo core is enough." bullets={['A or B + confidence ≥ 75%', 'Accept grade → issue receipt']} screenshot="demo-01-grade-a.png" grade="A" duration={360} />
    </Series.Sequence>
    <Series.Sequence name="Confident Grade B" durationInFrames={240}>
      <TabletScene act="04 / DECISIONS" eyebrow="02 · CONFIDENT CORE" title="Grade B. Ready." description="94.0% confidence. The same direct path." bullets={['No Tail-Cut required', 'Expert knowledge, consistent decisions']} screenshot="demo-02-grade-b.png" grade="B" duration={240} />
    </Series.Sequence>
    <Series.Sequence name="75 percent boundary" durationInFrames={240}>
      <TabletScene act="04 / DECISIONS" eyebrow="03 · THE CONFIDENCE BOUNDARY" title="75% is the line." description="This 75.5% Grade B clears the threshold." bullets={['A / B at ≥ 75% → accept', 'Below 75% → request Tail-Cut']} screenshot="demo-08-borderline-75.png" grade="B" duration={240} />
    </Series.Sequence>
    <Series.Sequence name="Grade C requests Tail-Cut" durationInFrames={180}>
      <TabletScene act="04 / DECISIONS" eyebrow="04 · ADD EVIDENCE" title="A second look." description="Grade C requests a Tail-Cut, even at high confidence." bullets={['Grade C or core confidence < 75%']} screenshot="demo-03-grade-c-tailneed.png" grade="C" duration={180} />
    </Series.Sequence>
    <Series.Sequence name="Tail-Cut choice" durationInFrames={180}>
      <TabletScene act="04 / DECISIONS" eyebrow="CORE → TAIL-CUT" title="Tail-Cut needed." description="Scan a second cut, or record a provisional result." bullets={['Scan Tail-Cut → combine both cuts', 'No Tail-Cut → provisional, when eligible']} screenshot="21-tail-needed-correct.png" duration={180} />
    </Series.Sequence>
    <Series.Sequence name="Tail-Cut combines to Grade B" durationInFrames={240}>
      <TabletScene act="04 / DECISIONS" eyebrow="05 · TWO CUTS, ONE DECISION" title="Evidence adds up." description="An uncertain core gains a confident Tail-Cut check." bullets={['Core: 74.2% C', 'Tail: 91.4% B → combined Grade B']} screenshot="demo-04-needs-tail.png" grade="B" duration={240} />
    </Series.Sequence>
    <Series.Sequence name="Tail-Cut upgrades to Grade A" durationInFrames={180}>
      <TabletScene act="04 / DECISIONS" eyebrow="06 · TAIL UPGRADE" title="A stronger result." description="The Tail-Cut can lift an uncertain core to Grade A." bullets={['Core: 71.5% B', 'Tail: 93.8% A → upgraded Grade A']} screenshot="demo-05-tail-upgrades-a.png" grade="A" duration={180} />
    </Series.Sequence>
    <Series.Sequence name="Tail confirms Grade C evidence" durationInFrames={120}>
      <TabletScene act="04 / DECISIONS" eyebrow="07 · TAIL CONFIRMS C" title="Every cut matters." description="Core: 72.4% B. Tail: 89.2% C." screenshot="demo-06-tail-confirms-c.png" grade="C" duration={120} />
    </Series.Sequence>
    <Series.Sequence name="Final Grade C" durationInFrames={180}>
      <TabletScene act="04 / DECISIONS" eyebrow="08 · FINAL OUTCOME" title="Grade C, clearly." description="The final card makes the decision unmistakable." bullets={['Both cuts retained with the record']} screenshot="demo-03b-grade-c-final.png" grade="C" duration={180} />
    </Series.Sequence>
    <Series.Sequence name="No Tail-Cut provisional" durationInFrames={240}>
      <TabletScene act="04 / DECISIONS" eyebrow="09 · NO TAIL-CUT AVAILABLE" title="Marked provisional." description="A 72.0% Grade B core is saved with its limitation visible." bullets={['No Tail-Cut + core confidence ≥ 60%', 'PROVISIONAL stays on the grade card']} screenshot="demo-07-no-tail-provisional.png" grade="B" duration={240} />
    </Series.Sequence>
    <Series.Sequence name="Invalid Sashibo core" durationInFrames={120}>
      <TabletScene act="04 / DECISIONS" eyebrow="10 · INVALID CORE" title="Check the sample." description="Non-tuna input is rejected." screenshot="demo-11-invalid-core.png" duration={120} />
    </Series.Sequence>
    <Series.Sequence name="Cannot Be Determined modal" durationInFrames={120}>
      <TabletScene act="04 / DECISIONS" eyebrow="INVALID SAMPLE · 422" title="Cannot Be Determined." description="The notice holds for two seconds." screenshot="05b-invalid-sample-modal.png" duration={120} />
    </Series.Sequence>
    <Series.Sequence name="Invalid Tail-Cut" durationInFrames={120}>
      <TabletScene act="04 / DECISIONS" eyebrow="11 · INVALID TAIL-CUT" title="Same safeguard." description="The Tail-Cut is checked, too." screenshot="demo-12-invalid-tail.png" duration={120} />
    </Series.Sequence>
    <Series.Sequence name="Camera reopens after rejection" durationInFrames={240}>
      <TabletScene act="04 / DECISIONS" eyebrow="CLEAR → RESET → RECAPTURE" title="Ready to try again." description="The invalid frame clears and the camera reopens." bullets={['A rejected image never becomes a grade', 'Place a valid sample before recapturing']} screenshot="20-core-camera-live.png" duration={240} />
    </Series.Sequence>
    <Series.Sequence name="Black manual override card" durationInFrames={180}>
      <TabletScene act="04 / DECISIONS" eyebrow="12 · EXPERT NEEDED" title="Expert judgment leads." description="Uncertain evidence locks the automatic decision." bullets={['Combined confidence < 75%', 'Or severe Grade A ↔ C disagreement']} screenshot="demo-09-needs-expert.png" grade="override" duration={180} />
    </Series.Sequence>
    <Series.Sequence name="Both cuts uncertain" durationInFrames={180}>
      <TabletScene act="04 / DECISIONS" eyebrow="13 · TAIL ALSO UNCERTAIN" title="No forced answer." description="Core: 73.2% A. Tail: 71.8% B." bullets={['Both cuts uncertain → supervisor review']} screenshot="demo-10-tail-uncertain-expert.png" grade="override" duration={180} />
    </Series.Sequence>
    <Series.Sequence name="Supervisor PIN and reason" durationInFrames={240}>
      <TabletScene act="04 / DECISIONS" eyebrow="SUPERVISOR PIN + REASON" title="Extend the expert eye." description="An expert authorizes the final grade with a recorded reason." bullets={['Demo PIN: 1234', 'Original prediction + override remain auditable']} screenshot="27-override-dialog.png" grade="override" duration={240} />
    </Series.Sequence>
  </Series>
);
