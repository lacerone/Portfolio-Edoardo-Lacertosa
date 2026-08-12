'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { Upload, Trash2, Folder, Plus, Layers, Loader2, LogOut, Lock, Star } from 'lucide-react';

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
  is_cover?: boolean; // Campo Copertina
}

const supabase = createClient();

function getOptimizedUrl(originalUrl: string, width: number = 500) {
  if (!originalUrl) return '';
  if (originalUrl.includes('/storage/v1/object/public/')) {
    return originalUrl.replace(
      '/storage/v1/object/public/',
      '/storage/v1/render/image/public/'
    ) + `?width=${width}&quality=75&resize=contain`;
  }
  return originalUrl;
}

export default function AdminPage() {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [title, setTitle] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');

  const [activeFilter, setActiveFilter] = useState<string>('ALL');

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (mounted) {
        setUser(user);
        setAuthLoading(false);
      }
    };

    checkAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setUser(session?.user ?? null);
        setAuthLoading(false);
      }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoginError('Credenziali errate: ' + error.message);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const fetchData = useCallback(async () => {
    setLoading(true);

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

    const { data: photosData } = await supabase
      .from('photos')
      .select('*')
      .order('created_at', { ascending: false });

    if (photosData) {
      setPhotos(photosData as Photo[]);
    }

    setLoading(false);
  }, [selectedGroupId]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, fetchData]);

  const filteredPhotos = photos.filter((p) => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'UNGROUPED') return !p.group_id;
    return p.group_id === activeFilter;
  });

  // GESTIONE COPERTINA (Max 1 Copertina per Gruppo)
  const handleSetCover = async (photo: Photo) => {
    if (!photo.group_id) {
      return alert('Assegna prima la foto ad un gruppo per poterla impostare come copertina!');
    }

    try {
      // 1. Disattiva la copertina precedente per TUTTE le foto del gruppo
      await supabase
        .from('photos')
        .update({ is_cover: false })
        .eq('group_id', photo.group_id);

      // 2. Imposta come copertina solo la foto selezionata
      const { error } = await supabase
        .from('photos')
        .update({ is_cover: true })
        .eq('id', photo.id);

      if (error) throw error;

      // Aggiorna lo stato locale
      setPhotos((prev) =>
        prev.map((p) => {
          if (p.group_id === photo.group_id) {
            return { ...p, is_cover: p.id === photo.id };
          }
          return p;
        })
      );
    } catch (err: any) {
      alert('Errore impostazione copertina: ' + err.message);
    }
  };

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

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    if (!confirm(`Eliminare il gruppo "${groupName}"?`)) return;

    const { error } = await supabase.from('groups').delete().eq('id', groupId);

    if (error) {
      alert('Errore eliminazione: ' + error.message);
    } else {
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
      if (activeFilter === groupId) setActiveFilter('ALL');
    }
  };

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
            is_cover: false,
          },
        ])
        .select()
        .single();

      if (dbError) throw dbError;

      setTitle('');
      setSelectedFile(null);
      
      if (newPhoto) {
        setPhotos((prev) => [newPhoto as Photo, ...prev]);
      }

      alert('Foto caricata!');
    } catch (err: any) {
      alert('Errore caricamento: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleUpdatePhotoGroup = async (photoId: string, newGroupId: string) => {
    const targetGroup = groups.find((g) => g.id === newGroupId);

    const { error } = await supabase
      .from('photos')
      .update({
        group_id: newGroupId || null,
        collection: targetGroup ? targetGroup.name : 'General',
        is_cover: false, // resetta copertina se spostata di gruppo
      })
      .eq('id', photoId);

    if (error) {
      alert('Errore spostamento foto: ' + error.message);
    } else {
      setPhotos((prev) =>
        prev.map((p) =>
          p.id === photoId
            ? { ...p, group_id: newGroupId, collection: targetGroup?.name, is_cover: false }
            : p
        )
      );
    }
  };

  const handleDeletePhoto = async (photo: Photo) => {
    if (!confirm(`Eliminare "${photo.title}"?`)) return;

    try {
      await supabase.from('photos').delete().eq('id', photo.id);
      
      const path = photo.public_url.split('/portfolio-images/')[1];
      if (path) {
        await supabase.storage.from('portfolio-images').remove([path]);
      }

      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    } catch (err: any) {
      alert('Errore eliminazione: ' + err.message);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-400 font-mono text-xs flex items-center justify-center">
        VERIFICA ACCESSO...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white font-mono text-xs flex items-center justify-center p-4 select-none">
        <form onSubmit={handleLogin} className="bg-neutral-900 border border-neutral-800 p-6 rounded-xs w-full max-w-sm space-y-4">
          <div className="flex items-center justify-center gap-2 border-b border-neutral-800 pb-3 mb-2">
            <Lock size={16} className="text-neutral-400" />
            <h1 className="font-bold text-xs uppercase tracking-widest text-center">ACCESSO RISERVATO</h1>
          </div>

          {loginError && (
            <div className="p-2 bg-red-950/50 border border-red-800 text-red-400 text-[10px] rounded-xs">
              {loginError}
            </div>
          )}

          <div>
            <label className="block text-neutral-400 mb-1 uppercase text-[10px]">Email Admin</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 p-2 text-white rounded-xs focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-neutral-400 mb-1 uppercase text-[10px]">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 p-2 text-white rounded-xs focus:outline-none"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-white text-black font-bold p-2.5 uppercase hover:bg-neutral-200 transition-colors cursor-pointer"
          >
            ENTRA NELL ARCHIVIO
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-6 md:p-12 font-mono text-xs">
      <div className="flex justify-between items-center border-b border-neutral-800 pb-4 mb-8">
        <h1 className="text-sm font-bold tracking-widest uppercase flex items-center gap-2">
          <Layers size={16} /> GESTORE ARCHIVIO & GRUPPI
        </h1>
        <div className="flex items-center gap-4">
          <a href="/" className="text-neutral-400 hover:text-white transition-colors">
            &larr; HOME
          </a>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 px-3 py-1.5 text-red-400 hover:text-red-300 transition-colors rounded-xs cursor-pointer uppercase"
          >
            <LogOut size={12} /> LOGOUT
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-6">
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

        <div className="lg:col-span-2">
          <div className="flex flex-wrap items-center gap-2 pb-4 mb-4 border-b border-neutral-800">
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

          {loading ? (
            <p className="text-neutral-500 uppercase py-12 flex items-center gap-2">
              <Loader2 className="animate-spin" size={16} /> Caricamento archivio...
            </p>
          ) : filteredPhotos.length === 0 ? (
            <p className="text-neutral-500 uppercase py-12">Nessuna foto trovata.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {filteredPhotos.map((photo) => {
                const thumbnailSrc = getOptimizedUrl(photo.public_url, 500);

                return (
                  <div
                    key={photo.id}
                    className={`bg-neutral-900 border rounded-sm overflow-hidden flex flex-col justify-between transition-colors ${
                      photo.is_cover ? 'border-emerald-500/80 ring-1 ring-emerald-500/50' : 'border-neutral-800'
                    }`}
                  >
                    <div className="relative aspect-square bg-neutral-950 overflow-hidden">
                      <img
                        src={thumbnailSrc}
                        alt={photo.title}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-contain p-2"
                      />

                      {/* BADGE COPERTINA */}
                      {photo.is_cover && (
                        <div className="absolute top-2 left-2 bg-emerald-500 text-black font-bold text-[9px] px-2 py-0.5 uppercase tracking-widest flex items-center gap-1 shadow-md">
                          <Star size={10} className="fill-black" /> COPERTINA
                        </div>
                      )}
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

                      {/* PULSANTE SET COPERTINA */}
                      {photo.group_id && (
                        <button
                          onClick={() => handleSetCover(photo)}
                          disabled={photo.is_cover}
                          className={`w-full py-1 px-2 text-[9px] font-bold uppercase rounded-xs transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                            photo.is_cover
                              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50 cursor-default'
                              : 'bg-neutral-950 hover:bg-neutral-800 text-neutral-400 border border-neutral-800'
                          }`}
                        >
                          <Star size={10} className={photo.is_cover ? 'fill-emerald-400' : ''} />
                          {photo.is_cover ? 'COPERTINA ATTIVA' : 'IMPOSTA COPERTINA'}
                        </button>
                      )}

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
          )}
        </div>
      </div>
    </div>
  );
}