'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowLeft } from 'lucide-react';
import InfoModal from './InfoModal';

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

const supabase = createClient();

function getOptimizedUrl(originalUrl: string, width: number = 1000) {
  if (!originalUrl) return '';
  const standardUrl = originalUrl.replace(
    '/storage/v1/render/image/public/',
    '/storage/v1/object/public/'
  );
  if (standardUrl.includes('/storage/v1/object/public/')) {
    return `https://wsrv.nl/?url=${encodeURIComponent(standardUrl)}&w=${width}&output=webp&q=85&fit=contain`;
  }
  return standardUrl;
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

function useIntersectionObserver(
  ref: React.RefObject<HTMLElement | null>,
  options: IntersectionObserverInit = { threshold: 0.05 }
) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.disconnect();
      }
    }, options);

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [ref, options]);

  return isVisible;
}

const GalleryImage = ({
  photo,
  groupName,
  onSelect,
}: {
  photo: Photo;
  groupName: string;
  onSelect: (photo: Photo) => void;
}) => {
  const imgRef = useRef<HTMLDivElement>(null);
  const isVisible = useIntersectionObserver(imgRef, { threshold: 0.05 });
  const [loaded, setLoaded] = useState(false);

  return (
    <motion.div
      ref={imgRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: isVisible ? 1 : 0 }}
      transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
      className="relative overflow-hidden bg-white cursor-pointer group w-full flex justify-center px-0 md:px-4"
      onClick={() => onSelect(photo)}
    >
      {isVisible && (
        <img
          src={getOptimizedUrl(photo.public_url, 1000)}
          alt={photo.title || groupName}
          className="w-full max-w-2xl h-auto object-contain mx-auto block transition-transform duration-700 ease-out group-hover:scale-102"
          loading="lazy"
          onLoad={() => setLoaded(true)}
        />
      )}
      {!loaded && isVisible && (
        <div className="absolute inset-0 bg-neutral-100 animate-pulse max-w-2xl mx-auto" />
      )}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />
    </motion.div>
  );
};

function StandardGalleryView({
  group,
  photos,
  onBack,
  onSelectPhoto,
}: {
  group: Group;
  photos: Photo[];
  onBack: () => void;
  onSelectPhoto: (photo: Photo) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  // RIPRISTINO SCROLL ALL'INIZIO OGNI VOLTA CHE SI APRE LA GALLERIA
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [group.id]);

  const col1: Photo[] = [];
  const col2: Photo[] = [];
  photos.forEach((photo, i) => {
    if (i % 2 === 0) col1.push(photo);
    else col2.push(photo);
  });

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-35 w-screen h-screen bg-white text-black overflow-y-auto overflow-x-hidden selection:bg-black selection:text-white m-0 p-0"
    >
      <header className="fixed top-6 left-6 z-50 bg-transparent">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onBack();
          }}
          title="Torna indietro"
          className="p-2 flex items-center justify-center text-neutral-800 hover:text-black transition-all duration-200 cursor-pointer hover:scale-110 active:scale-95 bg-white/80 backdrop-blur-sm rounded-full shadow-sm"
        >
          <ArrowLeft className="w-7 h-7 stroke-[1.5]" />
        </button>
      </header>

      <main className="w-screen max-w-none m-0 p-0 pt-16 pb-16 md:pt-20 md:pb-24 overflow-x-hidden flex flex-col items-center bg-white">
        <div className="w-full max-w-6xl mx-auto px-1 md:px-4 border-t border-white pt-2 md:pt-4 bg-white">
          <div className="grid grid-cols-2 gap-1 md:gap-16 justify-center bg-white">
            <div className="flex flex-col items-center gap-1 md:gap-16 w-full">
              {col1.map((photo) => (
                <GalleryImage
                  key={photo.id}
                  photo={photo}
                  groupName={group.name}
                  onSelect={onSelectPhoto}
                />
              ))}
            </div>
            <div className="flex flex-col items-center gap-1 md:gap-16 w-full">
              {col2.map((photo) => (
                <GalleryImage
                  key={photo.id}
                  photo={photo}
                  groupName={group.name}
                  onSelect={onSelectPhoto}
                />
              ))}
            </div>
          </div>
        </div>
      </main>
    </motion.div>
  );
}

