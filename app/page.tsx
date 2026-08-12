'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sliders, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface ExifData {
  camera?: string;
  lens?: string;
  iso?: string;
  aperture?: string;
  shutter?: string;
  focal_length?: string;
}

interface Photo {
  id: string;
  public_url: string;
  title: string;
  collection?: string;
  exif_data?: ExifData;
  created_at: string;
}

// Ridotto da 48 a 20 per velocizzare la prima risposta della rete
const BATCH_SIZE = 20; 
const INFINITE_LOOP = true;
const GAP = 8;
const TARGET_ROW_HEIGHT = 260;

function getOptimizedUrl(originalUrl: string, width: number = 450) {
  if (!originalUrl) return '';
  if (originalUrl.includes('/storage/v1/object/public/')) {
    return (
      originalUrl.replace(
        '/storage/v1/object/public/',
        `/storage/v1/render/image/public/`
      ) + `?width=${width}&quality=75&resize=contain`
    );
  }
  return originalUrl;
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export default function Portfolio() {
  const [allPhotos, setAllPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [loadedRatios, setLoadedRatios] = useState<Record<string, number>>({});
  const [readyPhotos, setReadyPhotos] = useState<Set<string>>(new Set());

  const containerRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // 1. Misura la larghezza esatta del container
  useEffect(() => {
    if (!containerRef.current) return;
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [loading]);

  // 2. Fetch foto da Supabase
  useEffect(() => {
    const fetchPhotos = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('photos')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setAllPhotos(shuffle(data as Photo[]));
      }
      setLoading(false);
    };

    fetchPhotos();
  }, []);

  const tiles = useMemo(() => {
    if (allPhotos.length === 0) return [];
    const total = INFINITE_LOOP
      ? visibleCount
      : Math.min(visibleCount, allPhotos.length);

    const out: { photo: Photo; key: string }[] = [];
    for (let i = 0; i < total; i++) {
      const lap = Math.floor(i / allPhotos.length);
      const photo = allPhotos[i % allPhotos.length];
      out.push({ photo, key: `${photo.id}-${lap}` });
    }
    return out;
  }, [allPhotos, visibleCount]);

  // 3. TATTICA HOME: Precaricamento in memoria via `new Image()`
  useEffect(() => {
    if (tiles.length === 0) return;

    tiles.forEach(({ photo }) => {
      if (readyPhotos.has(photo.id)) return;

      const thumbUrl = getOptimizedUrl(photo.public_url, 450);
      const img = new Image();
      img.src = thumbUrl;

      img.onload = () => {
        if (img.naturalWidth && img.naturalHeight) {
          const ratio = img.naturalWidth / img.naturalHeight;
          setLoadedRatios((prev) => ({ ...prev, [photo.id]: ratio }));
        }
        setReadyPhotos((prev) => new Set(prev).add(photo.id));
      };
    });
  }, [tiles, readyPhotos]);

  const canGrow =
    allPhotos.length > 0 && (INFINITE_LOOP || visibleCount < allPhotos.length);

  // 4. Infinite Scroll Observer
  useEffect(() => {
    if (!sentinelRef.current || !canGrow) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((c) => c + BATCH_SIZE);
        }
      },
      { rootMargin: '1200px' }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [canGrow]);

  // 5. Layout Justified
  const layoutRows = useMemo(() => {
    if (!containerWidth || tiles.length === 0) return [];

    const rows: {
      items: { photo: Photo; key: string; width: number; ratio: number }[];
      height: number;
    }[] = [];

    let currentRow: { photo: Photo; key: string; ratio: number }[] = [];
    let currentAspectSum = 0;

    tiles.forEach((tile, index) => {
      const ratio = loadedRatios[tile.photo.id] || 1.333;
      currentRow.push({ ...tile, ratio });
      currentAspectSum += ratio;

      const gapsTotalWidth = (currentRow.length - 1) * GAP;
      const availableWidth = containerWidth - gapsTotalWidth;
      const calculatedHeight = availableWidth / currentAspectSum;

      if (calculatedHeight <= TARGET_ROW_HEIGHT || index === tiles.length - 1) {
        const rowHeight = Math.max(calculatedHeight, 140);

        const items = currentRow.map((item) => ({
          photo: item.photo,
          key: item.key,
          ratio: item.ratio,
          width: item.ratio * rowHeight,
        }));

        rows.push({ items, height: rowHeight });
        currentRow = [];
        currentAspectSum = 0;
      }
    });

    return rows;
  }, [tiles, containerWidth, loadedRatios]);

  return (
    <main className="min-h-screen w-full bg-white text-black m-0 p-0 font-sans select-none overflow-x-hidden">
      <style jsx global>{`
        @font-face {
          font-family: "FRANK LEBON Front";
          src: url("/fonts/FRANKLEBON-Front.woff2") format("woff2");
          font-weight: normal;
          font-style: normal;
          font-display: swap;
        }
        @font-face {
          font-family: "LEBON";
          src: url("/fonts/LEBON-DirectorsCut.woff2") format("woff2");
          font-weight: normal;
          font-style: normal;
          font-display: swap;
        }

        .lebon-font {
          font-family: "FRANK LEBON Front", "LEBON", sans-serif;
        }

        ::-webkit-scrollbar {
          display: none;
          width: 0px;
          height: 0px;
          background: transparent;
        }

        html, body {
          scrollbar-width: none;
          -ms-overflow-style: none;
          margin: 0;
          padding: 0;
          width: 100%;
          overflow-x: hidden;
          background: #ffffff;
        }
      `}</style>

      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md py-3 px-4 mb-2 flex justify-between items-center border-b border-neutral-100">
        <Link
          href="/"
          className="text-[11px] lebon-font uppercase tracking-widest flex items-center gap-2 hover:opacity-60 transition-opacity"
        >
          <ArrowLeft size={14} /> HOME
        </Link>
        <span className="text-[11px] lebon-font uppercase tracking-widest text-neutral-400">
          PORTFOLIO ARCHIVE ({allPhotos.length})
        </span>
      </header>

      {loading ? (
        <div className="min-h-[70vh] flex items-center justify-center text-[10px] lebon-font text-neutral-400 uppercase tracking-widest animate-pulse">
          CARICAMENTO ARCHIVIO...
        </div>
      ) : allPhotos.length === 0 ? (
        <div className="min-h-[70vh] flex items-center justify-center text-[10px] lebon-font text-neutral-500 uppercase">
          Nessuno scatto presente nel portfolio.
        </div>
      ) : (
        <div ref={containerRef} className="w-full p-2 sm:p-4">
          <div className="flex flex-col" style={{ gap: `${GAP}px` }}>
            {layoutRows.map((row, rowIndex) => (
              <div
                key={`row-${rowIndex}`}
                className="flex w-full overflow-hidden"
                style={{ gap: `${GAP}px`, height: `${row.height}px` }}
              >
                {row.items.map(({ photo, key, ratio }) => {
                  const collectionName = photo.collection || photo.title || 'UNNAMED COLLECTION';
                  const thumbnailSrc = getOptimizedUrl(photo.public_url, 450);
                  const isReady = readyPhotos.has(photo.id);

                  return (
                    <div
                      key={key}
                      onClick={() => setSelectedPhoto(photo)}
                      style={{
                        flexGrow: ratio,
                        flexShrink: 1,
                        flexBasis: '0px',
                        height: `${row.height}px`,
                      }}
                      className="relative group cursor-pointer overflow-hidden bg-neutral-100 shadow-sm hover:z-20 transition-all duration-300"
                    >
                      <img
                        src={thumbnailSrc}
                        alt={photo.title || 'Portfolio Image'}
                        className={`w-full h-full block object-contain transition-opacity duration-500 ease-out group-hover:scale-105 ${
                          isReady ? 'opacity-100' : 'opacity-0'
                        }`}
                        loading="lazy"
                        decoding="async"
                      />

                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-4 text-center">
                        <span className="text-white text-[11px] sm:text-[13px] lebon-font uppercase tracking-widest drop-shadow-md">
                          {collectionName}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {canGrow && (
            <div
              ref={sentinelRef}
              className="h-24 w-full flex items-center justify-center text-[9px] lebon-font text-neutral-300 uppercase tracking-widest"
            >
              • • •
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedPhoto(null)}
            className="fixed inset-0 z-50 bg-white/98 backdrop-blur-2xl flex flex-col justify-between p-6 md:p-10 text-black lebon-font"
          >
            <div className="flex justify-between items-center text-xs border-b border-neutral-200 pb-3">
              <span className="text-black font-bold text-[10px] uppercase">
                {selectedPhoto.collection ? `${selectedPhoto.collection} — ` : ''}{selectedPhoto.title || 'DETTAGLIO FOTOGRAMMA'}
              </span>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="p-1.5 border border-neutral-200 text-neutral-600 hover:text-black transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="relative flex-1 my-4 flex items-center justify-center overflow-hidden">
              <img
                src={getOptimizedUrl(selectedPhoto.public_url, 1600)}
                alt={selectedPhoto.title}
                className="max-h-[75vh] max-w-full w-auto object-contain shadow-xl"
              />
            </div>

            {selectedPhoto.exif_data && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="bg-neutral-100 border border-neutral-200 p-4 rounded-xs max-w-xl mx-auto w-full text-[10px] text-neutral-700"
              >
                <div className="flex items-center gap-1.5 text-[9px] text-neutral-500 uppercase tracking-widest mb-2 font-bold border-b border-neutral-200 pb-1.5">
                  <Sliders size={10} /> REGISTRO EXIF
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[9px]">
                  <div>
                    <span className="block text-neutral-400 uppercase">CAMERA</span>
                    <span className="text-black font-bold">{selectedPhoto.exif_data.camera || '35MM'}</span>
                  </div>
                  <div>
                    <span className="block text-neutral-400 uppercase">LENS</span>
                    <span className="text-black font-bold">{selectedPhoto.exif_data.lens || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="block text-neutral-400 uppercase">EXPOSURE</span>
                    <span className="text-black font-bold">
                      {selectedPhoto.exif_data.focal_length} {selectedPhoto.exif_data.aperture}
                    </span>
                  </div>
                  <div>
                    <span className="block text-neutral-400 uppercase">ISO</span>
                    <span className="text-black font-bold">{selectedPhoto.exif_data.iso || 'N/A'}</span>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}