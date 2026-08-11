'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import ExifReader from 'exifreader';
import { Upload, Trash2, RefreshCw, Image as ImageIcon } from 'lucide-react';

interface Photo {
  id: string;
  public_url: string;
  title: string;
  rotation: number;
  exif_data: Record<string, unknown>;
}

export default function AdminDashboard() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState('');
  const supabase = createClient();

  useEffect(() => {
    fetchPhotos();
  }, []);

  const fetchPhotos = async () => {
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPhotos(data);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setStatus('Parsing EXIF & Caricamento...');

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      try {
        // 1. Estrazione dati EXIF dal file
        const arrayBuffer = await file.arrayBuffer();
        const tags = ExifReader.load(arrayBuffer);

        const exifData = {
          camera: tags?.Model?.description || tags?.Make?.description || 'Unknown Camera',
          lens: tags?.LensModel?.description || 'Standard Lens',
          iso: tags?.ISOSpeedRatings?.description || tags?.PhotographicSensitivity?.description || 'ISO --',
          aperture: tags?.FNumber?.description || '',
          shutter: tags?.ExposureTime?.description || '',
          focal_length: tags?.FocalLength?.description || '',
        };

        // 2. Genera un nome unico per il file e carica su Supabase Storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `uploads/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('portfolio-images')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // 3. Ottieni l'URL Pubblico
        const { data: publicUrlData } = supabase.storage
          .from('portfolio-images')
          .getPublicUrl(filePath);

        // 4. Assegna una rotazione casuale stile "Lebon" (tra -4deg e +4deg)
        const randomRotation = Number((Math.random() * 8 - 4).toFixed(1));

        // 5. Salva nel DB Postgres
        await supabase.from('photos').insert({
          title: file.name.replace(/\.[^/.]+$/, ''),
          storage_path: filePath,
          public_url: publicUrlData.publicUrl,
          rotation: randomRotation,
          exif_data: exifData,
        });

      } catch (err: unknown) {
        console.error('Errore durante l upload:', err);
      }
    }

    setStatus('Caricamento completato!');
    setUploading(false);
    fetchPhotos();
  };

  const handleDelete = async (id: string, storagePath: string) => {
    if (!confirm('Vuoi davvero eliminare questa foto?')) return;

    await supabase.storage.from('portfolio-images').remove([storagePath]);
    await supabase.from('photos').delete().eq('id', id);
    fetchPhotos();
  };

  return (
    <main className="min-h-screen bg-[#0D0D0D] text-neutral-100 p-4 md:p-8 max-w-4xl mx-auto">
      <header className="flex justify-between items-center border-b border-neutral-800 pb-4 mb-6">
        <div>
          <h1 className="text-xl font-serif font-bold">Mobile Studio Admin</h1>
          <p className="text-xs font-mono text-neutral-400">Gestione Scatti & Portfolio</p>
        </div>
        <button
          onClick={fetchPhotos}
          className="p-2 bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-300 hover:text-white"
        >
          <RefreshCw size={18} />
        </button>
      </header>

      {/* Area Upload Mobile */}
      <section className="mb-8">
        <label className="border-2 border-dashed border-neutral-800 hover:border-neutral-600 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer bg-neutral-900/40 transition-colors">
          <Upload size={32} className="text-neutral-400 mb-2" />
          <span className="text-sm font-medium">Seleziona foto dal rullino</span>
          <span className="text-xs text-neutral-500 font-mono mt-1">Sostiene caricamento multiplo</span>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
        {status && <p className="mt-2 text-xs font-mono text-center text-neutral-400">{status}</p>}
      </section>

      {/* Griglia Foto Gestibile */}
      <section>
        <h2 className="text-sm font-mono uppercase tracking-wider text-neutral-400 mb-4 flex items-center gap-2">
          <ImageIcon size={16} /> Foto Caricate ({photos.length})
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="bg-neutral-900 border border-neutral-800 p-2 rounded-lg relative group overflow-hidden"
            >
              <div className="aspect-square relative overflow-hidden rounded bg-neutral-950">
                <img
                  src={photo.public_url}
                  alt={photo.title}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="mt-2 text-[10px] font-mono text-neutral-400 truncate">
                {photo.title}
              </div>

              <div className="mt-1 text-[9px] font-mono text-neutral-500 flex justify-between">
                <span>Rotazione: {photo.rotation}°</span>
              </div>

              <button
                onClick={() => handleDelete(photo.id, (photo as unknown as { storage_path: string }).storage_path)}
                className="absolute top-3 right-3 p-1.5 bg-red-950/80 text-red-400 rounded-md border border-red-800/50 hover:bg-red-900 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
