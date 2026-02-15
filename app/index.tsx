import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, useWindowDimensions, Image } from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { FeatureCard } from '../components/FeatureCard';
import { logger } from '../lib/logger';

const CONTAINER_MAX_WIDTH = 800;
const MOBILE_BREAKPOINT = 768;

export default function LandingPage() {
  const { width } = useWindowDimensions();
  const isMobile = width < MOBILE_BREAKPOINT;

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      <View style={[styles.container, isMobile ? styles.containerMobile : styles.containerDesktop]}>
        <View style={[styles.heroSection, isMobile ? styles.heroSectionMobile : styles.heroSectionDesktop]}>
          <View style={styles.heroBrand}>
            <Image source={require('../assets/logo.png')} style={styles.heroLogo} resizeMode="contain" accessibilityLabel="TyariWale logo" />
            <View style={styles.heroBrandTextWrap}>
              <Text style={styles.heroBrandText}>TyariWale</Text>
              <View style={styles.heroSloganRow}>
                <Ionicons name="school-outline" size={18} color="#059669" style={styles.heroSloganIcon} />
                <Text style={styles.heroSlogan}>For the aspirants, by the aspirants</Text>
              </View>
            </View>
          </View>
          <Text style={[styles.heroTitle, isMobile && styles.heroTitleMobile]}>
            Master Govt Exams with Infinite Practice
          </Text>
          <Text style={[styles.heroSubtitle, isMobile && styles.heroSubtitleMobile]}>
            Prepare smarter, practice endlessly, and ace your government exams with AI-powered questions and instant feedback.
          </Text>
          <Link href="/auth" asChild>
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={() => {
                logger.userAction('Get Started Button Pressed', undefined, {
                  screen: 'landing',
                  action: 'navigate_to_login',
                });
              }}
            >
              <Text style={styles.ctaButtonText}>Get Started</Text>
            </TouchableOpacity>
          </Link>
        </View>

        <View style={styles.featuresSection}>
          <Text style={[styles.featuresTitle, isMobile && styles.featuresTitleMobile]}>
            Why Choose Tyariwale?
          </Text>
          <View style={[styles.featuresGrid, isMobile && styles.featuresGridMobile]}>
            <FeatureCard
              icon="🤖"
              title="AI Logic"
              description="Advanced AI algorithms generate questions that match real exam patterns and difficulty levels."
              isMobile={isMobile}
            />
            <FeatureCard
              icon="📊"
              title="Exam Patterns"
              description="Questions designed based on actual government exam patterns and previous year papers."
              isMobile={isMobile}
            />
            <FeatureCard
              icon="⚡"
              title="Instant Results"
              description="Get immediate feedback with detailed explanations and performance analytics after each quiz."
              isMobile={isMobile}
            />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    width: '100%',
    maxWidth: CONTAINER_MAX_WIDTH,
    alignSelf: 'center',
  },
  containerMobile: {
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  containerDesktop: {
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  heroSection: {
    alignItems: 'center',
  },
  heroSectionMobile: {
    marginBottom: 50,
    paddingTop: 40,
  },
  heroSectionDesktop: {
    marginBottom: 80,
    paddingTop: 60,
  },
  heroBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 28,
  },
  heroLogo: {
    width: 72,
    height: 72,
  },
  heroBrandTextWrap: {
    flex: 1,
  },
  heroBrandText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#059669',
    marginBottom: 4,
  },
  heroSloganRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroSloganIcon: {
    marginRight: 6,
  },
  heroSlogan: {
    fontSize: 15,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  heroTitle: {
    fontSize: 48,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 56,
    letterSpacing: -0.5,
  },
  heroTitleMobile: {
    fontSize: 32,
    lineHeight: 40,
  },
  heroSubtitle: {
    fontSize: 20,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 30,
    paddingHorizontal: 20,
  },
  heroSubtitleMobile: {
    fontSize: 16,
    lineHeight: 24,
    paddingHorizontal: 0,
  },
  ctaButton: {
    backgroundColor: '#059669',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
    shadowColor: '#059669',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s',
      },
    }),
  },
  ctaButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  featuresSection: {
    marginTop: 20,
  },
  featuresTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 40,
  },
  featuresTitleMobile: {
    fontSize: 28,
  },
  featuresGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  featuresGridMobile: {
    flexDirection: 'column',
  },
});
