'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sliders } from 'lucide-react';
import Link from 'next/link';

interface ExifData {
  camera?: string;
  lens?: string;
  iso?: string;
  aperture?: string;
  shutter?: string;
  focal_length?: string;
}

interface Group {
  id: string;
  name: string;
  description?: string;
}

interface Photo {
  id: string;
  public_url: string;
  title: string;
  group_id?: string;
  collection?: string;
  exif_data?: ExifData;
  created_at: string;
  is_cover?: boolean;
}

const GAP = 12;
const TARGET_ROW_HEIGHT = 280;

const supabase = createClient();

function getOptimizedUrl(originalUrl: string, width: number = 1000) {
  if (!originalUrl) return '';
  if (originalUrl.includes('/storage/v1/object/public/')) {
    return originalUrl.replace(
      '/storage/v1/object/public/',
      `/storage/v1/render/image/public/`
    ) + `?width=${width}&quality=85&resize=contain`;
  }
  return originalUrl;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function isTouchDevice() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(hover: none)').matches || 'ontouchstart' in window;
}

function InteractiveReelRow({
  groups,
  photos,
  direction,
  onSelectGroup,
}: {
  groups: Group[];
  photos: Photo[];
  direction: 1 | -1;
  onSelectGroup: (group: Group) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const xRef = useRef(0);
  const velocityRef = useRef(0);
  const [activeMobileKey, setActiveMobileKey] = useState<string | null>(null);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const scrollForce = (Math.abs(e.deltaY) + Math.abs(e.deltaX)) * 0.06;
      velocityRef.current += scrollForce;
    };

    let touchStartX = 0;
    let touchStartY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const deltaX = e.touches[0].clientX - touchStartX;
      const deltaY = e.touches[0].clientY - touchStartY;
      const swipeForce = (Math.abs(deltaX) + Math.abs(deltaY)) * 0.08;
      velocityRef.current += swipeForce;

      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    };

    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  useEffect(() => {
    let animationFrameId: number;
    const baseSpeed = 0.35;

    const loop = () => {
      const currentSpeed = baseSpeed + velocityRef.current;
      velocityRef.current *= 0.93;

      xRef.current += currentSpeed * direction;

      if (trackRef.current) {
        const halfWidth = trackRef.current.scrollWidth / 2;
        if (halfWidth > 0) {
          if (xRef.current <= -halfWidth) {
            xRef.current += halfWidth;
          } else if (xRef.current >= 0) {
            xRef.current -= halfWidth;
          }
          trackRef.current.style.transform = `translate3d(${xRef.current}px, 0, 0)`;
        }
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [direction]);

  const reelItems = useMemo(() => {
    if (groups.length === 0) return [];
    return [...groups, ...groups, ...groups, ...groups, ...groups, ...groups];
  }, [groups]);

  const handleCardClick = (group: Group, itemKey: string) => {
    if (isTouchDevice()) {
      if (activeMobileKey === itemKey) {
        onSelectGroup(group);
      } else {
        setActiveMobileKey(itemKey);
      }
    } else {
      onSelectGroup(group);
    }
  };

  return (
    <div className="w-full h-full relative overflow-hidden bg-black flex items-center">
      <div ref={trackRef} className="flex h-full w-max shrink-0 items-center will-change-transform">
        {reelItems.map((group, idx) => {
          const itemKey = `reel-${group.id}-${idx}`;

          const cover =
            photos.find((p) => p.group_id === group.id && p.is_cover) ||
            photos.find((p) => p.group_id === group.id);

          const isMobileActive = activeMobileKey === itemKey;

          return (
            <div
              key={itemKey}
              onClick={() => handleCardClick(group, itemKey)}
              className="relative h-full w-[70vw] sm:w-[45vw] md:w-[35vw] bg-neutral-900 shrink-0 group cursor-pointer overflow-hidden border-r border-black select-none flex items-center justify-center"
            >
              {cover && (
                <img
                  src={getOptimizedUrl(cover.public_url, 1000)}
                  alt={group.name}
                  className="w-full h-full object-cover object-center block transition-transform duration-700 ease-out group-hover:scale-105"
                />
              )}

              <div
                className={`absolute inset-0 bg-black/60 transition-opacity duration-300 flex items-center justify-center p-6 text-center text-white lebon-font uppercase ${
                  isMobileActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
              >
                <span className="text-base sm:text-2xl md:text-3xl font-bold tracking-widest leading-tight drop-shadow-md px-2">
                  {group.name}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Portfolio() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [loadedRatios, setLoadedRatios] = useState<Record<string, number>>({});

  const containerRef = useRef<HTMLDivElement | null>(null);

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
  }, [loading, selectedGroup]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const [groupsRes, photosRes] = await Promise.all([
        supabase.from('groups').select('*').order('name', { ascending: true }),
        supabase.from('photos').select('*').order('created_at', { ascending: false })
      ]);

      if (groupsRes.data) setGroups(groupsRes.data as Group[]);
      if (photosRes.data) setPhotos(photosRes.data as Photo[]);

      setLoading(false);
    };

    fetchData();
  }, []);

  const shuffledGroupsRow1 = useMemo(() => shuffleArray(groups), [groups]);
  const shuffledGroupsRow2 = useMemo(() => shuffleArray(groups), [groups]);

  const currentProjectPhotos = useMemo(() => {
    if (!selectedGroup) return [];
    return photos.filter((p) => p.group_id === selectedGroup.id);
  }, [photos, selectedGroup]);

  const handleImgLoad = (id: string) => (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      const ratio = img.naturalWidth / img.naturalHeight;
      setLoadedRatios((prev) => {
        if (prev[id] === ratio) return prev;
        return { ...prev, [id]: ratio };
      });
    }
  };

  const layoutRows = useMemo(() => {
    if (!containerWidth || currentProjectPhotos.length === 0) return [];

    const rows: {
      items: { photo: Photo; width: number; ratio: number }[];
      height: number;
    }[] = [];

    let currentRow: { photo: Photo; ratio: number }[] = [];
    let currentAspectSum = 0;

    currentProjectPhotos.forEach((photo, index) => {
      const ratio = loadedRatios[photo.id] || 1.333;
      currentRow.push({ photo, ratio });
      currentAspectSum += ratio;

      const gapsTotalWidth = (currentRow.length - 1) * GAP;
      const availableWidth = containerWidth - gapsTotalWidth;
      const calculatedHeight = availableWidth / currentAspectSum;

      if (calculatedHeight <= TARGET_ROW_HEIGHT || index === currentProjectPhotos.length - 1) {
        const rowHeight = Math.max(calculatedHeight, 160);

        const items = currentRow.map((item) => ({
          photo: item.photo,
          ratio: item.ratio,
          width: item.ratio * rowHeight,
        }));

        rows.push({ items, height: rowHeight });
        currentRow = [];
        currentAspectSum = 0;
      }
    });

    return rows;
  }, [currentProjectPhotos, containerWidth, loadedRatios]);

  return (
    <main className="h-[100dvh] w-screen bg-black text-white m-0 p-0 font-sans select-none overflow-hidden relative">
      <style jsx global>{`
        @font-face {
          font-family: "FRANK LEBON Front";
          src: url("/fonts/FRANKLEBON-Front.woff2") format("woff2");
          font-weight: normal;
          font-style: normal;
          font-display: swap;
        }

        .lebon-font {
          font-family: "FRANK LEBON Front", sans-serif;
        }

        ::-webkit-scrollbar { display: none; }
        html, body {
          scrollbar-width: none;
          margin: 0; padding: 0; width: 100vw; height: 100dvh;
          overflow: hidden; background: #000000;
        }
      `}</style>

      {/* TASTO HOME MINIMALE */}
      {!selectedGroup && (
        <Link
          href="/"
          title="Torna alla Home"
          className="fixed top-5 left-5 z-50 p-2.5 flex items-center justify-center group cursor-pointer"
        >
          <div className="w-2 h-2 rounded-full bg-white/70 group-hover:bg-white group-hover:scale-125 transition-all shadow-sm backdrop-blur-md" />
        </Link>
      )}

      {loading ? (
        <div className="h-full w-full flex items-center justify-center text-[10px] lebon-font text-neutral-500 uppercase tracking-widest animate-pulse">
          CARICAMENTO ARCHIVIO...
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {!selectedGroup && (
            <div key="index-reels" className="h-[100dvh] w-screen flex flex-col justify-between overflow-hidden relative bg-black">
              {/* RIGA SUPERIORE: 50% DVH ESATTO */}
              <motion.div
                initial={{ y: 0, opacity: 1 }}
                exit={{ y: '-50dvh', opacity: 0 }}
                transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
                className="h-[50dvh] flex-1 w-full overflow-hidden"
              >
                <InteractiveReelRow
                  groups={shuffledGroupsRow1}
                  photos={photos}
                  direction={1}
                  onSelectGroup={(g) => setSelectedGroup(g)}
                />
              </motion.div>

              {/* RIGA INFERIORE: 50% DVH ESATTO */}
              <motion.div
                initial={{ y: 0, opacity: 1 }}
                exit={{ y: '50dvh', opacity: 0 }}
                transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
                className="h-[50dvh] flex-1 w-full overflow-hidden"
              >
                <InteractiveReelRow
                  groups={shuffledGroupsRow2}
                  photos={photos}
                  direction={-1}
                  onSelectGroup={(g) => setSelectedGroup(g)}
                />
              </motion.div>
            </div>
          )}

          {selectedGroup && (
            <motion.div
              key="project-page"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="h-full w-full overflow-y-auto pt-16 p-6 sm:p-12 bg-white text-black"
            >
              <div ref={containerRef} className="w-full max-w-7xl mx-auto">
                <div className="mb-8 border-b border-neutral-200 pb-4 lebon-font uppercase flex justify-between items-end">
                  <div>
                    <button
                      onClick={() => setSelectedGroup(null)}
                      className="text-[10px] text-neutral-400 hover:text-black mb-2 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      &larr; TORNA AI PROGETTI
                    </button>
                    <h1 className="text-xl sm:text-3xl font-bold tracking-widest">
                      {selectedGroup.name}
                    </h1>
                    {selectedGroup.description && (
                      <p className="text-[11px] text-neutral-500 normal-case font-mono mt-1">
                        {selectedGroup.description}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] text-neutral-400 font-mono tracking-widest">
                    [{currentProjectPhotos.length} FRAMES]
                  </span>
                </div>

                {currentProjectPhotos.length === 0 ? (
                  <div className="min-h-[50vh] flex items-center justify-center text-[10px] lebon-font text-neutral-400 uppercase tracking-widest">
                    Nessuno scatto presente in questo progetto.
                  </div>
                ) : (
                  <div className="flex flex-col pb-12" style={{ gap: `${GAP}px` }}>
                    {layoutRows.map((row, rowIndex) => (
                      <div
                        key={`row-${rowIndex}`}
                        className="flex w-full overflow-hidden"
                        style={{ gap: `${GAP}px`, height: `${row.height}px` }}
                      >
                        {row.items.map(({ photo, ratio }) => {
                          const thumbnailSrc = getOptimizedUrl(photo.public_url, 800);

                          return (
                            <div
                              key={photo.id}
                              onClick={() => setSelectedPhoto(photo)}
                              style={{
                                flexGrow: ratio,
                                flexShrink: 1,
                                flexBasis: '0px',
                                height: `${row.height}px`,
                              }}
                              className="relative group cursor-pointer overflow-hidden bg-neutral-100 shadow-xs hover:z-20 transition-all duration-300"
                            >
                              <img
                                src={thumbnailSrc}
                                alt={photo.title || 'Scatto'}
                                className="w-full h-full block object-contain transition-transform duration-500 ease-out group-hover:scale-105"
                                loading="lazy"
                                decoding="async"
                                onLoad={handleImgLoad(photo.id)}
                              />

                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-4">
                                <span className="text-white text-[11px] lebon-font uppercase tracking-widest">
                                  {photo.title || 'INGRANDISCI'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* MODAL EXIF */}
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
                {selectedGroup?.name} — {selectedPhoto.title || 'DETTAGLIO'}
              </span>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="p-1.5 border border-neutral-200 text-neutral-600 hover:text-black transition-colors cursor-pointer"
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
                className="bg-neutral-100 border border-neutral-200 p-4 rounded-2xs max-w-xl mx-auto w-full text-[10px] text-neutral-700"
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