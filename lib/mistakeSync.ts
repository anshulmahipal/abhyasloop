import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { logger } from './logger';

const PENDING_MISTAKES_KEY = 'pending_mistakes';

export interface MistakeRecord {
  user_id: string;
  question_id: string | number;
}

/**
 * Saves mistakes to AsyncStorage queue and attempts to sync to Supabase.
 * If sync fails, mistakes remain in AsyncStorage for retry later.
 * 
 * @param userId - The user's ID
 * @param mistakes - Array of mistake records to save
 */
export async function saveMistakes(userId: string, mistakes: MistakeRecord[]): Promise<void> {
  if (!mistakes || mistakes.length === 0) {
    return;
  }

  try {
    // Step A: Retrieve current pending_mistakes queue from AsyncStorage
    const existingData = await AsyncStorage.getItem(PENDING_MISTAKES_KEY);
    let pendingMistakes: MistakeRecord[] = [];

    if (existingData) {
      try {
        pendingMistakes = JSON.parse(existingData) as MistakeRecord[];
        // Validate it's an array
        if (!Array.isArray(pendingMistakes)) {
          pendingMistakes = [];
        }
      } catch (parseError) {
        console.error('Error parsing pending mistakes from AsyncStorage:', parseError);
        logger.error('Failed to parse pending mistakes', parseError);
        // Reset to empty array if parsing fails
        pendingMistakes = [];
      }
    }

    // Step B: Append new mistakes to queue and save back to AsyncStorage
    // Filter out duplicates based on user_id and question_id
    const existingSet = new Set(
      pendingMistakes.map(m => `${m.user_id}:${m.question_id}`)
    );
    
    const newMistakes = mistakes.filter(
      m => !existingSet.has(`${m.user_id}:${m.question_id}`)
    );

    const updatedQueue = [...pendingMistakes, ...newMistakes];
    await AsyncStorage.setItem(PENDING_MISTAKES_KEY, JSON.stringify(updatedQueue));

    logger.info('Mistakes queued locally', {
      newMistakes: newMistakes.length,
      totalPending: updatedQueue.length,
      userId,
    });

    // Step C: Attempt to upload entire queue to Supabase
    try {
      const { error: upsertError } = await supabase
        .from('mistakes')
        .upsert(updatedQueue, {
          onConflict: 'user_id, question_id',
          ignoreDuplicates: false,
        });

      // Step D: Success - Clear AsyncStorage queue
      if (!upsertError) {
        await AsyncStorage.removeItem(PENDING_MISTAKES_KEY);
        logger.info('Mistakes synced successfully', {
          count: updatedQueue.length,
          userId,
        });
      } else {
        // Step E: Fail - Keep data in AsyncStorage for next try
        console.error('Error syncing mistakes to Supabase:', upsertError);
        logger.error('Failed to sync mistakes, keeping in queue', upsertError);
        // Data remains in AsyncStorage for retry
      }
    } catch (syncError) {
      // Step E: Fail/Slow Net - Catch error and do nothing
      // Data remains in AsyncStorage for next try
      console.error('Error syncing mistakes (network/timeout):', syncError);
      logger.error('Failed to sync mistakes, keeping in queue', syncError);
    }
  } catch (storageError) {
    // If AsyncStorage operations fail, log but don't throw
    console.error('Error accessing AsyncStorage for mistake sync:', storageError);
    logger.error('Failed to queue mistakes locally', storageError);
  }
}

/**
 * Syncs pending mistakes from AsyncStorage to Supabase.
 * Call this on app start or when network connectivity is restored.
 * 
 * @returns Promise that resolves when sync attempt completes
 */
export async function syncPendingMistakes(): Promise<void> {
  try {
    // Check AsyncStorage for pending items
    const pendingData = await AsyncStorage.getItem(PENDING_MISTAKES_KEY);
    
    if (!pendingData) {
      // No pending mistakes
      return;
    }

    let pendingMistakes: MistakeRecord[];
    try {
      pendingMistakes = JSON.parse(pendingData) as MistakeRecord[];
      if (!Array.isArray(pendingMistakes) || pendingMistakes.length === 0) {
        // Invalid or empty data, clear it
        await AsyncStorage.removeItem(PENDING_MISTAKES_KEY);
        return;
      }
    } catch (parseError) {
      console.error('Error parsing pending mistakes during sync:', parseError);
      // Clear corrupted data
      await AsyncStorage.removeItem(PENDING_MISTAKES_KEY);
      return;
    }

    logger.info('Syncing pending mistakes', {
      count: pendingMistakes.length,
    });

    // Attempt to upload to Supabase
    const { error: upsertError } = await supabase
      .from('mistakes')
      .upsert(pendingMistakes, {
        onConflict: 'user_id, question_id',
        ignoreDuplicates: false,
      });

    if (!upsertError) {
      // Success - Clear AsyncStorage
      await AsyncStorage.removeItem(PENDING_MISTAKES_KEY);
      logger.info('Pending mistakes synced successfully', {
        count: pendingMistakes.length,
      });
    } else {
      // Fail - Keep data in AsyncStorage for next try
      console.error('Error syncing pending mistakes:', upsertError);
      logger.error('Failed to sync pending mistakes, keeping in queue', upsertError);
    }
  } catch (error) {
    // Catch any errors (network, timeout, etc.) and keep data in AsyncStorage
    console.error('Error during mistake sync:', error);
    logger.error('Failed to sync pending mistakes', error);
  }
}

/**
 * Gets the count of pending mistakes in AsyncStorage.
 * Useful for showing a badge or notification.
 * 
 * @returns Promise resolving to the count of pending mistakes
 */
export async function getPendingMistakesCount(): Promise<number> {
  try {
    const pendingData = await AsyncStorage.getItem(PENDING_MISTAKES_KEY);
    if (!pendingData) {
      return 0;
    }

    const pendingMistakes = JSON.parse(pendingData) as MistakeRecord[];
    if (!Array.isArray(pendingMistakes)) {
      return 0;
    }

    return pendingMistakes.length;
  } catch (error) {
    console.error('Error getting pending mistakes count:', error);
    return 0;
  }
}
