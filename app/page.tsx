'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Maximize2, X, Sliders, Info } from 'lucide-react';

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
  rotation: number;
  exif_data?: ExifData;
  created_at: string;
}

export default function Home() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [showExifInfo, setShowExifInfo] = useState(true);

  useEffect(() => {
    const fetchPhotos = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('photos')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setPhotos(data);
      }
      setLoading(false);
    };

    fetchPhotos();
  }, []);

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-[#E5E5E5] selection:bg-neutral-800 selection:text-white flex flex-col justify-between overflow-x-hidden">
      
      {/* Header Stile Editoriale Indie */}
      <header className="fixed top-0 left-0 right-0 z-40 p-6 md:p-10 flex justify-between items-start pointer-events-none mix-blend-difference">
        <div className="pointer-events-auto">
          <h1 className="text-2xl md:text-4xl font-serif tracking-tight font-light">
            EDOARDO LACERTOSA
          </h1>
          <p className="text-xs font-mono uppercase tracking-widest text-neutral-400 mt-1">
            Visual Archive & Works
          </p>
        </div>

        <nav className="pointer-events-auto flex items-center gap-6 text-xs font-mono">
          <a
            href="/admin"
            className="px-3 py-1.5 rounded-full border border-neutral-700 bg-neutral-900/60 backdrop-blur-md hover:bg-white hover:text-black transition-all"
          >
            STUDIO ADMIN
          </a>
        </nav>
      </header>

      {/* Hero / Intro Text */}
      <div className="pt-32 px-6 md:px-12 max-w-xl">
        <p className="text-xs md:text-sm font-mono text-neutral-400 leading-relaxed">
          [ Drag cards to explore • Tap for full specs ]
        </p>
      </div>

      {/* Main Interactive Stage (Canvas Orizzontale estilo Lebon + Garreta) */}
      <section className="relative my-auto py-12 px-6 md:px-12 overflow-x-auto no-scrollbar flex items-center gap-8 md:gap-16 min-h-[60vh] snap-x">
        {loading ? (
          <div className="w-full flex justify-center items-center py-24 font-mono text-xs text-neutral-500">
            [ Loading Archive... ]
          </div>
        ) : photos.length === 0 ? (
          <div className="w-full text-center py-24 font-mono text-xs text-neutral-500">
            Nessuno scatto presente nell'archivio. Accedi a <a href="/admin" className="underline text-neutral-300">/admin</a> dal telefono per caricare le tue prime foto.
          </div>
        ) : (
          photos.map((photo, idx) => (
            <motion.div
              key={photo.id}
              drag
              dragConstraints={{ top: -40, left: -40, right: 40, bottom: 40 }}
              whileDrag={{ scale: 1.05, zIndex: 50 }}
              whileHover={{ scale: 1.02 }}
              initial={{ rotate: photo.rotation || 0, opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: idx * 0.08 }}
              onClick={() => setSelectedPhoto(photo)}
              className="relative flex-shrink-0 cursor-grab active:cursor-grabbing select-none snap-center group"
            >
              {/* Photo Frame / Card Stile Polaroid / Contact Sheet */}
              <div className="bg-neutral-900/90 border border-neutral-800/80 p-3 md:p-4 rounded-sm shadow-2xl backdrop-blur-sm max-w-[280px] sm:max-w-[340px] md:max-w-[380px] transition-colors group-hover:border-neutral-600">
                <div className="relative aspect-[4/5] overflow-hidden bg-neutral-950 rounded-xs">
                  <img
                    src={photo.public_url}
                    alt={photo.title || 'Photograph'}
                    className="w-full h-full object-cover pointer-events-none"
                    loading="lazy"
                  />
                  <div className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <Maximize2 size={14} />
                  </div>
                </div>

                {/* EXIF Metadata Footer */}
                {photo.exif_data && (
                  <div className="mt-3 pt-2 border-t border-neutral-800/60 flex justify-between items-center text-[10px] font-mono text-neutral-400">
                    <span className="truncate max-w-[150px]">{photo.exif_data.camera || 'Analog / Digital'}</span>
                    <span>{photo.exif_data.focal_length} {photo.exif_data.aperture}</span>
                  </div>
                )}
              </div>
            </motion.div>
          ))
        )}
      </section>

      {/* Lightbox / Modal a Schermo Intero per Dettaglio & EXIF */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedPhoto(null)}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-10"
          >
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-6 right-6 z-50 p-3 bg-neutral-900 rounded-full border border-neutral-800 text-neutral-300 hover:text-white"
            >
              <X size={20} />
            </button>

            <div
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-6xl w-full max-h-[90vh] flex flex-col md:flex-row items-center gap-6 justify-center"
            >
              {/* Immagine ad alta risoluzione */}
              <div className="relative flex-1 max-h-[75vh] md:max-h-[85vh] flex justify-center items-center">
                <img
                  src={selectedPhoto.public_url}
                  alt={selectedPhoto.title}
                  className="max-h-[75vh] md:max-h-[85vh] w-auto max-w-full object-contain rounded-xs shadow-2xl"
                />
              </div>

              {/* Scheda Dettagli EXIF Laterale */}
              <div className="w-full md:w-80 bg-neutral-900/80 border border-neutral-800 p-6 rounded-lg font-mono text-xs text-neutral-300 backdrop-blur-md">
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-neutral-800">
                  <span className="uppercase tracking-widest text-[10px] text-neutral-500 flex items-center gap-1.5">
                    <Info size={12} /> Camera Specs
                  </span>
                  <button
                    onClick={() => setShowExifInfo(!showExifInfo)}
                    className="text-neutral-500 hover:text-neutral-300"
                  >
                    <Sliders size={14} />
                  </button>
                </div>

                <h3 className="text-sm font-serif font-bold text-white mb-4 truncate">
                  {selectedPhoto.title}
                </h3>

                {selectedPhoto.exif_data && (
                  <dl className="space-y-2.5 text-[11px]">
                    <div className="flex justify-between">
                      <dt className="text-neutral-500">Body</dt>
                      <dd className="text-neutral-200">{selectedPhoto.exif_data.camera || 'N/A'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-neutral-500">Lens</dt>
                      <dd className="text-neutral-200">{selectedPhoto.exif_data.lens || 'N/A'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-neutral-500">Focal Length</dt>
                      <dd className="text-neutral-200">{selectedPhoto.exif_data.focal_length || 'N/A'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-neutral-500">Aperture</dt>
                      <dd className="text-neutral-200">{selectedPhoto.exif_data.aperture || 'N/A'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-neutral-500">Shutter Speed</dt>
                      <dd className="text-neutral-200">{selectedPhoto.exif_data.shutter || 'N/A'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-neutral-500">ISO</dt>
                      <dd className="text-neutral-200">{selectedPhoto.exif_data.iso || 'N/A'}</dd>
                    </div>
                  </dl>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Minimal */}
      <footer className="p-6 md:p-10 border-t border-neutral-900 flex justify-between items-center text-[10px] font-mono text-neutral-500">
        <span>© {new Date().getFullYear()} Edoardo Lacertosa</span>
        <span className="flex items-center gap-1.5">
          <Camera size={12} /> Powered by Supabase & Vercel
        </span>
      </footer>
    </main>
  );
}