function PhotoModal({
  photo,
  onClose,
}: {
  photo: Photo;
  onClose: () => void;
}) {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      onClick={onClose}
      className="fixed inset-0 z-[100] bg-white/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-10 m-0 select-none"
    >
      <button
        onClick={onClose}
        className="absolute top-6 right-6 z-10 p-3 rounded-full bg-neutral-100 text-black hover:bg-neutral-200 transition-colors cursor-pointer"
      >
        <X size={20} />
      </button>

      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-8 h-8 border-2 border-neutral-200 border-t-black rounded-full animate-spin" />
        </div>
      )}

      <motion.img
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: isLoaded ? 1 : 0.96, opacity: isLoaded ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        src={getOptimizedUrl(photo.public_url, 1600)}
        alt={photo.title}
        onLoad={() => setIsLoaded(true)}
        className="max-h-[90vh] max-w-[95vw] object-contain shadow-2xl bg-white mx-auto"
        onClick={(e) => e.stopPropagation()}
      />
    </motion.div>
  );
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

  const handleCardClick = (e: React.MouseEvent, group: Group, itemKey: string) => {
    e.stopPropagation();
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
    <div className="w-full h-full relative overflow-hidden bg-white flex items-center m-0 p-0">
      <div ref={trackRef} className="flex h-full w-max shrink-0 items-center will-change-transform m-0 p-0">
        {reelItems.map((group, idx) => {
          const itemKey = `reel-${group.id}-${idx}`;

          const cover =
            photos.find((p) => p.group_id === group.id && p.is_cover) ||
            photos.find((p) => p.group_id === group.id);

          const isMobileActive = activeMobileKey === itemKey;

          return (
            <div
              key={itemKey}
              onClick={(e) => handleCardClick(e, group, itemKey)}
              className="relative h-full w-[70vw] sm:w-[45vw] md:w-[35vw] bg-neutral-100 shrink-0 group cursor-pointer overflow-hidden border-0 select-none flex items-center justify-center m-0 p-0"
            >
              {cover && (
                <img
                  src={getOptimizedUrl(cover.public_url, 1000)}
                  alt={group.name}
                  className="w-full h-full object-cover object-center block transition-transform duration-700 ease-out group-hover:scale-105 m-0 p-0 border-0"
                />
              )}

              <div
                className={`absolute inset-0 bg-white/60 transition-opacity duration-300 flex items-center justify-center p-6 text-center text-black lebon-font uppercase ${
                  isMobileActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
              >
                <span className="text-base sm:text-2xl md:text-3xl font-bold tracking-widest leading-tight drop-shadow-sm px-2">
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

export default function Home() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [shuffledIndices, setShuffledIndices] = useState<number[]>([]);
  const [shufflePointer, setShufflePointer] = useState(0);

  const [stage, setStage] = useState<'init' | 'hold' | 'active'>('init');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Modali e stati sovrapposizione
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isPortOpen, setIsPortOpen] = useState(false);
  const [isReelsOpen, setIsReelsOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearPendingTimeout = () => {
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    return () => clearPendingTimeout();
  }, []);

  const textInit = "EDOARDO LACERTOSA";
  const textHold = "INFO   INSTA   PORTFOLIO";

  const [typedInit, setTypedInit] = useState("");
  const [typedHold, setTypedHold] = useState("");

  useEffect(() => {
    setIsMounted(true);

    if (typeof window !== 'undefined') {
      const lastVisited = localStorage.getItem('home_last_visited');
      const now = Date.now();
      const FIVE_MINUTES_MS = 5 * 60 * 1000;

      if (lastVisited && now - parseInt(lastVisited, 10) < FIVE_MINUTES_MS) {
        setStage('active');
        setTypedInit(textInit);
        setTypedHold(textHold);
      } else {
        setStage('init');
      }

      localStorage.setItem('home_last_visited', now.toString());
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const [groupsRes, photosRes] = await Promise.all([
        supabase.from('groups').select('*').order('name', { ascending: true }),
        supabase.from('photos').select('*').order('created_at', { ascending: false })
      ]);

      if (groupsRes.data) setGroups(groupsRes.data as Group[]);

      if (photosRes.data && photosRes.data.length > 0) {
        const loadedPhotos = photosRes.data as Photo[];
        setPhotos(loadedPhotos);

        loadedPhotos.forEach((photo) => {
          const img = new Image();
          img.src = getOptimizedUrl(photo.public_url, 1000);
        });

        const indices = Array.from({ length: loadedPhotos.length }, (_, i) => i);
        for (let i = indices.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [indices[i], indices[j]] = [indices[j], indices[i]];
        }
        setShuffledIndices(indices);
        setShufflePointer(0);
      }
    };

    fetchData();
  }, []);

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

  const handleOpenPort = () => {
    clearPendingTimeout();
    setSelectedGroup(null);
    setIsPortOpen(true);
    setIsReelsOpen(true);
  };

  const handleClosePort = () => {
    clearPendingTimeout();
    setIsReelsOpen(false);
    transitionTimeoutRef.current = setTimeout(() => {
      setIsPortOpen(false);
      setSelectedGroup(null);
    }, 850);
  };

  const handleSelectGroup = (group: Group) => {
    clearPendingTimeout();
    setSelectedGroup(group);
    setIsReelsOpen(false);
  };

  const handleBackFromGallery = () => {
    clearPendingTimeout();
    setIsReelsOpen(true);
    transitionTimeoutRef.current = setTimeout(() => {
      setSelectedGroup(null);
    }, 850);
  };

  const shuffledGroupsRow1 = useMemo(() => shuffleArray(groups), [groups]);
  const shuffledGroupsRow2 = useMemo(() => shuffleArray(groups), [groups]);

  const currentProjectPhotos = useMemo(() => {
    if (!selectedGroup) return [];
    return photos.filter((p) => p.group_id === selectedGroup.id);
  }, [photos, selectedGroup]);

  const currentPhotoIndex = shuffledIndices.length > 0 ? shuffledIndices[shufflePointer] : 0;
  const currentPhoto = photos[currentPhotoIndex];
  const displayedUrl = currentPhoto ? getOptimizedUrl(currentPhoto.public_url, 1000) : null;

  return (
    <main className="h-[100dvh] w-screen bg-white text-black overflow-hidden relative select-none font-sans">
      
      <style jsx global>{`
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
          margin: 0 !important;
          padding: 0 !important;
          width: 100vw !important;
          height: 100dvh !important;
          overflow: hidden !important;
          background: #ffffff !important;
        }

        .lebon-container {
          font-size: 1.4vw;
          letter-spacing: 0.05em;
          word-spacing: 1.5em;
          text-transform: uppercase;
          line-height: 1;
        }

        @media screen and (max-width: 1024px) {
          .lebon-container { font-size: 3.2vw; word-spacing: 1.2em; }
        }
        @media screen and (max-width: 568px) {
          .lebon-container { font-size: 4.2vw; word-spacing: 0.8em; }
        }

        .layer-back {
          font-family: "FRANK LEBON Back", sans-serif;
          color: #ffffff;
        }
        .layer-back span.swap, .layer-back a.swap, .layer-back button.swap {
          color: #000000 !important;
        }

        .layer-front {
          font-family: "FRANK LEBON Front", sans-serif;
          color: #000000;
        }
        .layer-front a, .layer-front button {
          color: #000000;
          text-decoration: none;
          background: none;
          border: none;
          cursor: pointer;
          font: inherit;
          padding: 0;
        }
        .layer-front span.swap, .layer-front a.swap, .layer-front button.swap {
          color: #ffffff !important;
        }

        .lebon-font {
          font-family: "FRANK LEBON Front", sans-serif;
        }
      `}</style>

      {/* LAYER 1 (BACK LAYER DELLA HOME z-20) */}
      <div className="fixed inset-0 h-[100dvh] w-screen z-20 flex items-center justify-center text-center pointer-events-none lebon-container layer-back">
        <div className="w-full px-4 sm:px-8">
          {isMounted && stage === 'init' && (
            <span>{typedInit || " "}</span>
          )}

          {isMounted && (stage === 'hold' || stage === 'active') && (
            <span>
              <span className={hoveredIndex === 0 ? 'swap' : ''}>
                {typedHold.slice(0, 4)}
              </span>
              {typedHold.length > 4 && (
                <span className={`ml-[1.2em] sm:ml-[1.5em] ${hoveredIndex === 1 ? 'swap' : ''}`}>
                  {typedHold.slice(7, 12)}
                </span>
              )}
              {typedHold.length > 12 && (
                <span className={`ml-[1.2em] sm:ml-[1.5em] ${hoveredIndex === 2 ? 'swap' : ''}`}>
                  {typedHold.slice(15)}
                </span>
              )}
            </span>
          )}
        </div>
      </div>

      {/* LAYER 2 (FRONT LAYER DELLA HOME z-30) */}
      <div className="fixed inset-0 h-[100dvh] w-screen z-30 flex items-center justify-center text-center pointer-events-none lebon-container layer-front">
        <div className="w-full px-4 sm:px-8">
          {isMounted && stage === 'init' && (
            <span>{typedInit || " "}</span>
          )}

          {isMounted && (stage === 'hold' || stage === 'active') && (
            <span className="pointer-events-auto">
              <button 
                onClick={() => setIsInfoOpen(true)}
                className={hoveredIndex === 0 ? 'swap' : ''}
                onMouseEnter={() => setHoveredIndex(0)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {typedHold.slice(0, 4)}
              </button>
              {typedHold.length > 4 && (
                <a 
                  href="https://www.instagram.com/edoardo_lacertosa/" 
                  target="_blank" 
                  rel="noreferrer" 
                  className={`ml-[1.2em] sm:ml-[1.5em] ${hoveredIndex === 1 ? 'swap' : ''}`}
                  onMouseEnter={() => setHoveredIndex(1)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  {typedHold.slice(7, 12)}
                </a>
              )}
              {typedHold.length > 12 && (
                <button 
                  onClick={handleOpenPort}
                  className={`ml-[1.2em] sm:ml-[1.5em] ${hoveredIndex === 2 ? 'swap' : ''}`}
                  onMouseEnter={() => setHoveredIndex(2)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  {typedHold.slice(15)}
                </button>
              )}
            </span>
          )}
        </div>
      </div>

      {/* STAGE GALLERIA FOTO DELLA HOME (PERMANENTE z-10) */}
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

      {/* VISTA GALLERIA PROGETTO SELEZIONATO (SOTTO I REEL z-35) */}
      <AnimatePresence>
        {selectedGroup && (
          <StandardGalleryView
            group={selectedGroup}
            photos={currentProjectPhotos}
            onBack={handleBackFromGallery}
            onSelectPhoto={(photo) => setSelectedPhoto(photo)}
          />
        )}
      </AnimatePresence>

      {/* OVERLAY REEL PORTFOLIO (SOPRA LA GALLERIA E LA HOME z-40) */}
      <AnimatePresence>
        {isPortOpen && (
          <div className="fixed inset-0 z-40 h-[100dvh] w-screen flex flex-col justify-between overflow-hidden pointer-events-none">
            {/* FRECCIA MINIMAL SUI REEL */}
            {isReelsOpen && !selectedGroup && (
              <div className="fixed top-6 left-6 z-50 pointer-events-auto">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClosePort();
                  }}
                  title="Torna alla Home"
                  className="p-2 flex items-center justify-center text-neutral-800 hover:text-black transition-all duration-200 cursor-pointer hover:scale-110 active:scale-95 bg-white/80 backdrop-blur-sm rounded-full shadow-sm"
                >
                  <ArrowLeft className="w-7 h-7 stroke-[1.5]" />
                </button>
              </div>
            )}

            {/* RIGA SUPERIORE REEL */}
            <motion.div
              initial={{ y: '-100%' }}
              animate={isReelsOpen ? { y: '0%' } : { y: '-100%' }}
              transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
              className="h-[50dvh] flex-1 w-full overflow-hidden m-0 p-0 bg-white shadow-sm pointer-events-auto"
            >
              <InteractiveReelRow
                groups={shuffledGroupsRow1}
                photos={photos}
                direction={1}
                onSelectGroup={handleSelectGroup}
              />
            </motion.div>

            {/* RIGA INFERIORE REEL */}
            <motion.div
              initial={{ y: '100%' }}
              animate={isReelsOpen ? { y: '0%' } : { y: '100%' }}
              transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
              className="h-[50dvh] flex-1 w-full overflow-hidden m-0 p-0 bg-white shadow-sm pointer-events-auto"
            >
              <InteractiveReelRow
                groups={shuffledGroupsRow2}
                photos={photos}
                direction={-1}
                onSelectGroup={handleSelectGroup}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODALE INFO INTEGRATO z-50 */}
      <AnimatePresence>
        {isInfoOpen && (
          <InfoModal onClose={() => setIsInfoOpen(false)} />
        )}
      </AnimatePresence>

      {/* MODAL EXIF INGRANDIMENTO FOTO CON SPINNER z-[100] */}
      <AnimatePresence>
        {selectedPhoto && (
          <PhotoModal
            photo={selectedPhoto}
            onClose={() => setSelectedPhoto(null)}
          />
        )}
      </AnimatePresence>

    </main>
  );
}