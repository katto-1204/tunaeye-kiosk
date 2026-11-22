import {Sequence, useCurrentFrame} from 'remotion';
import {HeroLockup} from './HeroLockup';
import {TabletScene} from './TabletScene';
import {theme} from '../theme';

const Serif = ({children}:{children:React.ReactNode}) => <span style={{fontFamily:theme.serif,fontStyle:'italic',fontWeight:400}}>{children}</span>;

export const WelcomeAct = () => <>
  <Sequence from={0} durationInFrames={360}><HeroLockup/></Sequence>
  <Sequence from={360} durationInFrames={240}><TabletScene act="01 / WELCOME" eyebrow="THE EXPERT EYE, EXTENDED" title={<>See more.<br/><Serif>Decide clearly.</Serif></>} description="Computer vision built around the way expert graders work." screenshot="00-landing-page.png" duration={240}/></Sequence>
  <Sequence from={600} durationInFrames={504}><TabletScene act="01 / WELCOME" eyebrow="ONE TAP TO BEGIN" title={<>Ready at<br/>the <Serif>station.</Serif></>} description="Local grading on Raspberry Pi 5. Built for the working day." bullets={['Start Grading', 'Offline-first · Station 01 · v2.7']} screenshot="01-welcome.png" duration={504}/></Sequence>
</>;

const Preflight = () => {
  const frame=useCurrentFrame();
  const labels=['Pi connection','Camera','Inference','Storage','Printer','Station ready'];
  return <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:28,maxWidth:510}}>{labels.map((label,i)=><div key={label} style={{fontFamily:theme.body,fontSize:15,padding:'8px 12px',borderRadius:30,background:frame>80+i*14?'#D9F4E8':'#E4EAF2',color:frame>80+i*14?'#087E50':'#68798F'}}>{frame>80+i*14?'✓ ':'○ '}{label}</div>)}</div>;
};

export const SignInAct = () => <>
  <Sequence from={0} durationInFrames={480}><TabletScene act="02 / SIGN IN + WEIGHT" eyebrow="IDENTIFY · CHECK · CONTINUE" title={<>Start with<br/>the <Serif>grader.</Serif></>} description="Enter a name, pair the Bluetooth printer and verify station readiness." screenshot="02-grader-identity.png" duration={480}><Preflight/></TabletScene></Sequence>
  <Sequence from={480} durationInFrames={624}><TabletScene act="02 / SIGN IN + WEIGHT" eyebrow="TOUCH KEYPAD" title={<>Every fish<br/><Serif>counts.</Serif></>} description="Enter the fish weight with the on-screen keypad." bullets={['Valid weight: 15–200 kg', 'Weight stays with the grading record']} screenshot="03-weight-entry.png" duration={624}/></Sequence>
</>;

export const CaptureAct = () => <>
  <Sequence from={0} durationInFrames={120}><TabletScene act="03 / PLACE + CAPTURE" eyebrow="PLACEMENT / 01" title={<>Prepare<br/>the <Serif>sample.</Serif></>} description="Follow the chamber placement guide." screenshot="04-placement-guide.png" duration={120}/></Sequence>
  <Sequence from={120} durationInFrames={120}><TabletScene act="03 / PLACE + CAPTURE" eyebrow="PLACEMENT / 02" title={<>Set it<br/>in <Serif>place.</Serif></>} description="Keep the sample aligned for capture." screenshot="04b-placement-guide-step2.png" duration={120}/></Sequence>
  <Sequence from={240} durationInFrames={120}><TabletScene act="03 / PLACE + CAPTURE" eyebrow="PLACEMENT / 03" title={<>Light reveals<br/>the <Serif>detail.</Serif></>} description="A controlled 5000K lighting chamber." screenshot="04c-placement-guide-step3.png" duration={120}/></Sequence>
  <Sequence from={360} durationInFrames={240}><TabletScene act="03 / PLACE + CAPTURE" eyebrow="SASHIBO CORE" title={<>One cut.<br/><Serif>More insight.</Serif></>} description="Capture directly from the Raspberry Pi camera." bullets={['Consistent lighting', 'Review the image before grading']} screenshot="05-core-capture.png" duration={240}/></Sequence>
  <Sequence from={600} durationInFrames={504}><TabletScene act="03 / PLACE + CAPTURE" eyebrow="RASPBERRY PI CAMERA" title={<>Capture.<br/>Scan. <Serif>Grade.</Serif></>} description="Computer vision reads the Sashibo core evidence." bullets={['Illustrative scan overlay', 'Sample images shown for demonstration']} screenshot="20-core-camera-live.png" scan duration={504}/></Sequence>
</>;

const Countdown = () => {
  const frame=useCurrentFrame();
  return <div style={{marginTop:30,display:'flex',gap:12,alignItems:'center'}}>{[3,2,1].map((n,i)=><div key={n} style={{width:62,height:62,borderRadius:18,display:'flex',justifyContent:'center',alignItems:'center',fontSize:32,background:Math.floor(frame/60)===i?theme.cobalt:'#E1E9F4',color:Math.floor(frame/60)===i?'white':theme.deep}}>{n}</div>)}</div>;
};

export const ReceiptAct = () => <>
  <Sequence from={0} durationInFrames={420}><TabletScene act="05 / RECEIPT" eyebrow="POS-58 THERMAL" title={<>A record<br/>you can <Serif>hold.</Serif></>} description="Issue a 58mm receipt with the grade, weight and saved price." bullets={['Bluetooth paired → auto-print after 700ms', 'Manual print remains available']} screenshot="10-receipt.png" duration={420}/></Sequence>
  <Sequence from={420} durationInFrames={180}><TabletScene act="05 / RECEIPT" eyebrow="GRADE ANOTHER" title={<>Next fish.<br/><Serif>Same care.</Serif></>} description="A three-second reset keeps the line moving." screenshot="11-completion.png" duration={180}><Countdown/></TabletScene></Sequence>
  <Sequence from={600} durationInFrames={144}><TabletScene act="05 / RECEIPT" eyebrow="BACK TO WEIGHT" title="Ready again." description="Continue with the next fish in the same session." screenshot="03-weight-entry.png" duration={144}/></Sequence>
