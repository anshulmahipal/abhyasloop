import { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, useWindowDimensions, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useExamConfig } from '../../hooks/useExamConfig';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { posthog } from '../../lib/posthog';

const GAP = 12;
const BRAND = '#059669';
const BRAND_LIGHT = '#ecfdf5';

const EXAMS_FALLBACK = [
  { id: 'gk', title: 'General Knowledge', icon: 'book', topics: ['General Knowledge'] },
  { id: 'math', title: 'Mathematics', icon: 'calculator', topics: ['Algebra', 'Geometry', 'Calculus'] },
  { id: 'science', title: 'Science', icon: 'flask', topics: ['Physics', 'Chemistry', 'Biology'] },
  { id: 'tech', title: 'Tech', icon: 'laptop', topics: ['Programming', 'Data Science'] },
];

const MAPPED_ICONS: Record<string, string> = {
  'shield-checkmark': /police|constable|si\b|daroga|prohibition/i,
  'star': /sub.?inspector|si\s|inspector/i,
  'radio': /radio|operator/i,
  'scale': /judicial|hjs|law/i,
  'briefcase': /engineer|trainee|executive|management|officer|graduate/i,
  'flash': /coal|gail|oil|ongc|iocl|bpcl|hpcl|power|grid/i,
  'train': /rail|rrb|ntpc|rites|steel|sail|dock|hal|bel|nlc|india limited/i,
  'water': /water|drop|gail/i,
  'shield': /defence|army|navy|afcat|nda|cds|agniveer/i,
  'school': /teaching|ctet|ugc|kvs|tet/i,
  'card': /bank|rbi|sbi|ibps|lic/i,
  'document-text': /ssc|cgl|chsl|mts|cpo|gd/i,
  'ribbon': /upsc|ias|civil|uppsc|bpsc|mpsc/i,
};

const HELP_ICON_PATTERN = /^help(-|$)/i;

/** Returns a specific icon name or null if no mapping (use letter fallback). Never returns help/? icons. */
function getMappedIcon(item: any): string | null {
  const icon = item.icon;
  if (icon && typeof icon === 'string' && !HELP_ICON_PATTERN.test(icon)) return icon;
  const t = ((item.title || item.name) || '').toLowerCase();
  for (const [name, regex] of Object.entries(MAPPED_ICONS)) {
    if (regex.test(t)) return name;
  }
  return null;
}

function getFirstLetter(item: any): string {
  const name = item.title || item.name || '';
  const first = name.trim().charAt(0);
  return first ? first.toUpperCase() : 'E';
}

