import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { theme } from '../theme';

export const ProblemScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const title = spring({ frame, fps, config: { damping: 18, stiffness: 200 } });
  const cards = [
    { num: '01', title: 'Expert scarcity', desc: 'True grading skill is rare—one eye cannot cover every station.' },
    { num: '02', title: 'Uncontrolled light', desc: 'Glare and shadow distort Sashibo color at the dock.' },
    { num: '03', title: 'Zero audit trail', desc: 'Manual tallies leave no photo proof behind the grade.' },
  ];

  return (
    <AbsoluteFill
      style={{
        background: '#090D16',
        color: '#F8FAFC',
        fontFamily: theme.sans,
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 90px',
      }}
    >
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 35%, #7F1D1D33 0%, transparent 65%)' }} />
      <div
        style={{
          fontFamily: theme.body,
          fontSize: 16,
          letterSpacing: 3.5,
          color: '#FCA5A5',
          fontWeight: 700,
          marginBottom: 18,
          opacity: title,
        }}
      >
        THE DOCKSIDE CHALLENGE
      </div>
      <div
        style={{
          fontSize: 76,
          fontWeight: 700,
          letterSpacing: -3,
          textAlign: 'center',
          lineHeight: 1.06,
          opacity: title,
          transform: `translateY(${(1 - title) * 24}px)`,
        }}
      >
        Grading depends on{' '}
        <span style={{ fontFamily: theme.serif, fontStyle: 'italic', fontWeight: 400, color: '#FCA5A5' }}>
          rare expert eyes.
        </span>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 26,
          width: '100%',
          maxWidth: 1480,
          marginTop: 52,
        }}
      >
        {cards.map((c, i) => {
          const s = spring({ frame: frame - 18 - i * 12, fps, config: { damping: 18, stiffness: 180 } });
          return (
            <div
              key={c.num}
              style={{
                background: '#111827',
                border: '1px solid #EF444444',
                borderRadius: 22,
                padding: '28px 30px',
                opacity: s,
                transform: `translateY(${(1 - s) * 26}px)`,
              }}
            >
              <div style={{ fontFamily: theme.body, fontSize: 15, fontWeight: 700, color: '#F87171', letterSpacing: 2 }}>
                PROBLEM {c.num}
              </div>
              <div style={{ fontSize: 30, fontWeight: 700, marginTop: 10 }}>{c.title}</div>
              <div style={{ fontFamily: theme.body, fontSize: 20, color: '#94A3B8', marginTop: 10, lineHeight: 1.45 }}>
                {c.desc}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const HeroLockup = ({ outro = false }: { outro?: boolean }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const logo = spring({ frame, fps, config: { damping: 16, stiffness: 220, mass: 0.8 } });
  const w1 = spring({ frame: frame - 6, fps, config: { damping: 18, stiffness: 210 } });
  const w2 = spring({ frame: frame - 12, fps, config: { damping: 18, stiffness: 210 } });
  const w3 = spring({ frame: frame - 18, fps, config: { damping: 18, stiffness: 210 } });
  const sub = spring({ frame: frame - 24, fps, config: { damping: 22, stiffness: 160 } });

  const zoomOut = outro
    ? 1
    : interpolate(frame, [durationInFrames - 20, durationInFrames], [1, 1.08], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });

  return (
    <AbsoluteFill
      style={{
        background: theme.ocean,
        color: theme.frost,
        fontFamily: theme.sans,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        transform: `scale(${zoomOut})`,
      }}
    >
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at 50% 44%, ${theme.deep} 0%, #091224 58%, ${theme.ocean} 100%)`,
        }}
      />

      {[0, 1, 2].map((i) => {
        const cycle = ((frame + i * 45) % 135) / 135;
        const size = 260 + cycle * 1350;
        const opacity = interpolate(cycle, [0, 0.15, 1], [0, 0.28, 0]);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: size,
              height: size,
              borderRadius: '50%',
              border: '1.5px solid #38BDF8',
              opacity,
              transform: 'translateY(-30px)',
            }}
          />
        );
      })}

      <div
        style={{
          position: 'absolute',
          top: 56,
          left: 80,
          right: 80,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          opacity: sub,
          transform: `translateY(${(1 - sub) * -12}px)`,
        }}
      >
        <div style={{ fontSize: 18, letterSpacing: 4, color: '#9CB9DE', fontWeight: 600 }}>
          {outro ? 'TUNAEYE / V2.7.0' : 'THE SOLUTION · TUNAEYE V2.7.0'}
        </div>
        <div
          style={{
            fontFamily: theme.body,
            fontSize: 14,
            letterSpacing: 2,
            color: '#7DD3FC',
            padding: '7px 16px',
            borderRadius: 999,
            border: '1px solid #38BDF844',
            background: '#0F2544AA',
          }}
        >
          ● RASPBERRY PI 5 · OFFLINE-FIRST
        </div>
      </div>

      <Img
        src={staticFile('assets/applogo.svg')}
        style={{
          width: 148,
          height: 148,
          objectFit: 'contain',
          marginBottom: 28,
          borderRadius: 34,
          transform: `translateY(${(1 - logo) * 28}px) scale(${0.75 + logo * 0.25})`,
          opacity: logo,
          boxShadow: '0 24px 60px #00000055',
        }}
      />

      <div
        style={{
          fontSize: 96,
          letterSpacing: -4,
          lineHeight: 1.04,
          fontWeight: 700,
          display: 'flex',
          gap: 22,
          alignItems: 'baseline',
        }}
      >
        <span style={{ opacity: w1, transform: `translateY(${(1 - w1) * 26}px)` }}>Sea</span>
        <span
          style={{
            fontFamily: theme.serif,
            fontStyle: 'italic',
            fontWeight: 400,
            color: '#78CCFF',
            opacity: w2,
            transform: `translateY(${(1 - w2) * 26}px)`,
          }}
        >
          Beyond
        </span>
        <span style={{ opacity: w3, transform: `translateY(${(1 - w3) * 26}px)` }}>the Cut.</span>
      </div>

      <div
        style={{
          fontFamily: theme.body,
          fontSize: 30,
          lineHeight: 1.5,
          textAlign: 'center',
          maxWidth: 960,
          marginTop: 26,
          color: '#D7E7FC',
          opacity: sub,
          transform: `translateY(${(1 - sub) * 18}px)`,
        }}
      >
        {outro ? (
          <>Built on expert knowledge. Enhanced by computer vision.</>
        ) : (
          <>We don’t replace the expert eye. We extend its reach.</>
        )}
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 64,
          opacity: sub,
          fontSize: 16,
          letterSpacing: 3.5,
          color: '#8BA7CB',
          fontFamily: theme.body,
        }}
      >
        {outro ? 'HUMAN JUDGMENT. EXTENDED.' : 'CONTROLLED CHAMBER · SASHIBO + TAIL-CUT · 58MM RECEIPT'}
      </div>
    </AbsoluteFill>
  );
};
