import {staticFile} from 'remotion';

export const theme = {
  ocean: '#0F172A', deep: '#103B70', cobalt: '#2563EB', frost: '#F4F7FB',
  A: '#12A56A', B: '#EAB308', C: '#EF4444', override: '#1E293B', scan: '#38BDF8',
  sans: 'Open Runde, Inter, sans-serif', body: 'Inter, sans-serif', serif: 'Instrument Serif, Georgia, serif',
};
export const fontCss = `
@font-face{font-family:'Open Runde';src:url('${staticFile('fonts/OpenRunde-Regular.woff2')}') format('woff2');font-weight:400;font-display:block}
@font-face{font-family:'Open Runde';src:url('${staticFile('fonts/OpenRunde-Bold.woff2')}') format('woff2');font-weight:700;font-display:block}
@font-face{font-family:Inter;src:url('${staticFile('fonts/inter-400.ttf')}');font-weight:400;font-display:block}
@font-face{font-family:Inter;src:url('${staticFile('fonts/inter-600.ttf')}');font-weight:600;font-display:block}
@font-face{font-family:'Instrument Serif';src:url('${staticFile('fonts/instrument-serif-italic.ttf')}');font-style:italic;font-display:block}
*{box-sizing:border-box} body{margin:0}
`;
