import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { logger } from '../../../lib/logger';

export default function EditProfilePage() {
  const { user, profile, session, refreshProfile } = useAuth();
  const router = useRouter();

  const [name, setName] = useState<string>('');
  const [image, setImage] = useState<string>('');
  const [uploading, setUploading] = useState<boolean>(false);

  // Pre-fill with current user's name and avatar
  useEffect(() => {
    if (profile) {
      setName(profile.full_name || '');
      setImage(profile.avatar_url || '');
    }
  }, [profile]);

  const pickImage = async () => {
    try {
      // Request media library permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Sorry, we need camera roll permissions to upload your avatar!'
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets[0]) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      logger.error('Failed to pick image', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const uploadAvatar = async (uri: string): Promise<string> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      // Generate unique file path
      const filePath = `${user.id}/${Date.now()}.jpg`;

      let fileData: Blob | ArrayBuffer;

      if (Platform.OS === 'web') {
        // For web, fetch the image and convert to Blob
        const response = await fetch(uri);
        fileData = await response.blob();
      } else {
        // For native, read file as base64 and convert to ArrayBuffer
        const fileInfo = await FileSystem.getInfoAsync(uri);
        if (!fileInfo.exists) {
          throw new Error('File does not exist');
        }

        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        // Convert base64 to ArrayBuffer
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        fileData = bytes.buffer;
      }

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, fileData, {
          contentType: 'image/jpeg',
          upsert: true, // Replace if exists
        });

      if (uploadError) {
        console.error('Error uploading avatar:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      if (!urlData?.publicUrl) {
        throw new Error('Failed to get public URL');
      }

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      logger.error('Failed to upload avatar', error);
      throw error;
    }
  };

  const handleSave = async () => {
    if (!user || !session) {
      Alert.alert('Error', 'Please sign in to update your profile.');
      return;
    }

    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name.');
      return;
    }

    try {
      setUploading(true);

      let finalAvatarUrl = image;

      // If image is a new local file (starts with 'file://' or is a data URI from picker)
      if (image && (image.startsWith('file://') || image.startsWith('data:'))) {
        // Upload the new image
        finalAvatarUrl = await uploadAvatar(image);
      }

      // Update database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: name.trim(),
          avatar_url: finalAvatarUrl || null,
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating profile:', updateError);
        logger.error('Failed to update profile', updateError);
        throw updateError;
      }

      // Refresh profile in AuthContext
      await refreshProfile();

      logger.userAction('Profile Updated', {
        name: name.trim(),
        hasAvatar: !!finalAvatarUrl,
      }, {});

      // Show success alert
      Alert.alert('Success', 'Profile updated successfully!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('Error saving profile:', error);
      logger.error('Failed to save profile', error);
      Alert.alert(
        'Error',
        error instanceof Error 
          ? error.message 
          : 'Failed to update profile. Please try again.'
      );
    } finally {
      setUploading(false);
    }
  };

  const displayImage = image || (profile?.avatar_url || null);
  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        {/* Avatar Circle */}
        <TouchableOpacity
          style={styles.avatarContainer}
          onPress={pickImage}
          disabled={uploading}
          activeOpacity={0.8}
        >
          {displayImage ? (
            <Image source={{ uri: displayImage }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.cameraIconOverlay}>
            <Ionicons name="camera" size={24} color="#ffffff" />
          </View>
        </TouchableOpacity>

        {/* Name Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
            placeholderTextColor="#999"
            editable={!uploading}
            autoCapitalize="words"
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, uploading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={uploading}
          activeOpacity={0.8}
        >
          {uploading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 32,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#ffffff',
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FF512F',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#ffffff',
  },
  avatarText: {
    fontSize: 48,
    fontWeight: '700',
    color: '#ffffff',
  },
  cameraIconOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF512F',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  input: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  saveButton: {
    width: '100%',
    backgroundColor: '#FF512F',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
});
