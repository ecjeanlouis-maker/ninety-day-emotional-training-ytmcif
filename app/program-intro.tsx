
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { trackEvent } from '@/utils/analytics';

// ─── Constants ────────────────────────────────────────────────────────────────

const PHASES = [
  { key: 'Emotional Control',    color: '#6B4CE6', emoji: '🧘', daysStart: 1,  daysEnd: 12  },
  { key: 'Confidence',           color: '#FFB84D', emoji: '⭐', daysStart: 13, daysEnd: 24  },
  { key: 'Anger Management',     color: '#E74C3C', emoji: '🌊', daysStart: 25, daysEnd: 36  },
  { key: 'Stress Management',    color: '#3B82F6', emoji: '🍃', daysStart: 37, daysEnd: 48  },
  { key: 'Social Anxiety',       color: '#F5A623', emoji: '🤝', daysStart: 49, daysEnd: 60  },
  { key: 'Thought Regulation',   color: '#27AE60', emoji: '🧠', daysStart: 61, daysEnd: 72  },
  { key: 'Organization Skills',  color: '#1ABC9C', emoji: '📋', daysStart: 73, daysEnd: 81  },
  { key: 'Communication Skills', color: '#9B59B6', emoji: '💬', daysStart: 82, daysEnd: 90  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProgramIntroScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const trackedRef = useRef(false);

  useEffect(() => {
    if (!trackedRef.current) {
      trackedRef.current = true;
      console.log('[ProgramIntro] Screen mounted — tracking program_intro_viewed');
      trackEvent('program_intro_viewed');
    }
  }, []);

  const handleStartJourney = async () => {
    console.log('[ProgramIntro] Start My Journey tapped');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    trackEvent('start_journey_tapped');
    try {
      const { authenticatedGet } = await import('@/utils/api');
      const onboarding = await authenticatedGet<{ completed_at: string | null }>('/api/onboarding');
      if (onboarding?.completed_at) {
        console.log('[ProgramIntro] Onboarding complete — routing to /(tabs)/(home)');
        router.replace('/(tabs)/(home)');
      } else {
        console.log('[ProgramIntro] Onboarding incomplete — routing to /onboarding');
        router.push('/onboarding');
      }
    } catch {
      console.log('[ProgramIntro] Onboarding check failed (404/error) — routing to /onboarding');
      router.push('/onboarding');
    }
  };

  const handleViewAllPrograms = () => {
    console.log('[ProgramIntro] View All Programs tapped');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/program');
  };

  const handleSignIn = () => {
    console.log('[ProgramIntro] Sign In to Save Progress tapped');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/auth');
  };

  const handleBack = () => {
    console.log('[ProgramIntro] Back tapped');
    router.back();
  };

  const isGuest = !user;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Back button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={handleBack}
        activeOpacity={0.7}
        accessibilityLabel="Go back"
        accessibilityRole="button"
      >
        <IconSymbol
          ios_icon_name="chevron.left"
          android_material_icon_name="arrow-back"
          size={22}
          color={colors.primary}
        />
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <Animated.View entering={FadeIn.duration(700)} style={styles.heroContainer}>
          <LinearGradient
            colors={[colors.primary, colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            <Text style={styles.heroEmoji}>🏆</Text>
            <Text style={styles.heroTitle}>Your 90-Day Journey</Text>
            <Text style={styles.heroSubtitle}>
              5–10 minutes a day. 8 phases. Sequential progression.
            </Text>
            <View style={styles.heroStats}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>90</Text>
                <Text style={styles.heroStatLabel}>Days</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>8</Text>
                <Text style={styles.heroStatLabel}>Phases</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>7</Text>
                <Text style={styles.heroStatLabel}>Free Days</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* How it works */}
        <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.section}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          <View style={styles.howItWorksRow}>
            <View style={styles.howItWorksItem}>
              <Text style={styles.howItWorksEmoji}>⏱</Text>
              <Text style={styles.howItWorksLabel}>5–10 min/day</Text>
            </View>
            <View style={styles.howItWorksItem}>
              <Text style={styles.howItWorksEmoji}>🔢</Text>
              <Text style={styles.howItWorksLabel}>Sequential phases</Text>
            </View>
            <View style={styles.howItWorksItem}>
              <Text style={styles.howItWorksEmoji}>📈</Text>
              <Text style={styles.howItWorksLabel}>Track progress</Text>
            </View>
          </View>
          <Text style={styles.howItWorksNote}>
            Each phase builds on the last. Complete days in order to unlock the next.
          </Text>
        </Animated.View>

        {/* Access disclosure */}
        <Animated.View entering={FadeInDown.delay(150).duration(600)} style={styles.accessCard}>
          <View style={styles.accessRow}>
            <View style={[styles.accessBadge, { backgroundColor: '#E8F5E9' }]}>
              <Text style={[styles.accessBadgeText, { color: '#27AE60' }]}>FREE</Text>
            </View>
            <Text style={styles.accessText}>Days 1–7 — always free</Text>
          </View>
          <View style={styles.accessDivider} />
          <View style={styles.accessRow}>
            <View style={[styles.accessBadge, { backgroundColor: '#F0EBFF' }]}>
              <Text style={[styles.accessBadgeText, { color: colors.primary }]}>PRO</Text>
            </View>
            <Text style={styles.accessText}>Days 8–90 — Premium required</Text>
          </View>
        </Animated.View>

        {/* Phase overview */}
        <Animated.View entering={FadeInDown.delay(200).duration(600)} style={styles.section}>
          <Text style={styles.sectionTitle}>8 Phases Overview</Text>
          <View style={styles.phaseList}>
            {PHASES.map((phase, idx) => {
              const phaseNumber = idx + 1;
              const dayRangeText = `Days ${phase.daysStart}–${phase.daysEnd}`;
              return (
                <View
                  key={phase.key}
                  style={styles.phaseRow}
                  accessible={true}
                  accessibilityLabel={`Phase ${phaseNumber}: ${phase.key}, ${dayRangeText}`}
                >
                  <View style={[styles.phaseNumberBadge, { backgroundColor: phase.color + '20' }]}>
                    <Text style={[styles.phaseNumberText, { color: phase.color }]}>{phaseNumber}</Text>
                  </View>
                  <Text style={styles.phaseEmoji}>{phase.emoji}</Text>
                  <View style={styles.phaseInfo}>
                    <Text style={styles.phaseName}>{phase.key}</Text>
                    <Text style={styles.phaseDays}>{dayRangeText}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </Animated.View>

        {/* Assessment note */}
        <Animated.View entering={FadeInDown.delay(250).duration(600)} style={styles.assessmentCard}>
          <Text style={styles.assessmentTitle}>📝 Assessment is Optional</Text>
          <Text style={styles.assessmentText}>
            A short self-assessment helps personalize your experience, but you can skip it and start training right away.
          </Text>
        </Animated.View>

        {/* Safety disclaimer */}
        <Animated.View entering={FadeInDown.delay(300).duration(600)} style={styles.disclaimerCard}>
          <Text style={styles.disclaimerText}>
            This is an educational self-improvement program, not therapy, diagnosis, or medical treatment. If you are in crisis, call or text 988.
          </Text>
        </Animated.View>

        {/* CTAs */}
        <Animated.View entering={FadeInDown.delay(350).duration(600)} style={styles.ctaSection}>
          {/* Authenticated: Start My Journey */}
          {!isGuest && (
            <TouchableOpacity
              style={styles.primaryCTAWrapper}
              onPress={handleStartJourney}
              activeOpacity={0.9}
              accessibilityLabel="Start My Journey"
              accessibilityRole="button"
            >
              <LinearGradient
                colors={[colors.primary, colors.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryCTA}
              >
                <Text style={styles.primaryCTAText}>Start My Journey</Text>
                <IconSymbol
                  ios_icon_name="arrow.right"
                  android_material_icon_name="arrow-forward"
                  size={20}
                  color="#FFFFFF"
                />
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* View All Programs — always available */}
          <TouchableOpacity
            style={isGuest ? styles.primaryCTAWrapper : styles.secondaryCTAWrapper}
            onPress={handleViewAllPrograms}
            activeOpacity={0.9}
            accessibilityLabel="View All Programs"
            accessibilityRole="button"
          >
            {isGuest ? (
              <LinearGradient
                colors={[colors.primary, colors.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryCTA}
              >
                <Text style={styles.primaryCTAText}>View All Programs</Text>
                <IconSymbol
                  ios_icon_name="list.bullet"
                  android_material_icon_name="list"
                  size={20}
                  color="#FFFFFF"
                />
              </LinearGradient>
            ) : (
              <View style={styles.secondaryCTA}>
                <Text style={styles.secondaryCTAText}>View All Programs</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Guest: Sign In to Save Progress */}
          {isGuest && (
            <TouchableOpacity
              style={styles.ghostCTAWrapper}
              onPress={handleSignIn}
              activeOpacity={0.8}
              accessibilityLabel="Sign In to Save Progress"
              accessibilityRole="button"
            >
              <Text style={styles.ghostCTAText}>Sign In to Save Progress</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 4,
    minHeight: 44,
  },
  backButtonText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 48,
    gap: 16,
  },

  // Hero
  heroContainer: {
    marginHorizontal: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  heroGradient: {
    padding: 28,
    alignItems: 'center',
    gap: 8,
  },
  heroEmoji: {
    fontSize: 52,
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 22,
  },
  heroStats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
  },
  heroStat: {
    alignItems: 'center',
    gap: 2,
  },
  heroStatValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  heroStatLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
  },
  heroStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },

  // Section
  section: {
    marginHorizontal: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },

  // How it works
  howItWorksRow: {
    flexDirection: 'row',
    gap: 12,
  },
  howItWorksItem: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  howItWorksEmoji: {
    fontSize: 24,
  },
  howItWorksLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  howItWorksNote: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  // Access card
  accessCard: {
    marginHorizontal: 16,
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  accessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  accessBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    minWidth: 48,
    alignItems: 'center',
  },
  accessBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  accessText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  accessDivider: {
    height: 1,
    backgroundColor: colors.border,
  },

  // Phase list
  phaseList: {
    gap: 8,
  },
  phaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 52,
  },
  phaseNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  phaseNumberText: {
    fontSize: 13,
    fontWeight: '800',
  },
  phaseEmoji: {
    fontSize: 20,
  },
  phaseInfo: {
    flex: 1,
    gap: 1,
  },
  phaseName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  phaseDays: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },

  // Assessment card
  assessmentCard: {
    marginHorizontal: 16,
    backgroundColor: colors.highlight,
    borderRadius: 14,
    padding: 16,
    gap: 6,
  },
  assessmentTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  assessmentText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  // Disclaimer
  disclaimerCard: {
    marginHorizontal: 16,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  disclaimerText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
    textAlign: 'center',
  },

  // CTAs
  ctaSection: {
    marginHorizontal: 16,
    gap: 12,
    paddingBottom: 8,
  },
  primaryCTAWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  primaryCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
    minHeight: 56,
  },
  primaryCTAText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryCTAWrapper: {
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.primary,
    overflow: 'hidden',
  },
  secondaryCTA: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    minHeight: 52,
  },
  secondaryCTAText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  ghostCTAWrapper: {
    alignItems: 'center',
    paddingVertical: 14,
    minHeight: 44,
  },
  ghostCTAText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
});
