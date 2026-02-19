/**
 * Central design tokens for React Native/Expo app.
 * Import from here instead of hardcoding colors or spacing.
 */
export const colors = {
  background: '#ffffff',
  backgroundMuted: '#f9fafb',
  backgroundSubtle: '#f3f4f6',
  listCard: '#f7f7f9',
  listCardBorder: '#e0e0e0',
  mockTestIconBg: '#f5f5f5',
  mockTestIcon: '#166534',
  mockTestChevron: '#9ca3af',
  border: '#e5e7eb',
  text: '#111827',
  textSecondary: '#374151',
  listItemText: '#4a4a4a',
  textMuted: '#6b7280',
  primary: '#059669',
  primaryLight: '#d1fae5',
  card: '#ffffff',
  cardBorder: '#e5e7eb',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  screen: 20,
  screenBottom: 32,
} as const;

export const typography = {
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: colors.text,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.text,
  },
  cardLabel: {
    fontSize: 14,
    color: colors.textMuted,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: colors.primary,
  },
  body: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  listItem: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: colors.listItemText,
  },
  mockTestCardTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.text,
  },
  mockTestCardSubtitle: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: colors.textMuted,
  },
  placeholder: {
    fontSize: 16,
    color: colors.textMuted,
  },
} as const;

export const radii = {
  sm: 8,
  md: 12,
} as const;

/** Subtle elevation for list/cards (e.g. Recent Mock Tests). */
export const shadow = {
  listCard: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  /** White elevated card (e.g. MockTestInfoCard). */
  mockTestCard: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
} as const;
