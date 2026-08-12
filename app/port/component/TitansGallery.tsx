'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

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
  group_id?: string;
  exif_data?: ExifData;
  created_at: string;
}

interface Group {
  id: string;
  name: string;
  description?: string;
}

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

export default function TitansGallery({
  group,
  photos,
  onBack,
}: {
  group: Group;
  photos: Photo[];
  onBack: () => void;
}) {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  const col1: Photo[] = [];
  const col2: Photo[] = [];
  photos.forEach((photo, i) => {
    if (i % 2 === 0) col1.push(photo);
    else col2.push(photo);
  });

  return (
    <motion.div
      initial={{ y: '50dvh', opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: '50dvh', opacity: 0 }}
      transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
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
        <div className="w-full max-w-6xl mx-auto px-4 border-t-2 border-neutral-300 pt-12 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 justify-center bg-white">
            <div className="flex flex-col items-center gap-12 md:gap-16 w-full">
              {col1.map((photo) => (
                <GalleryImage
                  key={photo.id}
                  photo={photo}
                  groupName={group.name}
                  onSelect={setSelectedPhoto}
                />
              ))}
            </div>
            <div className="flex flex-col items-center gap-12 md:gap-16 w-full">
              {col2.map((photo) => (
                <GalleryImage
                  key={photo.id}
                  photo={photo}
                  groupName={group.name}
                  onSelect={setSelectedPhoto}
                />
              ))}
            </div>
          </div>
        </div>
      </main>

      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => setSelectedPhoto(null)}
            className="fixed inset-0 z-[100] bg-white backdrop-blur-xl flex items-center justify-center p-4 md:p-10"
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
              alt={selectedPhoto.title || group.name}
              className="max-h-[90vh] max-w-[95vw] object-contain shadow-2xl bg-white mx-auto"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}