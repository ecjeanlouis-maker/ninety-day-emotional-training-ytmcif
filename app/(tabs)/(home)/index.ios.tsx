
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { techniques } from '@/data/techniques';
import { ProgramType } from '@/types/program';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeInDown,
  FadeIn,
  useAnimatedStyle,
  withSpring,
  withTiming,
  useSharedValue,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import CongratulationsModal from '@/components/CongratulationsModal';
import Survey from './survey.ios';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useUser } from '@/contexts/UserContext';
import { useRouter } from 'expo-router';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const PROGRAM_CONFIGS = {
  emotional: {
    title: 'Emotional Control',
    subtitle: '12-Week Self-Regulation Training',
    description: 'Master your emotions and respond with clarity through 12 powerful techniques',
    icon: 'psychology',
    iconIOS: 'brain',
    color: colors.primary,
  },
  confidence: {
    title: 'Confidence Development',
    subtitle: '12-Week Solid Confidence Training',
    description: 'Build unshakeable self-belief and inner strength with 12 proven methods',
    icon: 'star',
    iconIOS: 'star',
    color: colors.accent,
  },
  anger: {
    title: 'Anger Management',
    subtitle: '12-Week Anger Control Training',
    description: 'Transform anger into constructive action with 12 effective techniques',
    icon: 'warning',
    iconIOS: 'exclamationmark.triangle',
    color: '#FF6B6B',
  },
  stress: {
    title: 'Stress Management',
    subtitle: '12-Week Stress Resilience Training',
    description: 'Build resilience and manage stress effectively with 12 proven strategies',
    icon: 'spa',
    iconIOS: 'leaf',
    color: '#4ECDC4',
  },
  'social-anxiety': {
    title: 'Social Anxiety',
    subtitle: '12-Week Social Confidence Training',
    description: 'Overcome social fears and build authentic connections with 12 techniques',
    icon: 'group',
    iconIOS: 'person.3',
    color: '#9B59B6',
  },
  thoughts: {
    title: 'Thoughts Regulation',
    subtitle: '12-Week Mental Mastery Training',
    description: 'Master your mind and direct your thoughts intentionally with 12 methods',
    icon: 'psychology',
    iconIOS: 'brain.head.profile',
    color: '#27AE60',
  },
};

