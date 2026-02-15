import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Linking, Alert, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

export default function SettingsPage() {
  const router = useRouter();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const handleLogout = async () => {
    // Web-specific confirmation
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const confirmed = window.confirm('Are you sure you want to log out?');
      if (!confirmed) {
        return;
      }
      
      try {
        await supabase.auth.signOut();
      } catch (error) {
        console.error('Error signing out:', error);
        window.alert('Failed to log out. Please try again.');
      }
      return;
    }
    
    // Native platforms use Alert
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.auth.signOut();
            } catch (error) {
              console.error('Error signing out:', error);
              Alert.alert('Error', 'Failed to log out. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleSendFeedback = () => {
    router.push('/(protected)/feedback');
  };

  const handlePrivacyPolicy = () => {
    Linking.openURL('https://google.com').catch((err) => {
      console.error('Failed to open URL:', err);
      Alert.alert('Error', 'Unable to open browser.');
    });
  };

  const handleTermsOfService = () => {
    Linking.openURL('https://google.com').catch((err) => {
      console.error('Failed to open URL:', err);
      Alert.alert('Error', 'Unable to open browser.');
    });
  };

  const renderSection = (title: string, children: React.ReactNode) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );

  const renderListItem = (
    icon: string,
    title: string,
    onPress?: () => void,
    rightElement?: React.ReactNode,
    showArrow: boolean = true
  ) => (
    <TouchableOpacity
      style={styles.listItem}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <View style={styles.listItemLeft}>
        <Ionicons name={icon as any} size={22} color="#666" style={styles.listItemIcon} />
        <Text style={styles.listItemText}>{title}</Text>
      </View>
      {rightElement && <View style={styles.listItemRight}>{rightElement}</View>}
      {showArrow && onPress && (
        <Ionicons name="chevron-forward" size={20} color="#C0C0C0" />
      )}
    </TouchableOpacity>
  );

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
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Section 1: App Info */}
        {renderSection('App Info', (
          <View style={styles.appInfoItem}>
            <View style={styles.appLogo}>
              <Image source={require('../../assets/logo.png')} style={styles.appLogoImage} resizeMode="contain" accessibilityLabel="TyariWale logo" />
            </View>
            <View style={styles.appInfoText}>
              <Text style={styles.appName}>TyariWale</Text>
              <Text style={styles.appVersion}>v1.0.0</Text>
            </View>
          </View>
        ))}

        {/* Section 2: Account Actions */}
        {renderSection('Account', (
          <>
            {renderListItem(
              'person-outline',
              'Edit Profile',
              () => router.push('/(protected)/profile/edit')
            )}
            {renderListItem(
              'time-outline',
              'Quiz History',
              () => router.push('/(protected)/history')
            )}
            {renderListItem(
              'notifications-outline',
              'Notifications',
              undefined,
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: '#E0E0E0', true: '#059669' }}
                thumbColor="#ffffff"
              />,
              false
            )}
          </>
        ))}

        {/* Section 3: Support */}
        {renderSection('Support', (
          <>
            {renderListItem(
              'flag-outline',
              'Reported Questions',
              () => router.push('/(protected)/settings/reports')
            )}
            {renderListItem(
              'mail-outline',
              'Send Feedback',
              handleSendFeedback
            )}
          </>
        ))}

        {/* Section 4: Legal */}
        {renderSection('Legal', (
          <>
            {renderListItem(
              'lock-closed-outline',
              'Privacy Policy',
              handlePrivacyPolicy
            )}
            {renderListItem(
              'document-text-outline',
              'Terms of Service',
              handleTermsOfService
            )}
          </>
        ))}

        {/* Section 5: Danger Zone */}
        {renderSection('Danger Zone', (
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Text style={styles.logoutButtonText}>Log Out</Text>
          </TouchableOpacity>
        ))}

        {/* App Version */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>Version 1.0.0 (Build 1)</Text>
        </View>
      </ScrollView>
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
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Extra padding to account for bottom tab bar
  },
  section: {
    marginTop: 32,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  appInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  appLogo: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  appLogoImage: {
    width: 44,
    height: 44,
  },
  appInfoText: {
    flex: 1,
  },
  appName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 14,
    color: '#666',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5E5',
  },
  listItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  listItemIcon: {
    marginRight: 12,
  },
  listItemText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  listItemRight: {
    marginRight: 8,
  },
  logoutButton: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F44336',
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  versionText: {
    fontSize: 12,
    color: '#999',
  },
});
