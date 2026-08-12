'use client';

export const dynamic = 'force-dynamic'; // <--- AGGIUNGI QUESTA RIGA

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { Upload, Trash2, Folder, Plus, Layers, Shuffle, Loader2 } from 'lucide-react';

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
  created_at: string;
}

// Estensione del tipo Photo per includere un ID di istanza unico nel feed infinito
interface DisplayPhoto extends Photo {
  instanceId: string;
}

const BATCH_SIZE = 12; // Foto da aggiungere ad ogni ciclo di scroll

// Algoritmo di Fisher-Yates per mescolare l'array in modo veramente casuale
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function AdminPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Lista dinamica delle foto mostrate nell'infinite scroll
  const [displayedPhotos, setDisplayedPhotos] = useState<DisplayPhoto[]>([]);

  // Form Nuova Foto
  const [title, setTitle] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Form Nuovo Gruppo
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');

  // Filtro attivo
  const [activeFilter, setActiveFilter] = useState<string>('ALL');

  // Ref per l'elemento sentinella dell'Infinite Scroll
  const observerTarget = useRef<HTMLDivElement>(null);

  const supabase = createClient();

  // Funzione per generare un blocco di foto casuali dal pool filtrato
  const generateRandomBatch = useCallback((pool: Photo[], count: number): DisplayPhoto[] => {
    if (pool.length === 0) return [];
    
    const batch: DisplayPhoto[] = [];
    let currentDeck = shuffleArray(pool);

    while (batch.length < count) {
      if (currentDeck.length === 0) {
        currentDeck = shuffleArray(pool); // Rimescola un nuovo mazzo quando finisce
      }
      const photo = currentDeck.pop()!;
      batch.push({
        ...photo,
        instanceId: `${photo.id}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
      });
    }

    return batch;
  }, []);

  // Fetch dei dati iniziali da Supabase
  const fetchData = async () => {
    setLoading(true);

    // Fetch Gruppi
    const { data: groupsData } = await supabase
      .from('groups')
      .select('*')
      .order('name', { ascending: true });

    if (groupsData) {
      setGroups(groupsData as Group[]);
      if (groupsData.length > 0 && !selectedGroupId) {
        setSelectedGroupId(groupsData[0].id);
      }
    }

    // Fetch Foto
    const { data: photosData } = await supabase
      .from('photos')
      .select('*');

    if (photosData) {
      const rawPhotos = photosData as Photo[];
      setPhotos(rawPhotos);
      // Inizializza il primo blocco di foto totalmente mischiato
      setDisplayedPhotos(generateRandomBatch(rawPhotos, BATCH_SIZE));
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Ottieni il pool di foto in base al filtro attivo
  const getFilteredPool = useCallback(() => {
    if (activeFilter === 'ALL') return photos;
    if (activeFilter === 'UNGROUPED') return photos.filter((p) => !p.group_id);
    return photos.filter((p) => p.group_id === activeFilter);
  }, [photos, activeFilter]);

  // Quando cambia il filtro attivo, resetta e rimescola completamente il feed
  useEffect(() => {
    const pool = getFilteredPool();
    setDisplayedPhotos(generateRandomBatch(pool, BATCH_SIZE));
  }, [activeFilter, getFilteredPool, generateRandomBatch]);

  // Funzione per caricare ALTRE foto mischiate quando si arriva in fondo
  const loadMorePhotos = useCallback(() => {
    const pool = getFilteredPool();
    if (pool.length === 0) return;

    const nextBatch = generateRandomBatch(pool, BATCH_SIZE);
    setDisplayedPhotos((prev) => [...prev, ...nextBatch]);
  }, [getFilteredPool, generateRandomBatch]);

  // Pulsante per rimescolare manualmente da zero
  const handleReshuffle = () => {
    const pool = getFilteredPool();
    setDisplayedPhotos(generateRandomBatch(pool, BATCH_SIZE));
  };

  // Intersection Observer per intercettare lo scroll verso il basso
  useEffect(() => {
    const target = observerTarget.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading) {
          loadMorePhotos();
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(target);

    return () => {
      observer.unobserve(target);
    };
  }, [loadMorePhotos, loading]);

  // 1. Crea Nuovo Gruppo
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return alert('Inserisci il nome del gruppo!');

    const { data, error } = await supabase
      .from('groups')
      .insert([{ name: newGroupName.trim().toUpperCase(), description: newGroupDesc }])
      .select()
      .single();

    if (error) {
      alert('Errore creazione gruppo: ' + error.message);
    } else if (data) {
      setGroups((prev) => [...prev, data as Group]);
      setSelectedGroupId(data.id);
      setNewGroupName('');
      setNewGroupDesc('');
    }
  };

  // 2. Eliminazione Gruppo
  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    if (!confirm(`Sei sicuro di voler eliminare il gruppo "${groupName}"? Le foto rimanenti non verranno eliminate.`)) return;

    const { error } = await supabase.from('groups').delete().eq('id', groupId);

    if (error) {
      alert('Errore eliminazione gruppo: ' + error.message);
    } else {
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
      if (activeFilter === groupId) setActiveFilter('ALL');
    }
  };

  // 3. Upload Foto in un Gruppo
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return alert('Seleziona una foto!');

    setUploading(true);

    try {
      const fileExt = selectedFile.name.split('.').pop()?.toLowerCase();
      const cleanFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('portfolio-images')
        .upload(cleanFileName, selectedFile, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('portfolio-images')
        .getPublicUrl(cleanFileName);

      const targetGroup = groups.find((g) => g.id === selectedGroupId);
      const defaultTitle = selectedFile.name.substring(0, selectedFile.name.lastIndexOf('.')) || selectedFile.name;
      const finalTitle = title.trim() ? title.trim() : defaultTitle;

      const { data: newPhoto, error: dbError } = await supabase
        .from('photos')
        .insert([
          {
            public_url: urlData.publicUrl,
            storage_path: cleanFileName,
            title: finalTitle,
            group_id: selectedGroupId || null,
            collection: targetGroup ? targetGroup.name : 'General',
          },
        ])
        .select()
        .single();

      if (dbError) throw dbError;

      setTitle('');
      setSelectedFile(null);
      
      if (newPhoto) {
        const added = newPhoto as Photo;
        setPhotos((prev) => [added, ...prev]);
        // Inserisce subito la nuova foto in cima al feed
        setDisplayedPhotos((prev) => [
          { ...added, instanceId: `${added.id}-${Date.now()}` },
          ...prev,
        ]);
      }

      alert('Foto caricata con successo!');
    } catch (err: any) {
      console.error(err);
      alert('Errore durante il caricamento: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  // 4. Cambia Gruppo a una Foto Esistente
  const handleUpdatePhotoGroup = async (photoId: string, newGroupId: string) => {
    const targetGroup = groups.find((g) => g.id === newGroupId);

    const { error } = await supabase
      .from('photos')
      .update({
        group_id: newGroupId || null,
        collection: targetGroup ? targetGroup.name : 'General',
      })
      .eq('id', photoId);

    if (error) {
      alert('Errore spostamento foto: ' + error.message);
    } else {
      setPhotos((prev) =>
        prev.map((p) =>
          p.id === photoId
            ? { ...p, group_id: newGroupId, collection: targetGroup?.name }
            : p
        )
      );
      setDisplayedPhotos((prev) =>
        prev.map((p) =>
          p.id === photoId
            ? { ...p, group_id: newGroupId, collection: targetGroup?.name }
            : p
        )
      );
    }
  };

  // 5. Elimina Foto dal DB e dallo Storage
  const handleDeletePhoto = async (photo: Photo) => {
    if (!confirm(`Eliminare definitivamente "${photo.title}"?`)) return;

    try {
      await supabase.from('photos').delete().eq('id', photo.id);
      
      const path = photo.public_url.split('/portfolio-images/')[1];
      if (path) {
        await supabase.storage.from('portfolio-images').remove([path]);
      }

      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
      setDisplayedPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    } catch (err: any) {
      alert('Errore eliminazione: ' + err.message);
    }
  };

  const poolSize = getFilteredPool().length;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-6 md:p-12 font-mono text-xs">
      
      {/* HEADER */}
      <div className="flex justify-between items-center border-b border-neutral-800 pb-4 mb-8">
        <h1 className="text-sm font-bold tracking-widest uppercase flex items-center gap-2">
          <Layers size={16} /> GESTORE ARCHIVIO & GRUPPI
        </h1>
        <a href="/" className="text-neutral-400 hover:text-white transition-colors">
          &larr; TORNA ALLA HOME
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLONNA SINISTRA: CREA GRUPPI & UPLOAD */}
        <div className="space-y-6">
          
          {/* SEZIONE 1: CREA GRUPPO */}
          <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-sm">
            <h2 className="text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2 text-white">
              <Plus size={14} /> Crea Nuovo Gruppo
            </h2>
            <form onSubmit={handleCreateGroup} className="space-y-3">
              <div>
                <label className="block text-neutral-400 mb-1 uppercase">Nome Gruppo</label>
                <input
                  type="text"
                  placeholder="es. CAMPAIGNS_2026"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 p-2 text-white rounded-xs focus:outline-none uppercase"
                />
              </div>
              <div>
                <label className="block text-neutral-400 mb-1 uppercase">Note / Descrizione</label>
                <input
                  type="text"
                  placeholder="Note facoltative"
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 p-2 text-white rounded-xs focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-neutral-100 text-black font-bold p-2.5 uppercase hover:bg-neutral-300 transition-colors cursor-pointer"
              >
                Crea Gruppo
              </button>
            </form>
          </div>

          {/* SEZIONE 2: UPLOAD FOTO */}
          <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-sm">
            <h2 className="text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2 text-white">
              <Upload size={14} /> Carica Nuova Foto
            </h2>
            <form onSubmit={handleUpload} className="space-y-3">
              <div>
                <label className="block text-neutral-400 mb-1 uppercase">Seleziona Immagine</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full text-neutral-400 bg-neutral-950 border border-neutral-800 p-2 rounded-xs cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1 uppercase">Assegna al Gruppo</label>
                <select
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 p-2 text-white rounded-xs focus:outline-none uppercase"
                >
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                  <option value="">-- NESSUN GRUPPO --</option>
                </select>
              </div>

              <div>
                <label className="block text-neutral-400 mb-1 uppercase">Titolo Foto</label>
                <input
                  type="text"
                  placeholder="es. LOOK_01"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 p-2 text-white rounded-xs focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={uploading}
                className="w-full bg-white text-black font-bold p-3 uppercase hover:bg-neutral-200 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {uploading ? 'CARICAMENTO...' : 'CARICA NELL ARCHIVIO'}
              </button>
            </form>
          </div>

        </div>

        {/* COLONNA DESTRA: GALLERY CON FLUSSO INFINITO MISCHIATO */}
        <div className="lg:col-span-2">
          
          {/* BARRA FILTRI & PULSANTE RIMESCOLA */}
          <div className="flex flex-wrap justify-between items-center gap-2 pb-4 mb-4 border-b border-neutral-800">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setActiveFilter('ALL')}
                className={`px-3 py-1.5 uppercase font-bold text-[10px] rounded-xs transition-colors whitespace-nowrap cursor-pointer ${
                  activeFilter === 'ALL'
                    ? 'bg-white text-black'
                    : 'bg-neutral-900 text-neutral-400 hover:text-white'
                }`}
              >
                TUTTI ({photos.length})
              </button>

              {groups.map((g) => {
                const count = photos.filter((p) => p.group_id === g.id).length;
                return (
                  <div key={g.id} className="flex items-center">
                    <button
                      onClick={() => setActiveFilter(g.id)}
                      className={`px-3 py-1.5 uppercase font-bold text-[10px] rounded-xs transition-colors whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                        activeFilter === g.id
                          ? 'bg-white text-black'
                          : 'bg-neutral-900 text-neutral-400 hover:text-white'
                      }`}
                    >
                      {g.name} ({count})
                    </button>
                    {g.name !== 'GENERAL' && (
                      <button
                        onClick={() => handleDeleteGroup(g.id, g.name)}
                        className="text-neutral-600 hover:text-red-400 ml-1 p-1 cursor-pointer"
                        title="Elimina Gruppo"
                      >
                        &times;
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* PULSANTE RIMESCOLA MANUALE */}
            <button
              onClick={handleReshuffle}
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-[10px] uppercase rounded-xs transition-colors flex items-center gap-1.5 ml-auto cursor-pointer"
              title="Mischia di nuovo l'intera galleria"
            >
              <Shuffle size={12} /> SUPER MISCHIA
            </button>
          </div>

          {/* GALLERY GRID */}
          {loading ? (
            <p className="text-neutral-500 uppercase py-12 flex items-center gap-2">
              <Loader2 className="animate-spin" size={16} /> Caricamento archivio in corso...
            </p>
          ) : poolSize === 0 ? (
            <p className="text-neutral-500 uppercase py-12">Nessuna foto trovata in questo gruppo.</p>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {displayedPhotos.map((photo) => {
                  return (
                    <div
                      key={photo.instanceId}
                      className="bg-neutral-900 border border-neutral-800 rounded-sm overflow-hidden flex flex-col justify-between"
                    >
                      <div className="relative aspect-square bg-neutral-950 overflow-hidden">
                        <img
                          src={photo.public_url}
                          alt={photo.title}
                          loading="lazy"
                          className="w-full h-full object-contain p-2"
                        />
                      </div>

                      <div className="p-3 border-t border-neutral-800 space-y-2">
                        <div className="flex justify-between items-start gap-2">
                          <span className="font-bold truncate text-white uppercase">
                            {photo.title}
                          </span>
                          <button
                            onClick={() => handleDeletePhoto(photo)}
                            className="text-neutral-500 hover:text-red-400 transition-colors cursor-pointer"
                            title="Elimina Foto"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        {/* CAMBIA GRUPPO ALLA FOTO */}
                        <div className="flex items-center gap-1.5 pt-1">
                          <Folder size={12} className="text-neutral-500 shrink-0" />
                          <select
                            value={photo.group_id || ''}
                            onChange={(e) => handleUpdatePhotoGroup(photo.id, e.target.value)}
                            className="w-full bg-neutral-950 border border-neutral-800 text-[10px] text-neutral-300 p-1 rounded-xs uppercase focus:outline-none"
                          >
                            {groups.map((g) => (
                              <option key={g.id} value={g.id}>
                                {g.name}
                              </option>
                            ))}
                            <option value="">-- NESSUN GRUPPO --</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* SENTINELLA INFINITE SCROLL INFINITO E CASUALE */}
              <div
                ref={observerTarget}
                className="w-full py-8 text-center flex justify-center items-center text-neutral-500"
              >
                <div className="flex items-center gap-2">
                  <Loader2 className="animate-spin" size={16} />
                  <span className="uppercase text-[10px] tracking-wider">
                    Generazione nuovo blocco casuale... ({displayedPhotos.length} foto caricate)
                  </span>
                </div>
              </div>
            </>
          )}

        </div>

      </div>
    </div>
  );
}