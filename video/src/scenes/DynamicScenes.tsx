import type { ReactNode } from 'react';
import { AbsoluteFill, Img, OffthreadVideo, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { theme } from '../theme';

const Serif = ({ children }: { children: ReactNode }) => (
  <span style={{ fontFamily: theme.serif, fontStyle: 'italic', fontWeight: 400 }}>{children}</span>
);

const ChromeBar = ({ act, dark = false }: { act: string; dark?: boolean }) => (
  <div
    style={{
      position: 'absolute',
      left: 72,
      top: 44,
      right: 72,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      zIndex: 10,
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <Img src={staticFile('assets/applogo.svg')} style={{ width: 36, height: 36, borderRadius: 8 }} />
      <span style={{ fontWeight: 700, fontSize: 22, color: dark ? '#F8FAFC' : theme.ocean }}>TunaEye</span>
    </div>
    <div
      style={{
        fontFamily: theme.body,
        fontSize: 15,
        letterSpacing: 3,
        fontWeight: 600,
        color: dark ? '#7DD3FC' : theme.deep,
        padding: '6px 14px',
        borderRadius: 999,
        background: dark ? '#1E293B' : '#E2ECFA',
      }}
    >
      {act}
    </div>
  </div>
);

const TabletFrame = ({
  screenshot,
  video,
  playbackRate = 1,
  scan = false,
  tapAt,
  accent = theme.cobalt,
  style,
}: {
  screenshot?: string;
  video?: string;
  playbackRate?: number;
  scan?: boolean;
  tapAt?: { x: string; y: string; frame: number };
  accent?: string;
  style?: React.CSSProperties;
}) => {
  const frame = useCurrentFrame();
  const tapProgress =
    tapAt && frame >= tapAt.frame
      ? interpolate(frame - tapAt.frame, [0, 36], [0, 1], { extrapolateRight: 'clamp' })
      : null;

  return (
    <div
      style={{
        position: 'relative',
        padding: 14,
        borderRadius: 32,
        background: 'linear-gradient(135deg,#374151,#090D16 35%,#253550)',
        border: `2px solid ${accent}55`,
        boxShadow: '0 28px 58px #0F172A33, inset 0 0 0 2px #FFFFFF18',
        ...style,
      }}
    >
      <div style={{ borderRadius: 18, overflow: 'hidden', position: 'relative', aspectRatio: '1280/864', background: '#E9F0FA' }}>
        {video ? (
          <OffthreadVideo
            src={staticFile(`captures/${video}`)}
            muted
            playbackRate={playbackRate}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <Img
            src={staticFile(`kiosk-screens/${screenshot}`)}
            style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
          />
        )}
        {scan && (
          <div
            style={{
              position: 'absolute',
              left: '4%',
              right: '4%',
              top: `${8 + ((frame % 90) / 90) * 84}%`,
              height: 4,
              background: theme.scan,
              boxShadow: `0 0 18px 4px ${theme.scan}AA`,
            }}
          />
        )}
        {tapAt && tapProgress !== null && tapProgress < 1 && (
          <div
            style={{
              position: 'absolute',
              left: tapAt.x,
              top: tapAt.y,
              width: 24 + tapProgress * 76,
              height: 24 + tapProgress * 76,
              borderRadius: '50%',
              border: '3px solid #2563EB',
              background: '#2563EB33',
              transform: 'translate(-50%, -50%)',
              opacity: 1 - tapProgress,
            }}
          />
        )}
      </div>
    </div>
  );
};

/* 1. CENTER STAGE: Full-bleed centered tablet + floating glass callout pills */
export const CenterStageScene = ({
  act,
  headline,
  screenshot,
  video,
  playbackRate = 1,
  secondScreenshot,
  switchAt = 160,
  pills,
  tapAt,
}: {
  act: string;
  headline: ReactNode;
  screenshot?: string;
  video?: string;
  playbackRate?: number;
  secondScreenshot?: string;
  switchAt?: number;
  pills: string[];
  tapAt?: { x: string; y: string; frame: number };
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 18, stiffness: 180 } });
  const activeShot = secondScreenshot && frame >= switchAt ? secondScreenshot : screenshot;

  return (
    <AbsoluteFill style={{ background: theme.frost, fontFamily: theme.sans, color: theme.ocean }}>
      <ChromeBar act={act} />
      <div
        style={{
          position: 'absolute',
          top: 102,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontSize: 52,
          fontWeight: 700,
          letterSpacing: -2,
          opacity: enter,
          transform: `translateY(${(1 - enter) * 18}px)`,
        }}
      >
        {headline}
      </div>
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 190,
          width: 1060,
          transform: `translateX(-50%) scale(${0.92 + enter * 0.08})`,
        }}
      >
        <TabletFrame screenshot={activeShot} video={video} playbackRate={playbackRate} tapAt={tapAt} />
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 34,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          gap: 14,
        }}
      >
        {pills.map((p, i) => {
          const s = spring({ frame: frame - 12 - i * 8, fps, config: { damping: 20, stiffness: 180 } });
          return (
            <div
              key={p}
              style={{
                fontFamily: theme.body,
                fontSize: 18,
                fontWeight: 600,
                padding: '10px 20px',
                borderRadius: 999,
                background: 'white',
                border: '1px solid #CBD5E1',
                boxShadow: '0 8px 20px #0F172A10',
                opacity: s,
                transform: `translateY(${(1 - s) * 14}px)`,
              }}
            >
              {p}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/* 2. PLACEMENT FILMSTRIP: 3-card horizontal sequence */
export const PlacementFilmstripScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const active = frame < 70 ? 0 : frame < 140 ? 1 : 2;
  const steps = [
    { img: '04-placement-guide.png', num: '01', label: 'Prepare sample' },
    { img: '04b-placement-guide-step2.png', num: '02', label: 'Align Sashibo core' },
    { img: '04c-placement-guide-step3.png', num: '03', label: 'Controlled chamber' },
  ];

  return (
    <AbsoluteFill style={{ background: '#EEF4FC', fontFamily: theme.sans, color: theme.ocean }}>
      <ChromeBar act="03 / PLACEMENT" />
      <div style={{ position: 'absolute', top: 106, left: 72, fontSize: 52, fontWeight: 700, letterSpacing: -2 }}>
        Consistent light. <Serif>Clean evidence.</Serif>
      </div>
      <div
        style={{
          position: 'absolute',
          top: 215,
          left: 72,
          right: 72,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 28,
        }}
      >
        {steps.map((st, i) => {
          const isCurrent = active === i;
          const enter = spring({ frame: frame - i * 8, fps, config: { damping: 18, stiffness: 170 } });
          return (
            <div
              key={st.num}
              style={{
                background: 'white',
                borderRadius: 24,
                padding: 18,
                border: isCurrent ? `3px solid ${theme.cobalt}` : '1px solid #CBD5E1',
                boxShadow: isCurrent ? '0 22px 46px #2563EB28' : '0 10px 24px #0F172A10',
                transform: `scale(${(isCurrent ? 1.03 : 0.97) * (0.9 + enter * 0.1)})`,
                opacity: enter,
              }}
            >
              <div style={{ borderRadius: 14, overflow: 'hidden', aspectRatio: '1280/864', background: '#E9F0FA' }}>
                <Img src={staticFile(`kiosk-screens/${st.img}`)} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span
                  style={{
                    fontFamily: theme.body,
                    fontSize: 15,
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: 999,
                    background: isCurrent ? theme.cobalt : '#E2E8F0',
                    color: isCurrent ? 'white' : theme.deep,
                  }}
                >
                  {st.num}
                </span>
                <span style={{ fontSize: 22, fontWeight: 600 }}>{st.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/* 3. PI SCAN SCENE: Dark-room CV reticle + live confidence meter */
export const PiScanScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 18, stiffness: 160 } });
  const conf = interpolate(frame, [40, 260], [14, 96.3], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: '#091224', fontFamily: theme.sans, color: '#F8FAFC' }}>
      <ChromeBar act="03 / PI CAMERA SCAN" dark />
      <div style={{ position: 'absolute', left: 72, top: 200, width: 520, opacity: enter }}>
        <div style={{ fontFamily: theme.body, fontSize: 16, letterSpacing: 3, color: '#38BDF8', fontWeight: 600 }}>
          RASPBERRY PI 5 · LIVE PERFORMANCE
        </div>
        <div style={{ fontSize: 64, fontWeight: 700, letterSpacing: -2.5, lineHeight: 1.06, marginTop: 18 }}>
          Capture.<br />Scan. <Serif>Grade.</Serif>
        </div>
        <div style={{ fontFamily: theme.body, fontSize: 23, lineHeight: 1.5, color: '#CBD5E1', marginTop: 22 }}>
          Real-time capture inside the controlled chamber. Zero cloud dependency.
        </div>
        <div style={{ marginTop: 34, padding: 20, borderRadius: 20, background: '#111C33', border: '1px solid #38BDF844' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: theme.body, fontSize: 16, color: '#94A3B8' }}>
            <span>SASHIBO CORE CONFIDENCE</span>
            <span style={{ color: '#38BDF8', fontWeight: 700 }}>{conf.toFixed(1)}%</span>
          </div>
          <div style={{ height: 12, borderRadius: 999, background: '#1E293B', marginTop: 12, overflow: 'hidden' }}>
            <div style={{ width: `${conf}%`, height: '100%', background: 'linear-gradient(90deg, #2563EB, #38BDF8, #12A56A)' }} />
          </div>
        </div>
      </div>
      <div style={{ position: 'absolute', right: 72, top: 155, width: 1120, transform: `scale(${0.94 + enter * 0.06})` }}>
        <TabletFrame video="clip-03-placement-scan.mp4" playbackRate={1} scan accent="#38BDF8" />
      </div>
    </AbsoluteFill>
  );
};

/* 4. GRADE COMPARISON GRID: 3-column Grade A / B / 75% Boundary */
export const GradeComparisonGrid = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cards = [
    { img: 'demo-01-grade-a.png', badge: 'GRADE A · 96.3%', color: theme.A, note: 'Direct to receipt' },
    { img: 'demo-02-grade-b.png', badge: 'GRADE B · 94.0%', color: theme.B, note: 'Direct to receipt' },
    { img: 'demo-08-borderline-75.png', badge: '75.5% THRESHOLD', color: theme.cobalt, note: 'Clears 75% line' },
  ];

  return (
    <AbsoluteFill style={{ background: theme.frost, fontFamily: theme.sans, color: theme.ocean }}>
      <ChromeBar act="04 / CONFIDENT DECISIONS" />
      <div style={{ position: 'absolute', top: 106, left: 72, fontSize: 52, fontWeight: 700, letterSpacing: -2 }}>
        At <Serif>75%+</Serif>, the core is enough.
      </div>
      <div style={{ position: 'absolute', top: 210, left: 72, right: 72, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 26 }}>
        {cards.map((c, i) => {
          const s = spring({ frame: frame - i * 14, fps, config: { damping: 17, stiffness: 175 } });
          return (
            <div
              key={c.badge}
              style={{
                background: 'white',
                borderRadius: 24,
                padding: 16,
                border: `2px solid ${c.color}`,
                boxShadow: '0 18px 40px #0F172A14',
                opacity: s,
                transform: `translateY(${(1 - s) * 32}px)`,
              }}
            >
              <div style={{ borderRadius: 14, overflow: 'hidden', aspectRatio: '1280/864', background: '#E9F0FA' }}>
                <Img src={staticFile(`kiosk-screens/${c.img}`)} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: theme.body, fontSize: 15, fontWeight: 700, color: c.color === theme.B ? '#946600' : c.color }}>
                  {c.badge}
                </span>
                <span style={{ fontFamily: theme.body, fontSize: 16, color: '#475569' }}>{c.note}</span>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/* 5. TAIL-CUT BRANCH SCENE: Real live Tail-Cut recording + outcome badges */
export const TailCutBranchScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 18, stiffness: 170 } });
  const badges = [
    { label: 'Tail upgrades → Grade A', color: theme.A },
    { label: 'Combined evidence → Grade B', color: theme.B },
    { label: 'Tail confirms → Final Grade C', color: theme.C },
    { label: 'No Tail-Cut → Provisional', color: theme.cobalt },
  ];

  return (
    <AbsoluteFill style={{ background: '#F1F5F9', fontFamily: theme.sans, color: theme.ocean }}>
      <ChromeBar act="04 / TAIL-CUT LOGIC" />
      <div style={{ position: 'absolute', top: 102, left: 72, fontSize: 48, fontWeight: 700, letterSpacing: -2 }}>
        Uncertain or Grade C? <Serif>Live Tail-Cut verification.</Serif>
      </div>
      <div style={{ position: 'absolute', left: 72, top: 192, width: 1120, opacity: enter }}>
        <TabletFrame video="clip-04b-tail-cut.mp4" playbackRate={1} accent={theme.A} />
      </div>
      <div style={{ position: 'absolute', right: 72, top: 220, width: 540, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {badges.map((b, i) => {
          const s = spring({ frame: frame - i * 18, fps, config: { damping: 18, stiffness: 170 } });
          return (
            <div
              key={b.label}
              style={{
                padding: '18px 22px',
                borderRadius: 18,
                background: 'white',
                border: `2px solid ${b.color}`,
                fontFamily: theme.body,
                fontSize: 20,
                fontWeight: 700,
                color: b.color === theme.B ? '#946600' : b.color,
                opacity: s,
                transform: `translateX(${(1 - s) * 24}px)`,
              }}
            >
              {b.label}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/* 6. ALERT SAFEGUARD SCENE: Real live non-tuna rejection + Camera reset */
export const AlertSafeguardScene = () => {
  return (
    <AbsoluteFill style={{ background: '#FFF7ED', fontFamily: theme.sans, color: theme.ocean }}>
      <ChromeBar act="04 / SAFEGUARDS" />
      <div style={{ position: 'absolute', top: 102, left: 72, fontSize: 50, fontWeight: 700, letterSpacing: -2 }}>
        Rejected samples <Serif>never</Serif> become grades.
      </div>
      <div style={{ position: 'absolute', left: '50%', top: 192, width: 1060, transform: 'translateX(-50%)' }}>
        <TabletFrame video="clip-04c-invalid.mp4" playbackRate={1} accent={theme.C} />
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 34,
          left: '50%',
          transform: 'translateX(-50%)',
          fontFamily: theme.body,
          fontSize: 20,
          fontWeight: 700,
          padding: '10px 24px',
          borderRadius: 999,
          background: '#FEE2E2',
          color: '#991B1B',
        }}
      >
        Non-tuna rejected cleanly · Frame cleared · Camera ready
      </div>
    </AbsoluteFill>
  );
};

/* 7. OVERRIDE SPOTLIGHT SCENE: Real live Black Override + Supervisor PIN */
export const OverrideSpotlightScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 18, stiffness: 160 } });

  return (
    <AbsoluteFill style={{ background: '#0F172A', fontFamily: theme.sans, color: '#F8FAFC' }}>
      <ChromeBar act="04 / EXPERT OVERRIDE" dark />
      <div style={{ position: 'absolute', left: 72, top: 210, width: 510, opacity: enter }}>
        <div style={{ fontFamily: theme.body, fontSize: 16, letterSpacing: 3, color: '#FBBF24', fontWeight: 700 }}>
          SEVERE DISAGREEMENT LOCK
        </div>
        <div style={{ fontSize: 60, fontWeight: 700, letterSpacing: -2.5, lineHeight: 1.07, marginTop: 16 }}>
          Human judgment <Serif>stays in control.</Serif>
        </div>
        <div style={{ fontFamily: theme.body, fontSize: 22, lineHeight: 1.5, color: '#CBD5E1', marginTop: 22 }}>
          Combined confidence below 75% or Grade A ↔ C conflict locks behind Supervisor PIN (1234) with a recorded reason.
        </div>
      </div>
      <div style={{ position: 'absolute', right: 72, top: 155, width: 1120 }}>
        <TabletFrame video="clip-04d-override.mp4" playbackRate={0.95} accent="#FBBF24" />
      </div>
    </AbsoluteFill>
  );
};

/* 8. RECEIPT PRINT SCENE: Real live receipt print + 58mm unroll + 3-2-1 countdown */
export const ReceiptPrintScene = () => {
  const frame = useCurrentFrame();
  const unroll = interpolate(frame, [20, 120], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const count = frame >= 320 ? Math.max(1, 3 - Math.floor((frame - 320) / 55)) : null;

  return (
    <AbsoluteFill style={{ background: theme.frost, fontFamily: theme.sans, color: theme.ocean }}>
      <ChromeBar act="05 / RECEIPT + NEXT FISH" />
      <div style={{ position: 'absolute', top: 102, left: 72, fontSize: 50, fontWeight: 700, letterSpacing: -2 }}>
        58mm Bluetooth receipt. <Serif>Three seconds to next.</Serif>
      </div>
      <div style={{ position: 'absolute', left: 72, top: 196, width: 1080 }}>
        <TabletFrame video="clip-05-receipt.mp4" playbackRate={1} />
      </div>
      <div
        style={{
          position: 'absolute',
          right: 90,
          top: 210,
          width: 560,
          padding: 32,
          borderRadius: 24,
          background: 'white',
          border: '1px solid #CBD5E1',
          boxShadow: '0 22px 48px #0F172A18',
        }}
      >
        <div style={{ fontFamily: 'monospace', fontSize: 18, lineHeight: 1.7, color: '#0F172A', opacity: unroll }}>
          <div style={{ fontWeight: 700, fontSize: 22 }}>TUNAEYE · STATION 01</div>
          <div>--------------------------------</div>
          <div>SPECIMEN : TE_0001 · 85 kg</div>
          <div>RESULT   : GRADE A (96.3%)</div>
          <div>VALUE    : PHP 35,700.00</div>
          <div>STATUS   : BLUETOOTH AUTO-PRINT</div>
        </div>
        {count !== null && (
          <div style={{ marginTop: 28, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: theme.cobalt,
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 32,
                fontWeight: 700,
              }}
            >
              {count}
            </div>
            <div style={{ fontFamily: theme.body, fontSize: 20, fontWeight: 600 }}>Resetting for next fish…</div>
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

/* 9. DASHBOARD CASCADE SCENE */
export const DashboardCascadeScene = () => {
  return (
    <CenterStageScene
      act="06 / GRADER DASHBOARD"
      headline={
        <>
          Every session. <Serif>Every photo.</Serif>
        </>
      }
      video="clip-06-dashboard.mp4"
      playbackRate={1}
      pills={['My records ↔ All device records', 'Sashibo + Tail evidence', 'Instant receipt reprint']}
    />
  );
};

/* 10. ADMIN BENTO SCENE */
export const AdminBentoScene = () => {
  const frame = useCurrentFrame();
  const shots = [
    { label: 'Supervisor PIN (1234)' },
    { label: 'Station Overview & Volume' },
    { label: 'Records & CSV Export' },
    { label: 'Expert Graders · Owen Pilongo' },
    { label: 'Device Diagnostics' },
    { label: 'Pricing & PIN Settings' },
    { label: 'Audit Trail' },
  ];
  const idx = Math.min(shots.length - 1, Math.floor(frame / 62));

  return (
    <AbsoluteFill style={{ background: '#0F172A', fontFamily: theme.sans, color: '#F8FAFC' }}>
      <ChromeBar act="07 / ADMIN CONSOLE" dark />
      <div style={{ position: 'absolute', top: 104, left: 72, fontSize: 48, fontWeight: 700, letterSpacing: -2 }}>
        Full station control. <Serif>Zero blind spots.</Serif>
      </div>
      <div style={{ position: 'absolute', left: 72, top: 192, width: 1080 }}>
        <TabletFrame video="clip-07-admin.mp4" playbackRate={1} accent="#38BDF8" />
      </div>
      <div style={{ position: 'absolute', right: 72, top: 205, width: 580, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {shots.map((s, i) => (
          <div
            key={s.label}
            style={{
              padding: '14px 20px',
              borderRadius: 14,
              background: i === idx ? '#2563EB' : '#1E293B',
              color: i === idx ? 'white' : '#94A3B8',
              fontFamily: theme.body,
              fontSize: 20,
              fontWeight: 600,
            }}
          >
            {s.label}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

/* 11. CLOUD SYNC SCENE: Kiosk Local SQLite -> Wi-Fi -> Supabase Cloud Ledger (no mobile) */
export const CloudSyncScene = () => {
  const frame = useCurrentFrame();
  const packet = (frame % 75) / 75;
  const synced = frame > 170;
  return (
    <AbsoluteFill style={{ background: theme.frost, fontFamily: theme.sans, color: theme.ocean }}>
      <ChromeBar act="07 / WI-FI CLOUD SYNC" />
      <div style={{ position: 'absolute', left: 72, top: 185, width: 560 }}>
        <div
          style={{
            display: 'inline-block',
            fontFamily: theme.body,
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: 1.5,
            padding: '6px 14px',
            borderRadius: 999,
            background: synced ? '#DCFCE7' : '#DBEAFE',
            color: synced ? '#166534' : '#1D4ED8',
            marginBottom: 16,
          }}
        >
          {synced ? '✓ WI-FI ONLINE · ALL RECORDS SYNCED' : '● WI-FI CONNECTED · SYNCING TO CLOUD...'}
        </div>
        <div style={{ fontSize: 56, fontWeight: 700, letterSpacing: -2.5, lineHeight: 1.07 }}>
          Local-first.<br />Cloud <Serif>when ready.</Serif>
        </div>
        <div style={{ fontFamily: theme.body, fontSize: 21, color: '#475569', marginTop: 16, lineHeight: 1.5 }}>
          Every grade is saved safely to local SQLite offline and syncs to Supabase automatically when Wi-Fi returns.
        </div>

        {/* Clean animated Kiosk -> Wi-Fi -> Supabase architecture illustration */}
        <div style={{ marginTop: 26, padding: 24, borderRadius: 22, background: 'white', border: '1px solid #CBD5E1', boxShadow: '0 14px 32px #0F172A0D' }}>
          <svg width="510" height="150" viewBox="0 0 510 150">
            <rect x="4" y="25" width="160" height="100" rx="16" fill="#EFF6FF" stroke="#2563EB" strokeWidth="2" />
            <text x="84" y="64" textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight="700" fontSize="16" fill="#0F172A">TunaEye Kiosk</text>
            <text x="84" y="88" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="13" fill="#475569">Pi 5 · Local SQLite</text>
            <text x="84" y="108" textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight="600" fontSize="12" fill="#2563EB">
              {synced ? '0 pending' : '3 pending'}
            </text>

            <line x1="164" y1="75" x2="346" y2="75" stroke="#93C5FD" strokeWidth="3" strokeDasharray="6 6" />
            <circle cx={164 + packet * 182} cy="75" r="7" fill={synced ? '#12A56A' : '#2563EB'} />
            <path d="M241 48 Q255 36 269 48" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" opacity={0.4 + 0.6 * Math.abs(Math.sin(frame / 15))} />
            <path d="M246 56 Q255 48 264 56" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" opacity={0.6 + 0.4 * Math.abs(Math.sin(frame / 15))} />
            <circle cx="255" cy="63" r="3" fill="#2563EB" />
            <text x="255" y="102" textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight="600" fontSize="12" fill="#1D4ED8">
              {synced ? 'Synced' : 'Wi-Fi Sync'}
            </text>

            <rect x="346" y="25" width="160" height="100" rx="16" fill="#0F172A" stroke={synced ? '#12A56A' : '#38BDF8'} strokeWidth="2" />
            <text x="426" y="64" textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight="700" fontSize="16" fill="#FFFFFF">Supabase</text>
            <text x="426" y="88" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="13" fill="#94A3B8">Cloud Ledger</text>
            <text x="426" y="108" textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight="600" fontSize="12" fill={synced ? '#4ADE80' : '#38BDF8'}>
              {synced ? '✓ Up to date' : 'Receiving...'}
            </text>
          </svg>
        </div>
      </div>
      <div style={{ position: 'absolute', right: 72, top: 180, width: 1080 }}>
        <TabletFrame screenshot="01b-welcome-sync-modal.png" />
      </div>
    </AbsoluteFill>
  );
};
