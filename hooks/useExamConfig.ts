import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

interface Exam {
  id: string;
  name: string;
  is_active: boolean;
  sort_order: number;
  [key: string]: any; // Allow additional fields
}

const CACHE_KEY = 'exam_config_cache';
const TIMESTAMP_KEY = 'last_fetch_time';
const CACHE_DURATION_HOURS = 24;

export function useExamConfig() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFromSupabase = async () => {
    try {
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) {
        throw error;
      }

      if (data) {
        setExams(data);
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
        await AsyncStorage.setItem(TIMESTAMP_KEY, Date.now().toString());
        console.log('Config synced from server ☁️');
      }
    } catch (error) {
      console.error('Failed to fetch exam config:', error);
      
      // If error and no cache exists, set empty array as fallback
      const cachedData = await AsyncStorage.getItem(CACHE_KEY);
      if (!cachedData) {
        setExams([]);
      }
    }
  };

  useEffect(() => {
    const loadConfig = async () => {
      try {
        // Load cache first
        const [cachedData, cachedTimestamp] = await Promise.all([
          AsyncStorage.getItem(CACHE_KEY),
          AsyncStorage.getItem(TIMESTAMP_KEY),
        ]);

        // If cache exists, set exams immediately for fast UI
        if (cachedData) {
          try {
            const parsedData = JSON.parse(cachedData);
            setExams(parsedData);
          } catch (parseError) {
            console.error('Failed to parse cached exam config:', parseError);
          }
        }

        // Check if we need to fetch from server
        const shouldFetch = !cachedTimestamp || !cachedData;
        let hoursDiff = 0;

        if (cachedTimestamp) {
          const lastFetchTime = parseInt(cachedTimestamp, 10);
          const now = Date.now();
          hoursDiff = (now - lastFetchTime) / (1000 * 60 * 60);
        }

        if (shouldFetch || hoursDiff > CACHE_DURATION_HOURS) {
          await fetchFromSupabase();
        }
      } catch (error) {
        console.error('Failed to load exam config:', error);
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, []);

  const refreshConfig = async () => {
    setLoading(true);
    await fetchFromSupabase();
    setLoading(false);
  };

  return { exams, loading, refreshConfig };
}
