import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, useWindowDimensions } from 'react-native';
import { Link } from 'expo-router';

const containerMaxWidth = 800;

export default function LandingPage() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  return (
    <ScrollView 
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={[styles.container, { maxWidth: containerMaxWidth, paddingHorizontal: isMobile ? 20 : 40, paddingVertical: isMobile ? 40 : 60 }]}>
        {/* Hero Section */}
        <View style={[styles.heroSection, { marginBottom: isMobile ? 50 : 80, paddingTop: isMobile ? 40 : 60 }]}>
          <Text style={[styles.heroTitle, { fontSize: isMobile ? 32 : 48, lineHeight: isMobile ? 40 : 56 }]}>
            Master Govt Exams with Infinite Practice
          </Text>
          <Text style={[styles.heroSubtitle, { fontSize: isMobile ? 16 : 20, lineHeight: isMobile ? 24 : 30, paddingHorizontal: isMobile ? 0 : 20 }]}>
            Prepare smarter, practice endlessly, and ace your government exams with AI-powered questions and instant feedback.
          </Text>
          <Link href="/auth/login" asChild>
            <TouchableOpacity style={styles.ctaButton}>
              <Text style={styles.ctaButtonText}>Get Started</Text>
            </TouchableOpacity>
          </Link>
        </View>

        {/* Features Grid */}
        <View style={styles.featuresSection}>
          <Text style={[styles.featuresTitle, { fontSize: isMobile ? 28 : 36 }]}>Why Choose AbhyasLoop?</Text>
          <View style={[styles.featuresGrid, { flexDirection: isMobile ? 'column' : 'row' }]}>
            {/* Feature Card 1 */}
            <View style={[styles.featureCard, { marginBottom: isMobile ? 20 : 0, marginRight: isMobile ? 0 : 12 }]}>
              <View style={styles.featureIcon}>
                <Text style={styles.featureIconText}>🤖</Text>
              </View>
              <Text style={styles.featureTitle}>AI Logic</Text>
              <Text style={styles.featureDescription}>
                Advanced AI algorithms generate questions that match real exam patterns and difficulty levels.
              </Text>
            </View>

            {/* Feature Card 2 */}
            <View style={[styles.featureCard, { marginBottom: isMobile ? 20 : 0, marginRight: isMobile ? 0 : 12 }]}>
              <View style={styles.featureIcon}>
                <Text style={styles.featureIconText}>📊</Text>
              </View>
              <Text style={styles.featureTitle}>Exam Patterns</Text>
              <Text style={styles.featureDescription}>
                Questions designed based on actual government exam patterns and previous year papers.
              </Text>
            </View>

            {/* Feature Card 3 */}
            <View style={[styles.featureCard, { marginBottom: isMobile ? 20 : 0 }]}>
              <View style={styles.featureIcon}>
                <Text style={styles.featureIconText}>⚡</Text>
              </View>
              <Text style={styles.featureTitle}>Instant Results</Text>
              <Text style={styles.featureDescription}>
                Get immediate feedback with detailed explanations and performance analytics after each quiz.
              </Text>
            </View>
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
    alignSelf: 'center',
  },
  heroSection: {
    alignItems: 'center',
  },
  heroTitle: {
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
  },
  ctaButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
    shadowColor: '#007AFF',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
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
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 40,
  },
  featuresGrid: {
    justifyContent: 'space-between',
  },
  featureCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    ...Platform.select({
      web: {
        transition: 'transform 0.2s, box-shadow 0.2s',
      },
    }),
  },
  featureIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f0f4ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  featureIconText: {
    fontSize: 32,
  },
  featureTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  featureDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
});