export default function HomeScreen() {
  console.log('HomeScreen rendered (iOS)');
  
  const { user } = useAuth();
  const { isSubscribed } = useSubscription();
  const { canAccess, profile, isFree, isPremium, isAdmin, isTrialing, isPastDue, trialDaysRemaining } = useUser();
  const router = useRouter();
  const [showWelcome, setShowWelcome] = useState(true);
  const [showSurvey, setShowSurvey] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<ProgramType>(null);
  const [selectedTechnique, setSelectedTechnique] = useState<number | null>(null);
  const [completedTechniques, setCompletedTechniques] = useState<Set<number>>(new Set());
  const [showCongratsModal, setShowCongratsModal] = useState(false);
  const [completedTechniqueData, setCompletedTechniqueData] = useState<{
    week: number;
    title: string;
    color: string;
  } | null>(null);
  
  const currentDay = 1;
  const totalDays = 90;
  const progressPercentage = (currentDay / totalDays) * 100;
  const progressText = `Day ${currentDay} of ${totalDays}`;
  
  const progressAnimation = useSharedValue(0);

  const programTechniques = selectedProgram 
    ? techniques.filter(t => t.category === selectedProgram)
    : [];

  useEffect(() => {
    console.log('Animating progress bar to:', progressPercentage);
    progressAnimation.value = withTiming(progressPercentage, { duration: 1500 });
  }, [progressPercentage]);

  const progressBarStyle = useAnimatedStyle(() => {
    const widthValue = `${progressAnimation.value}%`;
    return {
      width: widthValue,
    };
  });

  const handleBeginAssessment = () => {
    console.log('User tapped Begin Assessment');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowWelcome(false);
    setShowSurvey(true);
  };

  const handleSurveyComplete = (recommendedPrograms: ProgramType[]) => {
    console.log('Survey completed with recommendations:', recommendedPrograms);
    setShowSurvey(false);
    if (recommendedPrograms.length > 0) {
      setSelectedProgram(recommendedPrograms[0]);
    }
  };

  const handleSurveyBack = () => {
    console.log('User navigating back from survey');
    setShowSurvey(false);
    setShowWelcome(true);
  };

  const handleProgramSelect = (program: 'emotional' | 'confidence' | 'anger' | 'stress' | 'social-anxiety' | 'thoughts') => {
    console.log('User selected program:', program, '— isSubscribed:', isSubscribed);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedProgram(program);
    setSelectedTechnique(null);
    setCompletedTechniques(new Set());
  };

  const handleBackToSelection = () => {
    console.log('User navigating back to program selection');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedProgram(null);
    setSelectedTechnique(null);
  };

  const hasFullAccess = isSubscribed || canAccess('ecct_full_program');

  const handleTechniquePress = (id: number, week: number) => {
    console.log('User tapped technique:', id, 'Week:', week, '— hasFullAccess:', hasFullAccess);
    
    if (week > 1 && !hasFullAccess) {
      console.log('User attempted to access Week', week, 'without full access — pushing paywall');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      router.push('/paywall');
      return;
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTechnique(selectedTechnique === id ? null : id);
  };

  const handleCheckboxPress = (id: number, week: number) => {
    console.log('User toggled technique completion:', id, 'Week:', week);
    
    if (week > 1 && !hasFullAccess) {
      console.log('User attempted to complete Week', week, 'without full access — pushing paywall');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      router.push('/paywall');
      return;
    }
    
    setCompletedTechniques(prev => {
      const newSet = new Set(prev);
      const wasCompleted = newSet.has(id);
      
      if (wasCompleted) {
        newSet.delete(id);
      } else {
        newSet.add(id);
        
        const technique = techniques.find(t => t.id === id);
        if (technique && selectedProgram) {
          const programColor = PROGRAM_CONFIGS[selectedProgram].color;
          setCompletedTechniqueData({
            week: technique.week,
            title: technique.title,
            color: programColor,
          });
          setShowCongratsModal(true);
        }
      }
      
      return newSet;
    });
  };

  const handleCloseCongratsModal = () => {
    console.log('Closing congratulations modal');
    setShowCongratsModal(false);
    setCompletedTechniqueData(null);
  };

  if (showSurvey) {
    return (
      <Survey 
        onComplete={handleSurveyComplete}
        onBack={handleSurveyBack}
      />
    );
  }

  if (showWelcome && !user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            entering={FadeIn.duration(1000)}
            style={styles.welcomeHero}
          >
            <LinearGradient
              colors={[colors.primary, colors.accent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.welcomeHeroGradient}
            >
              <View style={styles.welcomeIconContainer}>
                <IconSymbol
                  ios_icon_name="star.fill"
                  android_material_icon_name="star"
                  size={64}
                  color="#FFFFFF"
                />
              </View>
              <Text style={styles.welcomeTitle}>Welcome to Your</Text>
              <Text style={styles.welcomeTitle}>Transformation Journey</Text>
              <Text style={styles.welcomeSubtitle}>
                90 days to become the best version of yourself
              </Text>
            </LinearGradient>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(300).duration(800)}
            style={styles.welcomeButtonContainer}
          >
            <TouchableOpacity
              style={styles.welcomeButton}
              onPress={() => {
                console.log('User tapped Sign In on welcome screen (iOS)');
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/auth');
              }}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={[colors.primary, colors.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.welcomeButtonGradient}
              >
                <Text style={styles.welcomeButtonText}>Sign In</Text>
                <IconSymbol
                  ios_icon_name="arrow.right"
                  android_material_icon_name="arrow-forward"
                  size={24}
                  color="#FFFFFF"
                />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(450).duration(800)}
            style={styles.guestButtonContainer}
          >
            <TouchableOpacity
              style={styles.guestButton}
              activeOpacity={0.85}
              onPress={() => {
                console.log('[Home] Continue as Guest tapped — starting assessment');
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                handleBeginAssessment();
              }}
            >
              <Text style={styles.guestButtonText}>Continue as Guest</Text>
              <IconSymbol
                ios_icon_name="person.fill"
                android_material_icon_name="person"
                size={20}
                color={colors.primary}
              />
            </TouchableOpacity>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(600).duration(800)}
            style={styles.welcomeFooter}
          >
            <Text style={styles.welcomeFooterText}>
              Sign in to save your progress, or continue as a guest to take the assessment.
            </Text>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (showWelcome && user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            entering={FadeIn.duration(1000)}
            style={styles.welcomeHero}
          >
            <LinearGradient
              colors={[colors.primary, colors.accent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.welcomeHeroGradient}
            >
              <View style={styles.welcomeIconContainer}>
                <IconSymbol
                  ios_icon_name="star.fill"
                  android_material_icon_name="star"
                  size={64}
                  color="#FFFFFF"
                />
              </View>
              <Text style={styles.welcomeTitle}>Welcome to Your</Text>
              <Text style={styles.welcomeTitle}>Transformation Journey</Text>
              <Text style={styles.welcomeSubtitle}>
                90 days to become the best version of yourself
              </Text>
            </LinearGradient>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(300).duration(800)}
            style={styles.welcomeContent}
          >
            <Text style={styles.welcomeQuestion}>
              What psychological goal are you trying to achieve?
            </Text>
            <Text style={styles.welcomeDescription}>
              Choose the area you want to focus on for the next 12 weeks. Each program contains 12 powerful techniques designed to create lasting transformation.
            </Text>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(500).duration(800)}
            style={styles.welcomeStats}
          >
            <View style={styles.welcomeStatItem}>
              <IconSymbol
                ios_icon_name="calendar"
                android_material_icon_name="calendar-today"
                size={32}
                color={colors.primary}
              />
              <Text style={styles.welcomeStatNumber}>90</Text>
              <Text style={styles.welcomeStatLabel}>Days</Text>
            </View>
            <View style={styles.welcomeStatDivider} />
            <View style={styles.welcomeStatItem}>
              <IconSymbol
                ios_icon_name="list.bullet"
                android_material_icon_name="list"
                size={32}
                color={colors.primary}
              />
              <Text style={styles.welcomeStatNumber}>12</Text>
              <Text style={styles.welcomeStatLabel}>Techniques</Text>
            </View>
            <View style={styles.welcomeStatDivider} />
            <View style={styles.welcomeStatItem}>
              <IconSymbol
                ios_icon_name="chart.line.uptrend.xyaxis"
                android_material_icon_name="trending-up"
                size={32}
                color={colors.primary}
              />
              <Text style={styles.welcomeStatNumber}>100%</Text>
              <Text style={styles.welcomeStatLabel}>Growth</Text>
            </View>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(700).duration(800)}
            style={styles.welcomeButtonContainer}
          >
            <TouchableOpacity
              style={styles.welcomeButton}
              onPress={handleBeginAssessment}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={[colors.primary, colors.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.welcomeButtonGradient}
              >
                <Text style={styles.welcomeButtonText}>Begin Assessment</Text>
                <IconSymbol
                  ios_icon_name="arrow.right"
                  android_material_icon_name="arrow-forward"
                  size={24}
                  color="#FFFFFF"
                />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(900).duration(800)}
            style={styles.welcomeFooter}
          >
            <Text style={styles.welcomeFooterText}>
              Join thousands who have transformed their lives through our proven 12-week programs
            </Text>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const motivationalPhrase = 'BE THE BEST VERSION OF YOURSELF';

  // --- User info card computed values ---
  const displayName = profile?.full_name || user?.name || (user?.email ? user.email.split('@')[0] : 'there');

  const rolePillBg = isAdmin ? '#6B4CE6' : isPremium ? '#27AE60' : '#8E8E93';
  const rolePillLabel = isAdmin ? 'ADMIN' : isPremium ? 'PREMIUM' : 'FREE';

  const planTypeLabel = profile?.plan_type === 'lifetime'
    ? 'Lifetime'
    : profile?.plan_type === 'yearly'
      ? 'Yearly'
      : profile?.plan_type === 'monthly'
        ? 'Monthly'
        : isTrialing
          ? 'Free Trial'
          : 'Free';

  const accessState = profile?.access_state ?? null;
  const statusDotColor = accessState === 'active'
    ? '#27AE60'
    : accessState === 'trialing'
      ? '#3B82F6'
      : accessState === 'past_due'
        ? '#FF3B30'
        : accessState === 'cancelled_grace'
          ? '#F5A623'
          : accessState === 'admin'
            ? '#6B4CE6'
            : '#8E8E93';
  const statusLabel = accessState === 'active'
    ? 'Active'
    : accessState === 'trialing'
      ? 'Trial'
      : accessState === 'past_due'
        ? 'Payment Due'
        : accessState === 'cancelled_grace'
          ? 'Cancelled'
          : accessState === 'expired'
            ? 'Expired'
            : accessState === 'admin'
              ? 'Admin'
              : 'Inactive';

  const trialCountText = trialDaysRemaining !== null && trialDaysRemaining > 1
    ? `Free trial — ${trialDaysRemaining} days left`
    : trialDaysRemaining === 1
      ? 'Free trial — last day'
      : 'Trial ending today';

  const actionButtonIntent = isAdmin
    ? 'admin-dashboard'
    : isPastDue
      ? 'update-payment'
      : isTrialing
        ? 'upgrade-now'
        : isFree
          ? 'upgrade-to-premium'
          : 'manage-subscription';

  const actionButtonLabel = actionButtonIntent === 'admin-dashboard'
    ? 'Admin Dashboard'
    : actionButtonIntent === 'update-payment'
      ? 'Update Payment'
      : actionButtonIntent === 'upgrade-now'
        ? 'Upgrade Now'
        : actionButtonIntent === 'upgrade-to-premium'
          ? 'Upgrade to Premium'
          : 'Manage Subscription';

  const actionButtonRoute: '/paywall' | '/admin' = actionButtonIntent === 'admin-dashboard' ? '/admin' : '/paywall';

  const isProfileMissing = !!user && profile === null;

  const handleActionButtonPress = () => {
    console.log(`[Dashboard] Action button tapped — ${actionButtonIntent}`);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(actionButtonRoute);
  };

  const handleTrialBannerPress = () => {
    console.log('[Dashboard] Trial countdown banner tapped — routing to paywall');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/paywall');
  };

  const handleCompleteProfilePress = () => {
    console.log('[Dashboard] Complete Your Profile tapped — routing to profile-edit');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/profile-edit');
  };

  if (!selectedProgram) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {!!user && (
            <Animated.View entering={FadeIn.duration(600)} style={styles.userInfoCard}>
              {/* Greeting row */}
              <View style={styles.userInfoGreetingRow}>
                <View style={styles.userInfoAvatarCircle}>
                  <IconSymbol
                    ios_icon_name="person.fill"
                    android_material_icon_name="person"
                    size={22}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.userInfoNameStack}>
                  <Text style={styles.userInfoWelcomeLabel}>Welcome back</Text>
                  <Text style={styles.userInfoName}>{displayName}</Text>
                </View>
                <View style={[styles.userInfoRolePill, { backgroundColor: rolePillBg }]}>
                  <Text style={styles.userInfoRolePillText}>{rolePillLabel}</Text>
                </View>
              </View>

              {/* Status row — only when profile is loaded */}
              {!isProfileMissing && (
                <View style={styles.userInfoStatusRow}>
                  <View style={styles.userInfoStatusHalf}>
                    <Text style={styles.userInfoStatusLabel}>PLAN</Text>
                    <Text style={styles.userInfoStatusValue}>{planTypeLabel}</Text>
                  </View>
                  <View style={styles.userInfoStatusDivider} />
                  <View style={styles.userInfoStatusHalf}>
                    <Text style={styles.userInfoStatusLabel}>STATUS</Text>
                    <View style={styles.userInfoStatusValueRow}>
                      <View style={[styles.userInfoStatusDot, { backgroundColor: statusDotColor }]} />
                      <Text style={styles.userInfoStatusValue}>{statusLabel}</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Trial countdown banner */}
              {!isProfileMissing && isTrialing && trialDaysRemaining !== null && (
                <TouchableOpacity
                  style={styles.userInfoTrialBanner}
                  onPress={handleTrialBannerPress}
                  activeOpacity={0.85}
                >
                  <IconSymbol
                    ios_icon_name="gift.fill"
                    android_material_icon_name="card-giftcard"
                    size={16}
                    color="#2563EB"
                  />
                  <Text style={styles.userInfoTrialText}>{trialCountText}</Text>
                </TouchableOpacity>
              )}

              {/* Action button */}
              {isProfileMissing ? (
                <TouchableOpacity
                  style={styles.userInfoActionGradientWrapper}
                  onPress={handleCompleteProfilePress}
                  activeOpacity={0.88}
                >
                  <LinearGradient
                    colors={[colors.primary, colors.secondary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.userInfoActionGradient}
                  >
                    <IconSymbol
                      ios_icon_name="person.badge.plus"
                      android_material_icon_name="person-add"
                      size={18}
                      color="#FFFFFF"
                    />
                    <Text style={styles.userInfoActionGradientText}>Complete Your Profile</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ) : actionButtonIntent === 'manage-subscription' || actionButtonIntent === 'admin-dashboard' ? (
                <TouchableOpacity
                  style={styles.userInfoActionOutline}
                  onPress={handleActionButtonPress}
                  activeOpacity={0.88}
                >
                  <IconSymbol
                    ios_icon_name={actionButtonIntent === 'admin-dashboard' ? 'shield.checkmark' : 'gearshape'}
                    android_material_icon_name={actionButtonIntent === 'admin-dashboard' ? 'verified-user' : 'settings'}
                    size={18}
                    color={colors.primary}
                  />
                  <Text style={styles.userInfoActionOutlineText}>{actionButtonLabel}</Text>
                </TouchableOpacity>
              ) : actionButtonIntent === 'update-payment' ? (
                <TouchableOpacity
                  style={styles.userInfoActionGradientWrapper}
                  onPress={handleActionButtonPress}
                  activeOpacity={0.88}
                >
                  <LinearGradient
                    colors={['#FF3B30', '#FF6B5B']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.userInfoActionGradient}
                  >
                    <IconSymbol
                      ios_icon_name="creditcard"
                      android_material_icon_name="credit-card"
                      size={18}
                      color="#FFFFFF"
                    />
                    <Text style={styles.userInfoActionGradientText}>{actionButtonLabel}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.userInfoActionGradientWrapper}
                  onPress={handleActionButtonPress}
                  activeOpacity={0.88}
                >
                  <LinearGradient
                    colors={[colors.primary, colors.secondary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.userInfoActionGradient}
                  >
                    <Text style={styles.userInfoActionGradientText}>{actionButtonLabel}</Text>
                    <IconSymbol
                      ios_icon_name="arrow.right"
                      android_material_icon_name="arrow-forward"
                      size={18}
                      color="#FFFFFF"
                    />
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </Animated.View>
          )}

          <Animated.View 
            entering={FadeIn.duration(800)}
            style={styles.motivationalBanner}
          >
            <LinearGradient
              colors={[colors.primary, colors.accent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.motivationalGradient}
            >
              <IconSymbol
                ios_icon_name="star.fill"
                android_material_icon_name="star"
                size={28}
                color="#FFFFFF"
              />
              <Text style={styles.motivationalText}>{motivationalPhrase}</Text>
              <IconSymbol
                ios_icon_name="star.fill"
                android_material_icon_name="star"
                size={28}
                color="#FFFFFF"
              />
            </LinearGradient>
          </Animated.View>

          <Animated.View 
            entering={FadeIn.delay(200).duration(600)}
            style={styles.selectionHeader}
          >
            <Text style={styles.selectionTitle}>Choose Your</Text>
            <Text style={styles.selectionTitle}>12-Week Program</Text>
            <Text style={styles.selectionSubtitle}>
              Select one program to begin your 90-day transformation journey
            </Text>
          </Animated.View>

          <Animated.View 
            entering={FadeInDown.delay(400).duration(600)}
            style={styles.programCardsContainer}
          >
            {(Object.keys(PROGRAM_CONFIGS) as Array<keyof typeof PROGRAM_CONFIGS>).map((programKey) => {
              const config = PROGRAM_CONFIGS[programKey];
              const startLabel = hasFullAccess ? 'Start' : 'Start Free';
              return (
                <View key={programKey} style={styles.programCard}>
                  <LinearGradient
                    colors={[config.color, config.color + 'DD']}
                    style={styles.programCardGradient}
                  >
                    <View style={styles.programCardIconContainer}>
                      <IconSymbol
                        ios_icon_name={config.iconIOS}
                        android_material_icon_name={config.icon}
                        size={48}
                        color="#FFFFFF"
                      />
                    </View>
                    <Text style={styles.programCardTitle}>{config.title}</Text>
                    <Text style={styles.programCardDescription}>
                      {config.description}
                    </Text>
                    <View style={styles.programCardStats}>
                      <View style={styles.programCardStat}>
                        <IconSymbol
                          ios_icon_name="calendar"
                          android_material_icon_name="calendar-today"
                          size={16}
                          color="#FFFFFF"
                        />
                        <Text style={styles.programCardStatText}>12 Weeks</Text>
                      </View>
                      <View style={styles.programCardStat}>
                        <IconSymbol
                          ios_icon_name="list"
                          android_material_icon_name="list"
                          size={16}
                          color="#FFFFFF"
                        />
                        <Text style={styles.programCardStatText}>12 Techniques</Text>
                      </View>
                    </View>
                    
                    <TouchableOpacity
                      style={styles.programCardButtonPrimary}
                      onPress={() => handleProgramSelect(programKey)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.programCardButtonPrimaryText}>{startLabel}</Text>
                      <IconSymbol
                        ios_icon_name="arrow.right"
                        android_material_icon_name="arrow-forward"
                        size={18}
                        color="#FFFFFF"
                      />
                    </TouchableOpacity>
                  </LinearGradient>
                </View>
              );
            })}
          </Animated.View>

          <Animated.View 
            entering={FadeInDown.delay(600).duration(600)}
            style={styles.selectionFooter}
          >
            <Text style={styles.selectionFooterText}>
              {hasFullAccess
                ? 'Pro Member — all 12 weeks unlocked across every program.'
                : 'Start Free gives you access to Week 1. Upgrade anytime to unlock all 12 weeks.'}
            </Text>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const programConfig = PROGRAM_CONFIGS[selectedProgram];
  const programColor = programConfig.color;
  const programTitle = programConfig.title;
  const programSubtitle = programConfig.subtitle;
  const programIcon = programConfig.icon;
  const programIconIOS = programConfig.iconIOS;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View 
          entering={FadeIn.duration(600)}
          style={styles.header}
        >
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleBackToSelection}
            activeOpacity={0.7}
          >
            <IconSymbol
              ios_icon_name="arrow.left"
              android_material_icon_name="arrow-back"
              size={24}
              color={colors.text}
            />
            <Text style={styles.backButtonText}>Change Program</Text>
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            <IconSymbol
              ios_icon_name={programIconIOS}
              android_material_icon_name={programIcon}
              size={32}
              color={programColor}
            />
            <Text style={styles.headerTitle}>{programTitle}</Text>
          </View>
          <Text style={styles.headerSubtitle}>{programSubtitle}</Text>
          
          <Animated.View 
            entering={FadeInDown.delay(200).duration(600)}
            style={styles.freeTrialBanner}
          >
            <IconSymbol
              ios_icon_name={hasFullAccess ? 'checkmark.seal.fill' : 'info.circle'}
              android_material_icon_name={hasFullAccess ? 'verified' : 'info'}
              size={20}
              color={hasFullAccess ? '#27AE60' : programColor}
            />
            <Text style={styles.freeTrialText}>
              {hasFullAccess ? 'Pro Member — All Weeks Unlocked' : 'Free Trial: Week 1 Only'}
            </Text>
            {!hasFullAccess && (
              <TouchableOpacity
                style={[styles.upgradeButton, { backgroundColor: programColor }]}
                onPress={() => {
                  console.log('User tapped Upgrade banner button (iOS)');
                  router.push('/paywall');
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.upgradeButtonText}>Upgrade</Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        </Animated.View>

        <Animated.View 
          entering={FadeInDown.delay(200).duration(600)}
          style={styles.progressCard}
        >
          <View style={styles.progressHeader}>
            <IconSymbol
              ios_icon_name="calendar"
              android_material_icon_name="calendar-today"
              size={24}
              color={programColor}
            />
            <Text style={styles.progressTitle}>Your Progress</Text>
          </View>
          
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBackground}>
              <Animated.View 
                style={[styles.progressBarFill, progressBarStyle, { backgroundColor: programColor }]} 
              />
            </View>
          </View>
          
          <Text style={styles.progressText}>{progressText}</Text>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: programColor }]}>{completedTechniques.size}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: programColor }]}>{programTechniques.length}</Text>
              <Text style={styles.statLabel}>Total Techniques</Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View 
          entering={FadeInDown.delay(300).duration(600)}
          style={styles.techniquesHeader}
        >
          <Text style={styles.techniquesHeaderTitle}>12 Weekly Techniques</Text>
          <Text style={styles.techniquesHeaderSubtitle}>
            One technique per week for 12 weeks
          </Text>
        </Animated.View>

        <View style={styles.techniquesContainer}>
          {programTechniques.map((technique, index) => {
            const isExpanded = selectedTechnique === technique.id;
            const isCompleted = completedTechniques.has(technique.id);
            const weekText = `Week ${technique.week}`;
            const isLocked = technique.week > 1 && !hasFullAccess;

            return (
              <TechniqueCard
                key={technique.id}
                technique={technique}
                index={index}
                isExpanded={isExpanded}
                isCompleted={isCompleted}
                isLocked={isLocked}
                categoryColor={programColor}
                weekText={weekText}
                onPress={() => handleTechniquePress(technique.id, technique.week)}
                onCheckboxPress={() => handleCheckboxPress(technique.id, technique.week)}
              />
            );
          })}
        </View>

        <Animated.View 
          entering={FadeInDown.delay(400).duration(600)}
          style={styles.footer}
        >
          <Text style={styles.footerText}>
            Practice each technique for one week. Consistency over 12 weeks creates lasting transformation.
          </Text>
        </Animated.View>
      </ScrollView>

      {completedTechniqueData && (
        <CongratulationsModal
          visible={showCongratsModal}
          onClose={handleCloseCongratsModal}
          weekNumber={completedTechniqueData.week}
          techniqueTitle={completedTechniqueData.title}
          categoryColor={completedTechniqueData.color}
        />
      )}
    </SafeAreaView>
  );
}

