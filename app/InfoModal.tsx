'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

interface InfoModalProps {
  onClose: () => void;
}

// CONFIGURAZIONE DEFINITIVA FOTO 2 - PC (NON TOCCATA)
const circles2ConfigPC = [
  { id: 'c3', cx: 32, cy: 87, r: 24, color: 'stroke-cyan-400' },
  { id: 'c4', cx: 212, cy: 55, r: 28, color: 'stroke-emerald-400' },
  { id: 'c5', cx: 228, cy: 10, r: 15, color: 'stroke-fuchsia-500' },
  { id: 'c6', cx: 148, cy: 33, r: 29, color: 'stroke-yellow-400' },
  { id: 'c7', cx: 222, cy: 159, r: 35, color: 'stroke-violet-500' },
];

// CONFIGURAZIONE FOTO 2 - MOBILE (RICALIBRATA PER SMARTPHONE)
const circles2ConfigMobile = [
  { id: 'c3', cx: 38, cy: 87, r: 22, color: 'stroke-cyan-400' },
  { id: 'c4', cx: 206, cy: 58, r: 26, color: 'stroke-emerald-400' },
  { id: 'c5', cx: 220, cy: 18, r: 14, color: 'stroke-fuchsia-500' },
  { id: 'c6', cx: 148, cy: 35, r: 27, color: 'stroke-yellow-400' },
  { id: 'c7', cx: 216, cy: 155, r: 32, color: 'stroke-violet-500' },
];

// CONFIGURAZIONE DEFINITIVA MIRINO FOTO 3
const mirinoConfig = { cx: 30, cy: 157, r: 15 };

function generatePencilCircle(cx: number, cy: number, rBase = 48) {
  const numPoints = 12;
  const startAngle = -Math.PI / 2 + 0.1;
  const totalAngle = Math.PI * 2 + 0.5;
  const angleStep = totalAngle / numPoints;

  const amp1 = 2.0;
  const amp2 = 1.5;

  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= numPoints; i++) {
    const angle = startAngle + i * angleStep;
    const r = rBase + amp1 * Math.sin(angle * 2) + amp2 * Math.cos(angle * 3);
    pts.push({
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    });
  }

  let path = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    const mx = (p0.x + p1.x) / 2;
    const my = (p0.y + p1.y) / 2;
    path += ` Q ${p0.x.toFixed(1)} ${p0.y.toFixed(1)}, ${mx.toFixed(1)} ${my.toFixed(1)}`;
  }
  return path;
}

function generatePencilLine(x1: number, y1: number, x2: number, y2: number) {
  const numPoints = 6;
  const pts: { x: number; y: number }[] = [];

  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const nx = -dy / (len || 1);
  const ny = dx / (len || 1);

  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const px = x1 + t * dx;
    const py = y1 + t * dy;

    const wobble = i === 0 || i === numPoints ? 0 : Math.sin(i * 2.8) * 0.8 + Math.cos(i * 4.2) * 0.5;

    pts.push({
      x: px + nx * wobble,
      y: py + ny * wobble,
    });
  }

  let path = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    const mx = (p0.x + p1.x) / 2;
    const my = (p0.y + p1.y) / 2;
    path += ` Q ${p0.x.toFixed(1)} ${p0.y.toFixed(1)}, ${mx.toFixed(1)} ${my.toFixed(1)}`;
  }
  return path;
}

