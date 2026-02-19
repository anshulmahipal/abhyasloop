import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const EMERALD_600 = '#059669';
const GRAY_400 = '#9ca3af';
const NAV_HEIGHT = 70;
const HERO_SIZE = 60;
const HERO_TOP = -30;
const HERO_BORDER = 6;

const navItems: { route: string; label: string; icon: keyof typeof Ionicons.glyphMap; iconOutline: keyof typeof Ionicons.glyphMap }[] = [
  { route: '/(protected)/dashboard', label: 'Home', icon: 'home', iconOutline: 'home-outline' },
  { route: '/(protected)/leaderboard', label: 'Search', icon: 'search', iconOutline: 'search-outline' },
  { route: '/(protected)/profile', label: 'Profile', icon: 'person', iconOutline: 'person-outline' },
  { route: '/(protected)/settings', label: 'Settings', icon: 'settings', iconOutline: 'settings-outline' },
];

export function MobileNav() {
  const router = useRouter();
  const segments = useSegments();
  const activeSegment = segments[1] ?? 'dashboard';

  const isActive = (route: string) => {
    const segment = route.replace('/(protected)/', '');
    return activeSegment === segment;
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {navItems.slice(0, 2).map(({ route, label, icon, iconOutline }) => {
          const active = isActive(route);
          return (
            <Pressable
              key={route + label}
              onPress={() => router.push(route as any)}
              style={styles.cell}
            >
              <Ionicons
                name={active ? icon : iconOutline}
                size={24}
                color={active ? EMERALD_600 : GRAY_400}
              />
              <Text style={[styles.label, active && styles.labelActive]}>
                {label}
              </Text>
            </Pressable>
          );
        })}

        <View style={styles.cell}>
          <Pressable
            onPress={() => router.push('/(protected)/quiz/config' as any)}
            style={({ pressed }) => [styles.heroButton, pressed && { opacity: 0.9 }]}
          >
            <Ionicons name="play" size={28} color="#ffffff" />
          </Pressable>
        </View>

        {navItems.slice(2, 4).map(({ route, label, icon, iconOutline }) => {
          const active = isActive(route);
          return (
            <Pressable
              key={route + label}
              onPress={() => router.push(route as any)}
              style={styles.cell}
            >
              <Ionicons
                name={active ? icon : iconOutline}
                size={24}
                color={active ? EMERALD_600 : GRAY_400}
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
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: NAV_HEIGHT,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    ...(Platform.OS === 'android'
      ? { elevation: 10 }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
        }),
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: GRAY_400,
  },
  labelActive: {
    color: EMERALD_600,
  },
  heroButton: {
    position: 'absolute',
    top: HERO_TOP,
    alignSelf: 'center',
    width: HERO_SIZE,
    height: HERO_SIZE,
    borderRadius: HERO_SIZE / 2,
    backgroundColor: EMERALD_600,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: HERO_BORDER,
    borderColor: '#ffffff',
    ...(Platform.OS === 'android'
      ? { elevation: 6 }
      : {
          shadowColor: EMERALD_600,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.35,
          shadowRadius: 6,
        }),
  },
});
