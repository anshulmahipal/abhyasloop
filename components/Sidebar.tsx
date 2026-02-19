import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const SIDEBAR_WIDTH = 250;
const EMERALD_600 = '#059669';
const GRAY_600 = '#4b5563';

const navItems: { href: string; label: string; icon: keyof typeof Ionicons.glyphMap; iconOutline: keyof typeof Ionicons.glyphMap }[] = [
  { href: '/(protected)/dashboard', label: 'Home', icon: 'home', iconOutline: 'home-outline' },
  { href: '/(protected)/leaderboard', label: 'Exams', icon: 'document-text', iconOutline: 'document-text-outline' },
  { href: '/(protected)/quiz/config', label: 'Mock Tests', icon: 'clipboard', iconOutline: 'clipboard-outline' },
  { href: '/(protected)/profile', label: 'Profile', icon: 'person', iconOutline: 'person-outline' },
  { href: '/(protected)/settings', label: 'Settings', icon: 'settings', iconOutline: 'settings-outline' },
];

export function Sidebar() {
  const router = useRouter();
  const segments = useSegments();
  const activeSegment = segments[1] ?? 'dashboard';
  const isQuizActive = segments[1] === 'quiz';

  const isActive = (href: string) => {
    const segment = href.replace('/(protected)/', '');
    return (
      activeSegment === segment ||
      (href.includes('quiz') && isQuizActive)
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.nav}>
        {navItems.map(({ href, label, icon, iconOutline }) => {
          const active = isActive(href);
          return (
            <Pressable
              key={href}
              onPress={() => router.push(href as any)}
              style={({ pressed }) => [
                styles.link,
                active && styles.linkActive,
                pressed && styles.linkPressed,
              ]}
            >
              <Ionicons
                name={active ? icon : iconOutline}
                size={20}
                color={active ? EMERALD_600 : GRAY_600}
              />
              <Text style={[styles.label, active && styles.labelActive]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SIDEBAR_WIDTH,
    height: '100%',
    backgroundColor: '#ffffff',
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
  },
  nav: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    gap: 4,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  linkActive: {
    backgroundColor: '#ecfdf5',
  },
  linkPressed: {
    opacity: 0.8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: GRAY_600,
  },
  labelActive: {
    color: EMERALD_600,
  },
});