</>;

export const DashboardAct = () => <>
  <Sequence from={0} durationInFrames={300}><TabletScene act="06 / GRADER DASHBOARD" eyebrow="A CLEAR DAILY VIEW" title={<>Your work.<br/>Your <Serif>records.</Serif></>} description="Sessions, samples and captured evidence, together." bullets={['My records ↔ All device records', 'Sync now · Logout · page navigation']} screenshot="19-grader-dashboard.png" duration={300}/></Sequence>
  <Sequence from={300} durationInFrames={120}><TabletScene act="06 / GRADER DASHBOARD" eyebrow="NEW GRADER" title="A clean start." description="A new grader begins with no records yet." screenshot="19b-grader-dashboard-empty.png" duration={120}/></Sequence>
  <Sequence from={420} durationInFrames={180}><TabletScene act="06 / GRADER DASHBOARD" eyebrow="OPEN ANY RECORD" title={<>Evidence<br/>behind the <Serif>grade.</Serif></>} description="Inspect Sashibo and Tail-Cut photos with the saved result." screenshot="18-record-detail.png" duration={180}/></Sequence>
  <Sequence from={600} durationInFrames={144}><TabletScene act="06 / GRADER DASHBOARD" eyebrow="RECORD DETAIL" title="Look closer." description="Zoom captured photos. Review the breakdown. Reprint the receipt." screenshot="35-record-detail-full.png" duration={144}/></Sequence>
</>;

const CloudFlow = () => {
  const frame=useCurrentFrame();
  return <div style={{marginTop:28,fontFamily:theme.body,width:510}}>
    <div style={{display:'flex',gap:12}}>{['Kiosk','Mobile'].map(name=><div key={name} style={{flex:1,padding:'14px 16px',border:'1px solid #BCD0EB',borderRadius:15,background:'white',fontSize:20}}>{name}<div style={{fontSize:13,color:'#64748B',marginTop:5}}>source: ‘{name.toLowerCase()}’</div></div>)}</div>
    <svg width="510" height="45" viewBox="0 0 510 45"><path d="M120 0V20H255V45 M390 0V20H255" fill="none" stroke="#93B8EE" strokeWidth="2"/>{[120,390].map(x=><circle key={x} cx={x} cy={(frame%80)/80*20} r="4" fill={theme.cobalt}/>)}</svg>
    <div style={{borderRadius:15,padding:'13px 18px',background:theme.deep,color:'white',textAlign:'center',fontSize:21}}>Supabase · one shared ledger</div>
  </div>;
};

export const AdminAct = () => <>
  <Sequence from={0} durationInFrames={120}><TabletScene act="07 / ADMIN + SYNC" eyebrow="PIN-PROTECTED ACCESS" title="Supervisor access." description="Demo PIN: 1234." screenshot="12-admin-pin.png" duration={120}/></Sequence>
  <Sequence from={120} durationInFrames={180}><TabletScene act="07 / ADMIN + SYNC" eyebrow="OVERVIEW" title={<>See the<br/><Serif>whole station.</Serif></>} description="Seven time filters, seven-day volume and grade distribution." bullets={['All time · month · week · today', 'Yesterday · hour · older than 30 days']} screenshot="13-admin-overview.png" duration={180}/></Sequence>
  <Sequence from={300} durationInFrames={90}><TabletScene act="07 / ADMIN + SYNC" eyebrow="RECORDS" title="Trace every grade." description="Search, filter and export the records as CSV." screenshot="14-admin-records.png" duration={90}/></Sequence>
  <Sequence from={390} durationInFrames={90}><TabletScene act="07 / ADMIN + SYNC" eyebrow="EVIDENCE AUDIT" title="Keep the evidence." description="Saved rates. Original predictions. Overrides. Sync status." screenshot="14b-admin-record-detail.png" duration={90}/></Sequence>
  <Sequence from={480} durationInFrames={60}><TabletScene act="07 / ADMIN + SYNC" eyebrow="EXPERT GRADERS" title="Know the team." description="Registered graders, counts and their records." screenshot="15b-admin-expert-graders.png" duration={60}/></Sequence>
  <Sequence from={540} durationInFrames={60}><TabletScene act="07 / ADMIN + SYNC" eyebrow="DEVICES" title="Check readiness." description="Pi camera. Bluetooth printer. Network." screenshot="15-admin-devices.png" duration={60}/></Sequence>
  <Sequence from={600} durationInFrames={60}><TabletScene act="07 / ADMIN + SYNC" eyebrow="SETTINGS" title="Set the station." description="Station name, Pi URL, pricing and PIN." screenshot="16-admin-settings.png" duration={60}/></Sequence>
  <Sequence from={660} durationInFrames={60}><TabletScene act="07 / ADMIN + SYNC" eyebrow="AUDIT LOG" title="Follow the trail." description="A chronological history of station activity." screenshot="17-admin-audit-log.png" duration={60}/></Sequence>
  <Sequence from={720} durationInFrames={384}><TabletScene act="07 / ADMIN + SYNC" eyebrow="LOCAL FIRST · CLOUD WHEN READY" title={<>Two sources.<br/>One <Serif>ledger.</Serif></>} description="Choose Sync now when internet is available." screenshot="01b-welcome-sync-modal.png" duration={384}><CloudFlow/></TabletScene></Sequence>
</>;
