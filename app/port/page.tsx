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
      className="relative overflow-hidden bg-white cursor-pointer group w-full flex justify-center px-4"
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
  const col1: Photo[] = [];
  const col2: Photo[] = [];
  photos.forEach((photo, i) => {
    if (i % 2 === 0) col1.push(photo);
    else col2.push(photo);
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className="fixed inset-0 z-50 w-screen h-screen bg-white text-black overflow-y-auto overflow-x-hidden selection:bg-black selection:text-white m-0 p-0"
    >
      <header className="fixed top-5 left-5 z-50 bg-transparent">
        <button
          onClick={onBack}
          title="Torna alla Home"
          className="p-2.5 flex items-center justify-center group cursor-pointer"
        >
          <div className="w-2 h-2 rounded-full bg-black/70 group-hover:bg-black group-hover:scale-125 transition-all shadow-sm" />
        </button>
      </header>

      <main className="w-screen max-w-none m-0 p-0 pt-48 pb-48 overflow-x-hidden flex flex-col items-center bg-white">
        <div className="w-full max-w-6xl mx-auto px-4 border-t border-white pt-12 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 justify-center bg-white">
            <div className="flex flex-col items-center gap-12 md:gap-16 w-full">
              {col1.map((photo) => (
                <GalleryImage
                  key={photo.id}
                  photo={photo}
                  groupName={group.name}
                  onSelect={onSelectPhoto}
                />
              ))}
            </div>
            <div className="flex flex-col items-center gap-12 md:gap-16 w-full">
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
              onClick={() => handleCardClick(group, itemKey)}
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

export default function Portfolio() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  useEffect(() => {
    const fetchData = async () => {
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

  return (
    <main className="h-[100dvh] w-screen bg-white text-black m-0 p-0 font-sans select-none overflow-x-hidden relative">
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

        *, *:before, *:after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        ::-webkit-scrollbar { display: none; }
        
        html, body {
          scrollbar-width: none;
          margin: 0 !important;
          padding: 0 !important;
          width: 100vw !important;
          height: 100dvh !important;
          overflow-x: hidden !important;
          background: #ffffff !important;
        }
      `}</style>

      {/* TASTO HOME MINIMALE */}
      {!selectedGroup && (
        <Link
          href="/"
          title="Torna alla Home"
          className="fixed top-5 left-5 z-50 p-2.5 flex items-center justify-center group cursor-pointer"
        >
          <div className="w-2 h-2 rounded-full bg-black/70 group-hover:bg-black group-hover:scale-125 transition-all shadow-sm backdrop-blur-md" />
        </Link>
      )}

      <AnimatePresence mode="wait">
        {!selectedGroup && (
          <motion.div
            key="index-reels"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="h-[100dvh] w-screen flex flex-col justify-between overflow-hidden relative bg-white m-0 p-0"
          >
            {/* RIGA SUPERIORE: 50% DVH ESATTO */}
            <div className="h-[50dvh] flex-1 w-full overflow-hidden m-0 p-0">
              <InteractiveReelRow
                groups={shuffledGroupsRow1}
                photos={photos}
                direction={1}
                onSelectGroup={(g) => setSelectedGroup(g)}
              />
            </div>

            {/* RIGA INFERIORE: 50% DVH ESATTO */}
            <div className="h-[50dvh] flex-1 w-full overflow-hidden m-0 p-0">
              <InteractiveReelRow
                groups={shuffledGroupsRow2}
                photos={photos}
                direction={-1}
                onSelectGroup={(g) => setSelectedGroup(g)}
              />
            </div>
          </motion.div>
        )}

        {/* RENDERING CONDIZIONALE DEL PROGETTO SELEZIONATO - TUTTE LE GALLERIE UGUALI */}
        {selectedGroup && (
          <StandardGalleryView
            group={selectedGroup}
            photos={currentProjectPhotos}
            onBack={() => setSelectedGroup(null)}
            onSelectPhoto={(photo) => setSelectedPhoto(photo)}
          />
        )}
      </AnimatePresence>

      {/* MODAL EXIF */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => setSelectedPhoto(null)}
            className="fixed inset-0 z-[100] bg-white backdrop-blur-xl flex items-center justify-center p-4 md:p-10 m-0"
          >
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-6 right-6 z-10 p-3 rounded-full bg-neutral-100 text-black hover:bg-neutral-200 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>

            <motion.img
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.3 }}
              src={getOptimizedUrl(selectedPhoto.public_url, 1600)}
              alt={selectedPhoto.title}
              className="max-h-[90vh] max-w-[95vw] object-contain shadow-2xl bg-white mx-auto"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}