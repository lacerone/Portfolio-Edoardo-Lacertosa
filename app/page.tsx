'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';

interface Photo {
  id: string;
  public_url: string;
  title: string;
  created_at: string;
}

// Ridimensiona e comprime le immagini al volo via Supabase Storage
function getOptimizedUrl(originalUrl: string, width: number = 1000) {
  if (!originalUrl) return '';
  if (originalUrl.includes('/storage/v1/object/public/')) {
    return originalUrl.replace(
      '/storage/v1/object/public/',
      '/storage/v1/render/image/public/'
    ) + `?width=${width}&quality=80&resize=contain`;
  }
  return originalUrl;
}

export default function Home() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [shuffledIndices, setShuffledIndices] = useState<number[]>([]);
  const [shufflePointer, setShufflePointer] = useState(0);

  const [stage, setStage] = useState<'init' | 'hold' | 'active'>('init');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const textInit = "EDOARDO LACERTOSA";
  const textHold = "EMAIL   INSTAGRAM   PORTFOLIO";

  const [typedInit, setTypedInit] = useState("");
  const [typedHold, setTypedHold] = useState("");

  // Controllo Timestamp: resetta l'intro solo se sono trascorsi almeno 5 minuti (300.000 ms)
  useEffect(() => {
    setIsMounted(true);

    if (typeof window !== 'undefined') {
      const lastVisited = localStorage.getItem('home_last_visited');
      const now = Date.now();
      const FIVE_MINUTES_MS = 5 * 60 * 1000; // 5 minuti

      if (lastVisited && now - parseInt(lastVisited, 10) < FIVE_MINUTES_MS) {
        // Meno di 5 minuti fa -> Salta l'intro
        setStage('active');
        setTypedInit(textInit);
        setTypedHold(textHold);
      } else {
        // Più di 5 minuti fa o prima visita -> Esegui l'animazione
        setStage('init');
      }

      // Aggiorna il timestamp dell'ultima visita
      localStorage.setItem('home_last_visited', now.toString());
    }
  }, []);

  // 1. Fetch Foto e Shuffle
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

        // Pre-caricamento di TUTTE le miniature nella RAM
        loadedPhotos.forEach((photo) => {
          const img = new Image();
          img.src = getOptimizedUrl(photo.public_url, 1000);
        });

        // Fisher-Yates shuffle
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

  // 4. FASE 3: Reel Foto continuo
  useEffect(() => {
    if (!isMounted || stage !== 'active' || photos.length === 0 || shuffledIndices.length === 0) return;

    const intervalId = setInterval(() => {
      setShufflePointer((prevPointer) => {
        const nextPointer = prevPointer + 1;
        if (nextPointer >= shuffledIndices.length) {
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
    }, 250);

    return () => clearInterval(intervalId);
  }, [stage, photos.length, shuffledIndices.length, isMounted]);

  // Foto corrente ricavata all'istante
  const currentPhotoIndex = shuffledIndices.length > 0 ? shuffledIndices[shufflePointer] : 0;
  const currentPhoto = photos[currentPhotoIndex];
  const displayedUrl = currentPhoto ? getOptimizedUrl(currentPhoto.public_url, 1000) : null;

  return (
    <main className="h-[100dvh] w-screen bg-white text-black overflow-hidden relative select-none">
      
      {/* Font e Layer CSS Dinamici per Mobile */}
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

        html, body {
          scrollbar-width: none;
          margin: 0; padding: 0; width: 100vw; height: 100dvh;
          overflow: hidden; background: #ffffff;
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
          .lebon-container { font-size: 3vw; word-spacing: 1em; }
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

      {/* LAYER 1 (BACK LAYER) - Ancorato con 100dvh */}
      <div className="fixed inset-0 h-[100dvh] w-screen z-20 flex items-center justify-center text-center pointer-events-none lebon-container layer-back">
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

      {/* LAYER 2 (FRONT LAYER) - Ancorato con 100dvh */}
      <div className="fixed inset-0 h-[100dvh] w-screen z-30 flex items-center justify-center text-center pointer-events-none lebon-container layer-front">
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
                  href="https://www.instagram.com/edoardo_lacertosa/" 
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

      {/* STAGE GALLERIA FOTO - Ancoraggio Dynamic Viewport */}
      <div 
        className="absolute inset-[0.5rem] flex items-center justify-center pointer-events-none z-10 bg-white"
        style={{ height: 'calc(100dvh - 1rem)', width: 'calc(100vw - 1rem)' }}
      >
        <div className="relative w-full h-full flex items-center justify-center">
          {stage === 'active' && displayedUrl && (
            <img
              src={displayedUrl}
              alt="Gallery Reel"
              className="h-full w-full object-contain block select-none transform scale-[0.78] sm:scale-[0.78]"
            />
          )}
        </div>
      </div>

    </main>
  );
}