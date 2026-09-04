import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type FavoritesContextType = {
  favorites: string[];
  toggleFavorite: (id: string) => Promise<void>;
  isFavorite: (id: string) => boolean;
  loading: boolean;
};

const FavoritesContext = createContext<FavoritesContextType>({
  favorites: [],
  toggleFavorite: async () => {},
  isFavorite: () => false,
  loading: true,
});

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase.from('favorites').select('property_id').eq('user_id', user.id);
      if (data) setFavorites(data.map((f: any) => f.property_id));
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (propertyId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const isFav = favorites.includes(propertyId);

    if (isFav) {
      setFavorites(prev => prev.filter(id => id !== propertyId));
      await supabase.from('favorites').delete().eq('user_id', user.id).eq('property_id', propertyId);
    } else {
      setFavorites(prev => [...prev, propertyId]);
      await supabase.from('favorites').insert({ user_id: user.id, property_id: propertyId });
    }
  };

  const isFavorite = (id: string) => favorites.includes(id);

  return (
    <FavoritesContext.Provider value={{ favorites, toggleFavorite, isFavorite, loading }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export const useFavorites = () => useContext(FavoritesContext);
export const useFavoritesContext = useFavorites;
export default FavoritesProvider;