interface TechniqueCardProps {
  technique: any;
  index: number;
  isExpanded: boolean;
  isCompleted: boolean;
  isLocked: boolean;
  categoryColor: string;
  weekText: string;
  onPress: () => void;
  onCheckboxPress: () => void;
}

function TechniqueCard({
  technique,
  index,
  isExpanded,
  isCompleted,
  isLocked,
  categoryColor,
  weekText,
  onPress,
  onCheckboxPress,
}: TechniqueCardProps) {
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const detailsHeight = useSharedValue(0);

  useEffect(() => {
    rotation.value = withSpring(isExpanded ? 180 : 0);
    detailsHeight.value = withSpring(isExpanded ? 1 : 0);
  }, [isExpanded]);

  const cardStyle = useAnimatedStyle(() => {
    const scaleValue = scale.value;
    return {
      transform: [{ scale: scaleValue }],
    };
  });

  const chevronStyle = useAnimatedStyle(() => {
    const rotateValue = `${rotation.value}deg`;
    return {
      transform: [{ rotate: rotateValue }],
    };
  });

  const detailsStyle = useAnimatedStyle(() => {
    const heightValue = detailsHeight.value;
    const opacityValue = interpolate(
      heightValue,
      [0, 1],
      [0, 1],
      Extrapolate.CLAMP
    );
    
    return {
      opacity: opacityValue,
      maxHeight: heightValue === 0 ? 0 : 1000,
      overflow: 'hidden',
    };
  });

  const handlePressIn = () => {
    scale.value = withSpring(0.97);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const handleCheckboxPressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  return (
    <AnimatedTouchable
      entering={FadeInDown.delay(100 * index).duration(500)}
      style={[styles.techniqueCard, cardStyle, isLocked && styles.techniqueCardLocked]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.9}
    >
      <View style={styles.techniqueHeader}>
        {isLocked ? (
          <View style={styles.lockIconContainer}>
            <IconSymbol
              ios_icon_name="lock.fill"
              android_material_icon_name="lock"
              size={20}
              color={colors.textSecondary}
            />
          </View>
        ) : (
          <TouchableOpacity
            onPress={onCheckboxPress}
            onPressIn={handleCheckboxPressIn}
            style={styles.checkboxContainer}
            activeOpacity={0.7}
          >
            <View style={[
              styles.checkbox,
              isCompleted && styles.checkboxCompleted,
              isCompleted && { backgroundColor: categoryColor }
            ]}>
              {isCompleted && (
                <IconSymbol
                  ios_icon_name="checkmark"
                  android_material_icon_name="check"
                  size={16}
                  color="#FFFFFF"
                />
              )}
            </View>
          </TouchableOpacity>
        )}

        <View style={[styles.iconCircle, { backgroundColor: isLocked ? colors.border : colors.highlight }]}>
          <IconSymbol
            ios_icon_name={technique.icon}
            android_material_icon_name={technique.icon}
            size={24}
            color={isLocked ? colors.textSecondary : categoryColor}
          />
        </View>
        
        <View style={styles.techniqueInfo}>
          <Text style={styles.techniqueNumber}>{weekText}</Text>
          <Text style={[
            styles.techniqueTitle,
            isCompleted && styles.techniqueTitleCompleted,
            isLocked && styles.techniqueTitleLocked
          ]}>
            {technique.title}
          </Text>
        </View>

        {isLocked ? (
          <View style={styles.lockedBadge}>
            <Text style={styles.lockedBadgeText}>Locked</Text>
          </View>
        ) : (
          <Animated.View style={chevronStyle}>
            <IconSymbol
              ios_icon_name="chevron.down"
              android_material_icon_name="keyboard-arrow-down"
              size={24}
              color={colors.textSecondary}
            />
          </Animated.View>
        )}
      </View>

      {!isLocked && (
        <Animated.View style={[styles.techniqueDetails, detailsStyle]}>
          <View style={styles.divider} />
          
          <Text style={styles.detailLabel}>Practice Steps</Text>
          <View style={styles.bulletPointsContainer}>
            {technique.practiceSteps.map((step: string, stepIndex: number) => (
              <View key={stepIndex} style={styles.bulletPointRow}>
                <Text style={styles.bulletPoint}>•</Text>
                <Text style={styles.bulletPointText}>{step}</Text>
              </View>
            ))}
          </View>
          
          <Text style={styles.detailLabel}>Goal</Text>
          <View style={styles.goalContainer}>
            <IconSymbol
              ios_icon_name="target"
              android_material_icon_name="flag"
              size={18}
              color={colors.goal}
            />
            <Text style={styles.goalText}>{technique.goal}</Text>
          </View>
          
          <Text style={styles.detailLabel}>Practice Frequency</Text>
          <View style={styles.frequencyContainer}>
            <IconSymbol
              ios_icon_name="clock"
              android_material_icon_name="schedule"
              size={16}
              color={categoryColor}
            />
            <Text style={styles.frequencyText}>{technique.practiceFrequency}</Text>
          </View>
        </Animated.View>
      )}
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  welcomeHero: {
    marginTop: 20,
    marginBottom: 32,
    borderRadius: 24,
    overflow: 'hidden',
    boxShadow: '0px 8px 32px rgba(107, 76, 230, 0.3)',
    elevation: 8,
  },
  welcomeHeroGradient: {
    paddingVertical: 48,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  welcomeIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  welcomeSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 12,
    opacity: 0.95,
  },
  welcomeContent: {
    marginBottom: 32,
  },
  welcomeQuestion: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 32,
  },
  welcomeDescription: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 8,
  },
  welcomeStats: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0px 4px 16px rgba(107, 76, 230, 0.1)',
    elevation: 4,
  },
  welcomeStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  welcomeStatNumber: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.primary,
    marginTop: 8,
  },
  welcomeStatLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 4,
  },
  welcomeStatDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: 8,
  },
  welcomeButtonContainer: {
    marginBottom: 24,
  },
  guestButtonContainer: {
    marginTop: 12,
  },
  guestButton: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'transparent',
  },
  guestButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.primary,
  },
  welcomeButton: {
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0px 4px 20px rgba(107, 76, 230, 0.3)',
    elevation: 6,
  },
  welcomeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
    gap: 12,
  },
  welcomeButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  welcomeFooter: {
    padding: 20,
    backgroundColor: colors.highlight,
    borderRadius: 16,
    marginBottom: 20,
  },
  welcomeFooterText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 22,
  },
  motivationalBanner: {
    marginTop: 20,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0px 4px 20px rgba(107, 76, 230, 0.25)',
    elevation: 6,
  },
  motivationalGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 24,
    gap: 12,
  },
  motivationalText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 1.2,
  },
  selectionHeader: {
    marginTop: 24,
    marginBottom: 32,
    alignItems: 'center',
  },
  selectionTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  selectionSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  programCardsContainer: {
    gap: 20,
  },
  programCard: {
    borderRadius: 20,
    overflow: 'hidden',
    boxShadow: '0px 4px 16px rgba(107, 76, 230, 0.15)',
    elevation: 4,
  },
  programCardGradient: {
    padding: 24,
  },
  programCardIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  programCardTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  programCardDescription: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
    lineHeight: 22,
    marginBottom: 20,
    opacity: 0.95,
  },
  programCardStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  programCardStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  programCardStatText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  programCardButtonPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 6,
  },
  programCardButtonPrimaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  selectionFooter: {
    marginTop: 32,
    marginBottom: 20,
    padding: 20,
    backgroundColor: colors.highlight,
    borderRadius: 16,
  },
  selectionFooterText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 22,
  },
  header: {
    marginTop: 20,
    marginBottom: 24,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  freeTrialBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.highlight,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 8,
  },
  freeTrialText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  upgradeButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  upgradeButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  progressCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0px 2px 8px rgba(107, 76, 230, 0.08)',
    elevation: 2,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginLeft: 8,
  },
  progressBarContainer: {
    marginBottom: 12,
  },
  progressBarBackground: {
    height: 12,
    backgroundColor: colors.highlight,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  techniquesHeader: {
    marginBottom: 20,
  },
  techniquesHeaderTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  techniquesHeaderSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  techniquesContainer: {
    marginTop: 16,
  },
  techniqueCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0px 2px 8px rgba(107, 76, 230, 0.08)',
    elevation: 2,
  },
  techniqueCardLocked: {
    opacity: 0.7,
  },
  techniqueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lockIconContainer: {
    marginRight: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxContainer: {
    marginRight: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.card,
  },
  checkboxCompleted: {
    borderColor: 'transparent',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  techniqueInfo: {
    flex: 1,
  },
  techniqueNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 2,
  },
  techniqueTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  techniqueTitleCompleted: {
    color: colors.textSecondary,
  },
  techniqueTitleLocked: {
    color: colors.textSecondary,
  },
  lockedBadge: {
    backgroundColor: colors.border,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  lockedBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  techniqueDetails: {
    marginTop: 16,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    marginTop: 12,
  },
  bulletPointsContainer: {
    marginBottom: 8,
  },
  bulletPointRow: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingLeft: 4,
  },
  bulletPoint: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textSecondary,
    marginRight: 8,
    lineHeight: 20,
  },
  bulletPointText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '400',
    color: colors.textSecondary,
    lineHeight: 20,
  },
  goalContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.highlight,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 8,
    gap: 8,
  },
  goalText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.goal,
    lineHeight: 20,
  },
  frequencyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.highlight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  frequencyText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 6,
  },
  footer: {
    marginTop: 24,
    marginBottom: 20,
    padding: 16,
    backgroundColor: colors.highlight,
    borderRadius: 12,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 20,
  },
  // User info card
  userInfoCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 18,
    marginTop: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  userInfoGreetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userInfoAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${colors.primary}26`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfoNameStack: {
    flex: 1,
  },
  userInfoWelcomeLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: `${colors.text}99`,
    marginBottom: 2,
  },
  userInfoName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  userInfoRolePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  userInfoRolePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  userInfoStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userInfoStatusHalf: {
    flex: 1,
    paddingVertical: 4,
  },
  userInfoStatusDivider: {
    width: 1,
    height: '100%',
    backgroundColor: `${colors.border}80`,
    marginHorizontal: 16,
  },
  userInfoStatusLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: `${colors.text}99`,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  userInfoStatusValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  userInfoStatusValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userInfoStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  userInfoTrialBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 8,
  },
  userInfoTrialText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E3A8A',
  },
  userInfoActionGradientWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  userInfoActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 8,
  },
  userInfoActionGradientText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userInfoActionOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.primary,
    gap: 8,
  },
  userInfoActionOutlineText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
});