export default function InfoModal({ onClose }: InfoModalProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // COORDINATE FRECCIA SEZIONE 1 (SOLO MOBILE CAMBIA, PC INVARIATO)
  const arrowConfig = isMobile
    ? { start: { x: 210, y: 320 }, control: { x: 245, y: 385 }, end: { x: 170, y: 430 } }
    : { start: { x: 205, y: 115 }, control: { x: 254, y: 38 }, end: { x: 348, y: 19 } };

  const { start, control, end } = arrowConfig;
  const circle1Pos = { cx: 162, cy: 160 };

  const [circle1Path, setCircle1Path] = useState<string | null>(null);
  const [circles2Data, setCircles2Data] = useState<{ id: string; path: string; color: string }[]>([]);
  const [mirinoCirclePath, setMirinoCirclePath] = useState<string | null>(null);
  const [mirinoArms, setMirinoArms] = useState<string[]>([]);

  useEffect(() => {
    setCircle1Path(generatePencilCircle(circle1Pos.cx, circle1Pos.cy, 52));

    const currentCircles2 = isMobile ? circles2ConfigMobile : circles2ConfigPC;
    setCircles2Data(
      currentCircles2.map((c) => ({
        id: c.id,
        path: generatePencilCircle(c.cx, c.cy, c.r),
        color: c.color,
      }))
    );

    setMirinoCirclePath(generatePencilCircle(mirinoConfig.cx, mirinoConfig.cy, mirinoConfig.r));

    const { cx, cy, r } = mirinoConfig;
    const gap = 4;
    const len = 11;

    setMirinoArms([
      generatePencilLine(cx, cy - r - gap, cx, cy - r - gap - len),
      generatePencilLine(cx + r + gap, cy, cx + r + gap + len, cy),
      generatePencilLine(cx, cy + r + gap, cx, cy + r + gap + len),
      generatePencilLine(cx - r - gap, cy, cx - r - gap - len, cy),
    ]);
  }, [isMobile]);

  // CALCOLO DIREZIONE PUNTA DELLA FRECCIA
  const dx = end.x - control.x;
  const dy = end.y - control.y;
  const angle = Math.atan2(dy, dx);
  const arrowLength = 16;
  const arrowAngle = Math.PI / 7;

  const headLeft = {
    x: Math.round(end.x - arrowLength * Math.cos(angle - arrowAngle)),
    y: Math.round(end.y - arrowLength * Math.sin(angle - arrowAngle)),
  };
  const headRight = {
    x: Math.round(end.x - arrowLength * Math.cos(angle + arrowAngle)),
    y: Math.round(end.y - arrowLength * Math.sin(angle + arrowAngle)),
  };

  const mainPath = `M ${start.x} ${start.y} Q ${control.x} ${control.y}, ${end.x} ${end.y}`;
  const headPath = `M ${end.x} ${end.y} L ${headLeft.x} ${headLeft.y} M ${end.x} ${end.y} L ${headRight.x} ${headRight.y}`;

  const drawVariant = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: (delay: number) => ({
      pathLength: 1,
      opacity: 1,
      transition: {
        pathLength: { delay, duration: 0.7, ease: 'easeOut' },
        opacity: { delay, duration: 0.1 },
      },
    }),
  };

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-[100] bg-white text-neutral-900 overflow-y-auto overflow-x-hidden select-none"
    >
      <style>{`
        @font-face {
          font-family: 'Boska';
          src: url('/fonts/Boska-Black.woff2') format('woff2');
          font-weight: 900;
          font-style: normal;
          font-display: swap;
        }
        @font-face {
          font-family: 'GeneralSans';
          src: url('/fonts/GeneralSans-Regular.woff2') format('woff2');
          font-weight: 400;
          font-style: normal;
          font-display: swap;
        }
      `}</style>

      {/* FRECCIA INDIETRO */}
      <button
        onClick={onClose}
        title="Torna indietro"
        className="fixed top-4 left-4 sm:top-6 sm:left-6 z-50 p-2.5 sm:p-2 flex items-center justify-center text-neutral-800 hover:text-black transition-all duration-200 cursor-pointer hover:scale-110 active:scale-95 bg-neutral-100/90 backdrop-blur-sm rounded-full shadow-md"
      >
        <ArrowLeft className="w-6 h-6 sm:w-7 sm:h-7 stroke-[1.5]" />
      </button>

      {/* CONTAINER PRINCIPALE */}
      <div className="max-w-4xl mx-auto px-5 sm:px-6 py-14 sm:py-24 flex flex-col gap-16 sm:gap-32 pb-20 sm:pb-24">
        <svg className="hidden">
          <defs>
            <filter id="real-pencil-filter" x="-30%" y="-30%" width="160%" height="160%">
              <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="4" result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.2" xChannelSelector="R" yChannelSelector="G" />
            </filter>
          </defs>
        </svg>

        {/* 1. CHI SONO */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col md:flex-row items-center md:items-start justify-between gap-8 md:gap-16"
        >
          <div className="relative w-full max-w-[280px] xs:max-w-[300px] sm:w-80 sm:max-w-none aspect-[300/400] sm:h-[420px] shrink-0 mx-auto md:mx-0">
            <img
              src="/me.jpg"
              alt="Edoardo Lacertosa"
              className="w-full h-full object-cover rounded-3xl grayscale shadow-sm border border-neutral-100"
            />

            <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible fill-none" viewBox="0 0 300 400">
              <motion.path
                d={mainPath}
                className="stroke-black"
                strokeWidth="2.4"
                strokeLinecap="round"
                filter="url(#real-pencil-filter)"
                variants={drawVariant}
                initial="hidden"
                animate="visible"
                custom={0.95}
              />
              <motion.path
                d={headPath}
                className="stroke-black"
                strokeWidth="2.4"
                strokeLinecap="round"
                filter="url(#real-pencil-filter)"
                variants={drawVariant}
                initial="hidden"
                animate="visible"
                custom={1.25}
              />

              {circle1Path && (
                <motion.path
                  d={circle1Path}
                  className="stroke-red-600"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="180 3 90 2"
                  filter="url(#real-pencil-filter)"
                  variants={drawVariant}
                  initial="hidden"
                  animate="visible"
                  custom={1.5}
                />
              )}
            </svg>
          </div>

          <div className="flex-1 space-y-3 text-left md:-mt-2 w-full">
            <h2 style={{ fontFamily: "'Boska', serif" }} className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-black">
              CHI SONO
            </h2>
            <p style={{ fontFamily: "'GeneralSans', sans-serif" }} className="text-neutral-700 leading-relaxed text-base sm:text-lg font-normal">
              Studente di Ingegneria Informatica con la testa costantemente nel visual. Fotografo e videomaker con base a Torino, unisco il rigore della composizione con la spontaneità dell'imperfezione analogica.
            </p>
          </div>
        </motion.div>

        {/* 2. COME LAVORO */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col-reverse md:flex-row items-center justify-between gap-8 md:gap-16"
        >
          <div className="flex-1 space-y-3 text-left w-full">
            <h2 style={{ fontFamily: "'Boska', serif" }} className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-black">
              COME LAVORO
            </h2>
            <p style={{ fontFamily: "'GeneralSans', sans-serif" }} className="text-neutral-700 leading-relaxed text-base sm:text-lg font-normal">
              Niente pose costruite o set rigidi. Lavoro sul campo integrandomi nel contesto con discrezione, trovando la luce giusta ed esaltando la materia originale della scena tra reportage e ricerca estetica.
            </p>
          </div>

          <div className="relative w-full max-w-[340px] sm:w-[420px] sm:max-w-none aspect-[300/220] sm:h-[280px] shrink-0 rounded-3xl border border-neutral-100 shadow-sm overflow-hidden mx-auto md:mx-0">
            <img
              src="/work.jpg"
              alt="Come lavoro"
              className="w-full h-full object-cover rounded-3xl grayscale"
            />

            <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible fill-none" viewBox="0 0 300 220">
              {circles2Data.map((item, idx) => (
                <motion.path
                  key={item.id}
                  d={item.path}
                  className={item.color}
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="180 3 90 2"
                  filter="url(#real-pencil-filter)"
                  variants={drawVariant}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  custom={0.2 + idx * 0.22}
                />
              ))}
            </svg>
          </div>
        </motion.div>

        {/* 3. COSA CERCO */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-16"
        >
          <div className="relative w-full max-w-[340px] sm:w-[420px] sm:max-w-none aspect-[300/220] sm:h-[280px] shrink-0 rounded-3xl border border-neutral-100 shadow-sm overflow-hidden mx-auto md:mx-0">
            <img
              src="/cercare.jpg"
              alt="Cosa cerco"
              className="w-full h-full object-cover rounded-3xl grayscale"
            />

            <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible fill-none" viewBox="0 0 300 220">
              {/* Cerchio del mirino */}
              {mirinoCirclePath && (
                <motion.path
                  d={mirinoCirclePath}
                  className="stroke-red-600"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="180 3 90 2"
                  filter="url(#real-pencil-filter)"
                  variants={drawVariant}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  custom={0.2}
                />
              )}

              {/* Punto centrale animato */}
              <motion.circle
                cx={mirinoConfig.cx}
                cy={mirinoConfig.cy}
                r="3"
                className="fill-red-600 stroke-red-600"
                filter="url(#real-pencil-filter)"
                initial={{ scale: 0, opacity: 0 }}
                whileInView={{ scale: [0, 1.4, 1], opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5, duration: 0.3, ease: 'easeOut' }}
              />

              {/* 4 Stanghette esterne */}
              {mirinoArms.map((armD, idx) => (
                <motion.path
                  key={idx}
                  d={armD}
                  className="stroke-red-600"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="180 3 90 2"
                  filter="url(#real-pencil-filter)"
                  variants={drawVariant}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  custom={0.7 + idx * 0.15}
                />
              ))}
            </svg>
          </div>

          <div className="flex-1 space-y-3 text-left w-full">
            <h2 style={{ fontFamily: "'Boska', serif" }} className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-black">
              COSA CERCO
            </h2>
            <p style={{ fontFamily: "'GeneralSans', sans-serif" }} className="text-neutral-700 leading-relaxed text-base sm:text-lg font-normal">
              Progetti editoriali, coperture eventi, brand indipendenti e collaborazioni con artisti o realtà creative che vogliono raccontare storie autentiche senza filtri convenzionali.
            </p>
            <div className="pt-2 sm:pt-4">
              <a
                href="mailto:contact@example.com"
                style={{ fontFamily: "'GeneralSans', sans-serif" }}
                className="inline-block text-sm font-semibold uppercase tracking-wider text-black underline underline-offset-4 decoration-red-500 hover:text-red-600 transition-colors"
              >
                → Scrivimi per un progetto
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}