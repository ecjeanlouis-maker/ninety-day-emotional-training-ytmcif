import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Modal,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import Animated, { FadeIn, FadeOut, FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { authenticatedPost } from '@/utils/api';

// ─── Enum types (must match backend exactly) ───────────────────────────────
type AgeRange = 'under_18' | '18_24' | '25_34' | '35_44' | '45_54' | '55_plus';
type MainGoal =
  | 'emotional_control'
  | 'build_confidence'
  | 'manage_anger'
  | 'reduce_stress'
  | 'social_anxiety'
  | 'thought_regulation';

// ─── Age range options ──────────────────────────────────────────────────────
const AGE_RANGES: { label: string; value: AgeRange }[] = [
  { label: 'Under 18', value: 'under_18' },
  { label: '18–24', value: '18_24' },
  { label: '25–34', value: '25_34' },
  { label: '35–44', value: '35_44' },
  { label: '45–54', value: '45_54' },
  { label: '55+', value: '55_plus' },
];

// ─── Main goal options ──────────────────────────────────────────────────────
const MAIN_GOALS: { label: string; value: MainGoal; icon: string; iconAndroid: string }[] = [
  { label: 'Emotional Control', value: 'emotional_control', icon: 'heart.fill', iconAndroid: 'favorite' },
  { label: 'Build Confidence', value: 'build_confidence', icon: 'star.fill', iconAndroid: 'star' },
  { label: 'Manage Anger', value: 'manage_anger', icon: 'flame.fill', iconAndroid: 'local_fire_department' },
  { label: 'Reduce Stress', value: 'reduce_stress', icon: 'leaf.fill', iconAndroid: 'spa' },
  { label: 'Social Anxiety', value: 'social_anxiety', icon: 'person.2.fill', iconAndroid: 'group' },
  { label: 'Thought Regulation', value: 'thought_regulation', icon: 'brain', iconAndroid: 'psychology' },
];

// ─── Level labels ───────────────────────────────────────────────────────────
const CONFIDENCE_LABELS: Record<number, string> = {
  1: 'Very low',
  2: 'Low',
  3: 'Moderate',
  4: 'High',
  5: 'Very high',
};

const EMOTIONAL_LABELS: Record<number, string> = {
  1: 'Reactive',
  2: 'Somewhat reactive',
  3: 'Moderate',
  4: 'Mostly regulated',
  5: 'Highly regulated',
};

export default function SignUpScreen() {
  const router = useRouter();
  const { signUpWithEmail } = useAuth();

  // ─── Step state ─────────────────────────────────────────────────────────
  const [step, setStep] = useState<1 | 2>(1);

  // ─── Step 1 fields ───────────────────────────────────────────────────────
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // ─── Step 2 fields ───────────────────────────────────────────────────────
  const [ageRange, setAgeRange] = useState<AgeRange | null>(null);
  const [mainGoal, setMainGoal] = useState<MainGoal | null>(null);
  const [confidenceLevel, setConfidenceLevel] = useState<number | null>(null);
  const [emotionalControlLevel, setEmotionalControlLevel] = useState<number | null>(null);

  // ─── Password visibility ─────────────────────────────────────────────────
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const submittingRef = useRef(false);

  // ─── UI state ────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'error' | 'success';
    onClose?: () => void;
  }>({ visible: false, title: '', message: '', type: 'error' });

  const showFeedback = (
    title: string,
    message: string,
    type: 'error' | 'success' = 'error',
    onClose?: () => void
  ) => {
    setFeedbackModal({ visible: true, title, message, type, onClose });
  };

  const hideFeedback = () => {
    const onClose = feedbackModal.onClose;
    setFeedbackModal((prev) => ({ ...prev, visible: false, onClose: undefined }));
    if (onClose) onClose();
  };

  // ─── Step 1 → Step 2 ────────────────────────────────────────────────────
  const handleContinue = () => {
    console.log('[SignUp] Continue pressed — step 1 validation');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (!fullName || fullName.trim().length < 2) {
      showFeedback('Name Required', 'Please enter your full name (at least 2 characters).', 'error');
      return;
    }
    const trimmedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail) {
      showFeedback('Email Required', 'Please enter your email address.', 'error');
      return;
    }
    if (!emailRegex.test(trimmedEmail)) {
      showFeedback('Invalid Email', 'Please enter a valid email address (e.g. name@example.com).', 'error');
      return;
    }
    setEmail(trimmedEmail);
    if (!password || password.length < 8) {
      showFeedback('Weak Password', 'Password must be at least 8 characters.', 'error');
      return;
    }
    if (password !== confirmPassword) {
      showFeedback('Password Mismatch', 'Passwords do not match. Please try again.', 'error');
      return;
    }

    console.log('[SignUp] Step 1 valid — advancing to step 2');
    setStep(2);
  };

  // ─── Back to Step 1 ─────────────────────────────────────────────────────
  const handleBack = () => {
    console.log('[SignUp] Back pressed — returning to step 1');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep(1);
  };

  // ─── Create Account ──────────────────────────────────────────────────────
  const handleCreateAccount = async () => {
    console.log('[SignUp] Create Account pressed — step 2 validation');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (!ageRange) {
      showFeedback('Age Range Required', 'Please select your age range.', 'error');
      return;
    }
    if (!mainGoal) {
      showFeedback('Goal Required', 'Please select your main goal.', 'error');
      return;
    }
    if (!confidenceLevel) {
      showFeedback('Confidence Level Required', 'Please rate your current confidence level.', 'error');
      return;
    }
    if (!emotionalControlLevel) {
      showFeedback('Emotional Control Required', 'Please rate your current emotional control level.', 'error');
      return;
    }

    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    try {
      console.log('[SignUp] Calling signUpWithEmail — email:', email);
      await signUpWithEmail(email, password, fullName.trim());
      console.log('[SignUp] Account created — now saving profile');

      // Give the auth layer a tick to store the token
      await new Promise((resolve) => setTimeout(resolve, 300));

      try {
        console.log('[SignUp] POST /api/profile — payload:', {
          full_name: fullName.trim(),
          age_range: ageRange,
          main_goal: mainGoal,
          confidence_level: confidenceLevel,
          emotional_control_level: emotionalControlLevel,
        });
        await authenticatedPost('/api/profile', {
          full_name: fullName.trim(),
          age_range: ageRange,
          main_goal: mainGoal,
          confidence_level: confidenceLevel,
          emotional_control_level: emotionalControlLevel,
        });
        console.log('[SignUp] Profile saved successfully');
        showFeedback(
          'Account Created!',
          'Check your email for a verification link to activate your account.',
          'success',
          () => router.replace('/email-verification-pending')
        );
      } catch (profileError: any) {
        console.warn('[SignUp] Profile save failed (non-blocking):', profileError?.message);
        showFeedback(
          'Account Created!',
          "Account created — couldn't save preferences. You can update them later.",
          'success',
          () => router.replace('/email-verification-pending')
        );
      }
    } catch (error: any) {
      console.log('[SignUp] Sign up failed:', error?.message);
      const errMsg = error?.message ?? '';
      const accountExists = /already|exists|taken/i.test(errMsg);
      const isNetwork = /fetch|network|failed to fetch/i.test(errMsg);
      showFeedback(
        isNetwork ? 'No Connection' : 'Sign Up Failed',
        isNetwork
          ? 'Check your internet connection and try again.'
          : accountExists
          ? 'Could not create account. Please check your details and try again.'
          : (errMsg || 'Could not create account. Please try again.'),
        'error'
      );
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  const handleGoToSignIn = () => {
    console.log('[SignUp] Navigate to Sign In tapped');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/auth');
  };

  // ─── Derived display values ──────────────────────────────────────────────
  const progressWidth = step === 1 ? '50%' : '100%';
  const stepLabel = step === 1 ? 'Step 1 of 2' : 'Step 2 of 2';
  const confidenceLabel = confidenceLevel ? CONFIDENCE_LABELS[confidenceLevel] : '';
  const emotionalLabel = emotionalControlLevel ? EMOTIONAL_LABELS[emotionalControlLevel] : '';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>CC</Text>
            </View>
            <Text style={styles.appName}>Control & Confidence</Text>
          </View>

          {/* Progress bar */}
          <View style={styles.progressContainer}>
            <Text style={styles.stepLabel}>{stepLabel}</Text>
            <View style={styles.progressTrack}>
              <Animated.View
                style={[styles.progressFill, { width: progressWidth }]}
              />
            </View>
          </View>

          {/* ── STEP 1 ── */}
          {step === 1 && (
            <Animated.View entering={FadeIn.duration(300)} style={styles.stepContainer}>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Join thousands transforming their lives</Text>

              <TextInput
                style={styles.input}
                placeholder="Full Name"
                placeholderTextColor="#999"
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
              />

              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#999"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, styles.inputFlex]}
                  placeholder="Password (min. 8 characters)"
                  placeholderTextColor="#999"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword((v) => !v)}
                  accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                  accessibilityRole="button"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.eyeButtonText}>{showPassword ? "🙈" : "👁"}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, styles.inputFlex]}
                  placeholder="Confirm Password"
                  placeholderTextColor="#999"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowConfirmPassword((v) => !v)}
                  accessibilityLabel={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  accessibilityRole="button"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.eyeButtonText}>{showConfirmPassword ? "🙈" : "👁"}</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.primaryButton} onPress={handleContinue} activeOpacity={0.85}>
                <Text style={styles.primaryButtonText}>Continue</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.switchModeButton} onPress={handleGoToSignIn}>
                <Text style={styles.switchModeText}>Already have an account? Sign In</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* ── STEP 2 ── */}
          {step === 2 && (
            <Animated.View entering={FadeInRight.duration(300)} style={styles.stepContainer}>
              <Text style={styles.title}>About You</Text>
              <Text style={styles.subtitle}>Help us personalise your experience</Text>

              {/* Age Range */}
              <Text style={styles.fieldLabel}>Age Range</Text>
              <View style={styles.pillRow}>
                {AGE_RANGES.map((item) => {
                  const isSelected = ageRange === item.value;
                  return (
                    <TouchableOpacity
                      key={item.value}
                      style={[styles.pill, isSelected && styles.pillSelected]}
                      onPress={() => {
                        console.log('[SignUp] Age range selected:', item.value);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setAgeRange(item.value);
                      }}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Main Goal */}
              <Text style={styles.fieldLabel}>Main Goal</Text>
              <View style={styles.goalGrid}>
                {MAIN_GOALS.map((item) => {
                  const isSelected = mainGoal === item.value;
                  return (
                    <TouchableOpacity
                      key={item.value}
                      style={[styles.goalCard, isSelected && styles.goalCardSelected]}
                      onPress={() => {
                        console.log('[SignUp] Main goal selected:', item.value);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setMainGoal(item.value);
                      }}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.goalIcon}>
                        {item.value === 'emotional_control' ? '❤️' :
                         item.value === 'build_confidence' ? '⭐' :
                         item.value === 'manage_anger' ? '🔥' :
                         item.value === 'reduce_stress' ? '🍃' :
                         item.value === 'social_anxiety' ? '👥' : '🧠'}
                      </Text>
                      <Text style={[styles.goalLabel, isSelected && styles.goalLabelSelected]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Confidence Level */}
              <Text style={styles.fieldLabel}>Current Confidence Level</Text>
              <View style={styles.levelRow}>
                {[1, 2, 3, 4, 5].map((n) => {
                  const isSelected = confidenceLevel === n;
                  return (
                    <TouchableOpacity
                      key={n}
                      style={[styles.levelCircle, isSelected && styles.levelCircleSelected]}
                      onPress={() => {
                        console.log('[SignUp] Confidence level selected:', n);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setConfidenceLevel(n);
                      }}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.levelNumber, isSelected && styles.levelNumberSelected]}>
                        {n}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {confidenceLabel !== '' && (
                <Text style={styles.levelHint}>{confidenceLabel}</Text>
              )}

              {/* Emotional Control Level */}
              <Text style={[styles.fieldLabel, { marginTop: 20 }]}>Current Emotional Control Level</Text>
              <View style={styles.levelRow}>
                {[1, 2, 3, 4, 5].map((n) => {
                  const isSelected = emotionalControlLevel === n;
                  return (
                    <TouchableOpacity
                      key={n}
                      style={[styles.levelCircle, isSelected && styles.levelCircleSelected]}
                      onPress={() => {
                        console.log('[SignUp] Emotional control level selected:', n);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setEmotionalControlLevel(n);
                      }}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.levelNumber, isSelected && styles.levelNumberSelected]}>
                        {n}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {emotionalLabel !== '' && (
                <Text style={styles.levelHint}>{emotionalLabel}</Text>
              )}

              {/* Buttons */}
              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.75}>
                  <Text style={styles.backButtonText}>← Back</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.primaryButtonFlex, loading && styles.buttonDisabled]}
                  onPress={handleCreateAccount}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Create Account</Text>
                  )}
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}
        </View>
      </ScrollView>

      {/* Feedback Modal */}
      <Modal
        visible={feedbackModal.visible}
        transparent
        animationType="fade"
        onRequestClose={hideFeedback}
      >
        <View style={styles.modalOverlay}>
          <Animated.View
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(200)}
            style={styles.feedbackModal}
          >
            <View
              style={[
                styles.feedbackIconContainer,
                { backgroundColor: feedbackModal.type === 'error' ? '#FFF0F0' : '#F0FFF4' },
              ]}
            >
              <Text style={styles.feedbackIcon}>
                {feedbackModal.type === 'error' ? '❌' : '✅'}
              </Text>
            </View>
            <Text style={styles.feedbackTitle}>{feedbackModal.title}</Text>
            <Text style={styles.feedbackMessage}>{feedbackModal.message}</Text>
            <TouchableOpacity
              style={[
                styles.feedbackButton,
                { backgroundColor: feedbackModal.type === 'error' ? '#FF3B30' : colors.success },
              ]}
              onPress={hideFeedback}
              activeOpacity={0.8}
            >
              <Text style={styles.feedbackButtonText}>OK</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  logoText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  appName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  progressContainer: {
    marginBottom: 28,
  },
  stepLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
    textAlign: 'center',
  },
  progressTrack: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  stepContainer: {
    flex: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 6,
    textAlign: 'center',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 20,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: colors.card,
    color: colors.text,
    fontWeight: '500',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // ── Age range pills ──────────────────────────────────────────────────────
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  pillSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  pillTextSelected: {
    color: '#FFFFFF',
  },
  // ── Goal grid ────────────────────────────────────────────────────────────
  goalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  goalCard: {
    width: '47%',
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 14,
    alignItems: 'center',
    gap: 6,
  },
  goalCardSelected: {
    backgroundColor: colors.highlight,
    borderColor: colors.primary,
  },
  goalIcon: {
    fontSize: 24,
  },
  goalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  goalLabelSelected: {
    color: colors.primary,
  },
  // ── Level circles ────────────────────────────────────────────────────────
  levelRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 6,
  },
  levelCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelCircleSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  levelNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  levelNumberSelected: {
    color: '#FFFFFF',
  },
  levelHint: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: 4,
  },
  // ── Buttons ──────────────────────────────────────────────────────────────
  primaryButton: {
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    elevation: 4,
  },
  primaryButtonFlex: {
    flex: 1,
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 32,
  },
  backButton: {
    height: 52,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.card,
  },
  backButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  switchModeButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  switchModeText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  inputFlex: {
    flex: 1,
    marginBottom: 0,
  },
  eyeButton: {
    paddingHorizontal: 12,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeButtonText: {
    fontSize: 18,
  },
  // ── Feedback modal ───────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  feedbackModal: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.background,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  feedbackIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  feedbackIcon: {
    fontSize: 36,
  },
  feedbackTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  feedbackMessage: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  feedbackButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  feedbackButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
