'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';

interface Photo {
  id: string;
  public_url: string;
  title: string;
  created_at: string;
}

export default function Home() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [shuffledIndices, setShuffledIndices] = useState<number[]>([]);
  const [shufflePointer, setShufflePointer] = useState(0);

  const [stage, setStage] = useState<'init' | 'hold' | 'active'>('init');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const [displayedUrl, setDisplayedUrl] = useState<string | null>(null);

  const textInit = "EDOARDO LACERTOSA";
  const textHold = "EMAIL   INSTAGRAM   PORT";

  const [typedInit, setTypedInit] = useState("");
  const [typedHold, setTypedHold] = useState("");

  // Fix Hydration: Abilita il rendering dinamico solo dopo il mount del client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 1. Fetch Foto e inizializzazione shuffle casuale stile Frank Lebon
  useEffect(() => {
    const fetchPhotos = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('photos')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        const loadedPhotos = data as Photo[];
        setPhotos(loadedPhotos);

        // Crea array di indici casuali (Fisher-Yates shuffle)
        const indices = Array.from({ length: loadedPhotos.length }, (_, i) => i);
        for (let i = indices.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [indices[i], indices[j]] = [indices[j], indices[i]];
        }
        setShuffledIndices(indices);
        setShufflePointer(0);
      }
    };

    fetchPhotos();
  }, []);

  // 2. FASE 1: Digitazione Nome
  useEffect(() => {
    if (!isMounted) return;
    if (stage === 'init') {
      if (typedInit.length < textInit.length) {
        const timeout = setTimeout(() => {
          setTypedInit(textInit.slice(0, typedInit.length + 1));
        }, 150);
        return () => clearTimeout(timeout);
      } else {
        const transition = setTimeout(() => {
          setStage('hold');
        }, 600);
        return () => clearTimeout(transition);
      }
    }
  }, [stage, typedInit, isMounted]);

  // 3. FASE 2: Digitazione Link
  useEffect(() => {
    if (!isMounted) return;
    if (stage === 'hold') {
      if (typedHold.length < textHold.length) {
        const timeout = setTimeout(() => {
          setTypedHold(textHold.slice(0, typedHold.length + 1));
        }, 150);
        return () => clearTimeout(timeout);
      } else {
        const startReel = setTimeout(() => {
          setStage('active');
        }, 400);
        return () => clearTimeout(startReel);
      }
    }
  }, [stage, typedHold, isMounted]);

  // 4. FASE 3: Reel Foto Casuale continuo (stile Frank Lebon)
  useEffect(() => {
    if (!isMounted || stage !== 'active' || photos.length === 0 || shuffledIndices.length === 0) return;

    const intervalId = setInterval(() => {
      setShufflePointer((prevPointer) => {
        const nextPointer = prevPointer + 1;
        if (nextPointer >= shuffledIndices.length) {
          // Rimescola quando finisce il giro completo (loop infinito casuale)
          const indices = Array.from({ length: photos.length }, (_, i) => i);
          for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]];
          }
          setShuffledIndices(indices);
          return 0;
        }
        return nextPointer;
      });
    }, 300);

    return () => clearInterval(intervalId);
  }, [stage, photos.length, shuffledIndices.length, isMounted]);

  // Indice corrente basato sullo shuffle casuale
  const currentIndex = shuffledIndices.length > 0 ? shuffledIndices[shufflePointer] : 0;

  // Pre-caricamento dell'immagine
  useEffect(() => {
    if (photos.length === 0) return;

    const nextPhoto = photos[currentIndex];
    if (!nextPhoto) return;

    const img = new Image();
    img.src = nextPhoto.public_url;
    img.onload = () => {
      setDisplayedUrl(nextPhoto.public_url);
    };
  }, [currentIndex, photos]);

  return (
    <main className="h-screen w-screen bg-white text-black overflow-hidden relative select-none">
      
      {/* Font e Layer CSS */}
      <style>{`
        @font-face {
          font-family: "FRANK LEBON Front";
          src: url("/fonts/FRANKLEBON-Front.woff2") format("woff2");
          font-weight: 400;
          font-style: normal;
          font-display: block;
        }
        @font-face {
          font-family: "FRANK LEBON Back";
          src: url("/fonts/FRANKLEBON-Back.woff2") format("woff2");
          font-weight: 400;
          font-style: normal;
          font-display: block;
        }

        .lebon-container {
          font-size: 0.925vw;
          letter-spacing: 0.05em;
          word-spacing: 1.5em;
          text-transform: uppercase;
          line-height: 1;
        }

        @media screen and (max-width: 1024px) {
          .lebon-container { font-size: 2.25vw; }
        }
        @media screen and (max-width: 568px) {
          .lebon-container { font-size: 3vw; }
        }

        /* BACK LAYER */
        .layer-back {
          font-family: "FRANK LEBON Back", sans-serif;
          color: #ffffff;
        }
        .layer-back a.swap {
          color: #000000 !important;
        }

        /* FRONT LAYER */
        .layer-front {
          font-family: "FRANK LEBON Front", sans-serif;
          color: #000000;
        }
        .layer-front a {
          color: #000000;
          text-decoration: none;
        }
        .layer-front a.swap {
          color: #ffffff !important;
        }
      `}</style>

      {/* LAYER 1 (BACK LAYER) */}
      <div className="fixed inset-0 z-20 flex items-center justify-center text-center pointer-events-none lebon-container layer-back">
        <div className="w-full px-8">
          {isMounted && stage === 'init' && (
            <span>{typedInit || " "}</span>
          )}

          {isMounted && (stage === 'hold' || stage === 'active') && (
            <span>
              <a className={hoveredIndex === 0 ? 'swap' : ''}>
                {typedHold.slice(0, 5)}
              </a>
              {typedHold.length > 5 && (
                <a className={`ml-[1.5em] ${hoveredIndex === 1 ? 'swap' : ''}`}>
                  {typedHold.slice(8, 17)}
                </a>
              )}
              {typedHold.length > 17 && (
                <a className={`ml-[1.5em] ${hoveredIndex === 2 ? 'swap' : ''}`}>
                  {typedHold.slice(20)}
                </a>
              )}
            </span>
          )}
        </div>
      </div>

      {/* LAYER 2 (FRONT LAYER) */}
      <div className="fixed inset-0 z-30 flex items-center justify-center text-center pointer-events-none lebon-container layer-front">
        <div className="w-full px-8">
          {isMounted && stage === 'init' && (
            <span>{typedInit || " "}</span>
          )}

          {isMounted && (stage === 'hold' || stage === 'active') && (
            <span className="pointer-events-auto">
              <a 
                href="mailto:edoardo.lacertosa@gmail.com"
                className={hoveredIndex === 0 ? 'swap' : ''}
                onMouseEnter={() => setHoveredIndex(0)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {typedHold.slice(0, 5)}
              </a>
              {typedHold.length > 5 && (
                <a 
                  href="https://instagram.com" 
                  target="_blank" 
                  rel="noreferrer" 
                  className={`ml-[1.5em] ${hoveredIndex === 1 ? 'swap' : ''}`}
                  onMouseEnter={() => setHoveredIndex(1)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  {typedHold.slice(8, 17)}
                </a>
              )}
              {typedHold.length > 17 && (
                <a 
                  href="/port" 
                  className={`ml-[1.5em] ${hoveredIndex === 2 ? 'swap' : ''}`}
                  onMouseEnter={() => setHoveredIndex(2)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  {typedHold.slice(20)}
                </a>
              )}
            </span>
          )}
        </div>
      </div>

      {/* STAGE GALLERIA FOTO (Nessun click) */}
      <div 
        className="absolute inset-[0.5rem] flex items-center justify-center pointer-events-none z-10 bg-white"
        style={{ height: 'calc(100vh - 1rem)', width: 'calc(100vw - 1rem)' }}
      >
        <div className="relative w-full h-full flex items-center justify-center">
          {stage === 'active' && displayedUrl && (
            <img
              key={displayedUrl}
              src={displayedUrl}
              alt="Gallery Image"
              className="h-full w-full object-contain block select-none transform scale-[0.78]"
            />
          )}
        </div>
      </div>

    </main>
  );
}