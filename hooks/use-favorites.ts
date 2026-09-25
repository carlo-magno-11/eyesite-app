import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';

export function useFavorites() {
  const [favs, setFavs] = useState<string[]>([]);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setFavs([]); return; }
    const { data, error } = await supabase
      .from('favoritos')
      .select('property_id')
      .eq('user_id', user.id);
    if (error) {
      console.warn('[favorites] load:', error.message);
      return;
    }
    setFavs((data ?? []).map((row) => row.property_id).filter(Boolean) as string[]);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const toggleFav = useCallback(async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const wasFavorite = favs.includes(id);
    setFavs((prev) => wasFavorite ? prev.filter((f) => f !== id) : [...prev, id]);
    try {
      if (wasFavorite) {
        const { error } = await supabase.from('favoritos').delete().eq('user_id', user.id).eq('property_id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('favoritos').insert({ user_id: user.id, property_id: id });
        if (error && error.code !== '23505') throw error;
      }

      void supabase.rpc('track_property_event', {
        p_property_id: id,
        p_event_type: 'favorite',
        p_source: 'app',
        p_metadata: { active: !wasFavorite },
      }).catch(() => {});

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e: any) {
      console.warn('[favorites] toggle:', e?.message || e);
      await load();
    }
  }, [favs, load]);

  return { favs, toggleFav, isFav: (id: string) => favs.includes(id) };
}
