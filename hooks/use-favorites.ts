import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
export function useFavorites(){const [favs,setFavs]=useState<string[]>([]);useFocusEffect(useCallback(()=>{AsyncStorage.getItem('favs').then(v=>{if(v) setFavs(JSON.parse(v))})},[]));const toggleFav=async(id:string)=>{const nf=favs.includes(id)?favs.filter(f=>f!==id):[...favs,id];setFavs(nf);await AsyncStorage.setItem('favs',JSON.stringify(nf));Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);};return {favs,toggleFav,isFav:(id:string)=>favs.includes(id)};}
