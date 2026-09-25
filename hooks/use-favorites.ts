import { useCallback, useEffect, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';

let favoriteSnapshot: string[] = [];
let loadedUserId: string | null = null;
let loadPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function setSnapshot(next: string[], userId: string | null = loadedUserId) {
  favoriteSnapshot = [...new Set(next)];
  loadedUserId = userId;
  emit();
}

async function loadFavorites(force = false) {
  if (loadPromise && !force) return loadPromise;

  loadPromise = (async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setSnapshot([], null);
      return;
    }

    if (!force && loadedUserId === user.id) return;

    const { data, error } = await supabase
      .from('favoritos')
      .select('property_id')
      .eq('user_id', user.id);

    if (error) {
      console.warn('[favorites] load:', error.message);
      return;
    }

    setSnapshot(
      (data ?? [])
        .map((row) => row.property_id)
        .filter(Boolean) as string[],
      user.id,
    );
  })().finally(() => {
    loadPromise = null;
  });

  return loadPromise;
}

export function useFavorites() {
  const [, forceRender] = useState(0);

  useEffect(() => {
    const listener = () => forceRender((value) => value + 1);
    listeners.add(listener);
    void loadFavorites();
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const toggleFav = useCallback(async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const wasFavorite = favoriteSnapshot.includes(id);
    const optimistic = wasFavorite
      ? favoriteSnapshot.filter((favoriteId) => favoriteId !== id)
      : [...favoriteSnapshot, id];

    setSnapshot(optimistic, user.id);

    try {
      if (wasFavorite) {
        const { error } = await supabase
          .from('favoritos')
          .delete()
          .eq('user_id', user.id)
          .eq('property_id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('favoritos')
          .insert({ user_id: user.id, property_id: id });
        if (error && error.code !== '23505') throw error;
      }

      void supabase.rpc('track_property_event', {
        p_property_id: id,
        p_event_type: 'favorite',
        p_source: 'app',
        p_metadata: { active: !wasFavorite },
      }).catch(() => {
        // Analytics must never block the favorite action.
      });

      if (process.env.EXPO_OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (e) {
      console.warn('[favorites] toggle:', e instanceof Error ? e.message : e);
      await loadFavorites(true);
    }
  }, []);

  return {
    favs: favoriteSnapshot,
    toggleFav,
    isFav: (id: string) => favoriteSnapshot.includes(id),
  };
}