export default function AllExamsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { profile, user, refreshProfile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExams, setSelectedExams] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const { exams, loading } = useExamConfig();
  const categories = exams.length > 0 ? exams : EXAMS_FALLBACK;

  useEffect(() => {
    const existing = (profile?.target_exams && profile.target_exams.length > 0)
      ? profile.target_exams
      : [];
    setSelectedExams(existing);
  }, [profile?.target_exams]);

  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((item: any) => {
      const title = (item.title || item.name || '').toLowerCase();
      return title.includes(q);
    });
  }, [categories, searchQuery]);

  const numColumns = width >= 600 ? 4 : width >= 400 ? 3 : 2;
  const itemWidth = (width - 32 - GAP * (numColumns - 1)) / numColumns;

  const toggleSelection = (examName: string) => {
    setSelectedExams((prev) =>
      prev.includes(examName) ? prev.filter((e) => e !== examName) : [...prev, examName]
    );
  };

  const handleModifyGoals = async () => {
    if (!user) {
      Alert.alert('Error', 'Please sign in to update your goals.');
      return;
    }
    setIsSaving(true);
    try {
      const currentFocusValue = profile?.current_focus || null;
      const newFocus =
        selectedExams.length > 0
          ? selectedExams.includes(currentFocusValue || '')
            ? currentFocusValue
            : selectedExams[0]
          : null;
      const updateData: { target_exams: string[]; current_focus?: string | null } = {
        target_exams: selectedExams,
      };
      if (newFocus !== currentFocusValue) {
        updateData.current_focus = newFocus;
      }
      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);
      if (error) {
        console.error('Error saving target_exams:', error);
        Alert.alert('Error', 'Failed to save goals. Please try again.');
        return;
      }
      await refreshProfile();
      posthog.capture('goals_updated', {
        target_exams: selectedExams,
        exam_count: selectedExams.length,
      });
    } catch (err) {
      console.error('Modify goals error:', err);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.replace('/(protected)/dashboard')}
          style={styles.backButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All exams</Text>
        <View style={styles.headerSpacer} />
      </View>
      <Text style={styles.subtitle}>Tap to select exams for your goals, then tap Modify goals below</Text>

      <View style={styles.searchBarWrap}>
        <Ionicons name="search" size={20} color="#94a3b8" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search exams..."
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
      </View>

      {selectedExams.length > 0 && (
        <View style={styles.selectedGoalsSection}>
          <Text style={styles.selectedGoalsLabel}>
            Your selected goals ({selectedExams.length}) — tap to remove
          </Text>
          <View style={styles.selectedGoalsChips}>
            {selectedExams.map((examName) => (
              <TouchableOpacity
                key={examName}
                style={styles.selectedChip}
                onPress={() => toggleSelection(examName)}
                activeOpacity={0.7}
              >
                <Text style={styles.selectedChipText} numberOfLines={1}>{examName}</Text>
                <Ionicons name="close-circle" size={18} color={BRAND} style={styles.selectedChipIcon} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading && categories.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={BRAND} />
          </View>
        ) : (
          <View style={styles.gridWrapper}>
            {filteredCategories.map((item: any, index: number) => {
              const title = item.title || item.name || 'Unknown';
              const mappedIcon = getMappedIcon(item);
              const firstLetter = getFirstLetter(item);
              const isSelected = selectedExams.includes(title);
              const isLastInRow = (index + 1) % numColumns === 0 || index === filteredCategories.length - 1;
              return (
                <View
                  key={item.id || `all-exams-${index}`}
                  style={[
                    styles.gridItem,
                    { width: itemWidth, marginRight: isLastInRow ? 0 : GAP, marginBottom: GAP },
                  ]}
                >
                  <TouchableOpacity
                    style={[
                      styles.gridCard,
                      isSelected ? styles.gridCardSelected : styles.gridCardUnselected,
                    ]}
                    onPress={() => toggleSelection(title)}
                    activeOpacity={0.75}
                  >
                    {mappedIcon ? (
                      <View style={[styles.iconWrap, isSelected && styles.iconWrapSelected]}>
                        <Ionicons name={mappedIcon as any} size={22} color={isSelected ? '#22C55E' : BRAND} />
                      </View>
                    ) : (
                      <View style={[styles.letterWrap, isSelected && styles.iconWrapSelected]}>
                        <Text style={[styles.letterText, isSelected && styles.letterTextSelected]}>{firstLetter}</Text>
                      </View>
                    )}
                    <View style={styles.titleWrap}>
                      <Text style={[styles.gridCardTitle, isSelected && styles.gridCardTitleSelected]} numberOfLines={2}>{title}</Text>
                    </View>
                    {isSelected && (
                      <View style={styles.checkmarkWrap}>
                        <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.modifyGoalsButton, isSaving && styles.modifyGoalsButtonDisabled]}
          onPress={handleModifyGoals}
          disabled={isSaving}
          activeOpacity={0.8}
        >
          {isSaving ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.modifyGoalsButtonText}>Modify goals</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: BRAND,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 32,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1e293b',
  },
  selectedGoalsSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  selectedGoalsLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },
  selectedGoalsChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND_LIGHT,
    borderWidth: 1,
    borderColor: BRAND,
    borderRadius: 20,
    paddingVertical: 8,
    paddingLeft: 12,
    paddingRight: 6,
    maxWidth: '100%',
  },
  selectedChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#166534',
    maxWidth: 200,
  },
  selectedChipIcon: {
    marginLeft: 4,
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridItem: {},
  gridCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
  },
  gridCardUnselected: {
    backgroundColor: '#FFFFFF',
    borderColor: '#F3F4F6',
  },
  gridCardSelected: {
    backgroundColor: '#E8F5E9',
    borderColor: '#22C55E',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: BRAND_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  letterWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: BRAND_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  letterText: {
    fontSize: 18,
    fontWeight: '700',
    color: BRAND,
  },
  letterTextSelected: {
    color: '#22C55E',
  },
  iconWrapSelected: {
    backgroundColor: '#DCFCE7',
  },
  checkmarkWrap: {
    marginLeft: 6,
  },
  titleWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  gridCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    lineHeight: 20,
  },
  gridCardTitleSelected: {
    color: '#166534',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 32,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  modifyGoalsButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: BRAND,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modifyGoalsButtonDisabled: {
    opacity: 0.8,
  },
  modifyGoalsButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
  },
});
