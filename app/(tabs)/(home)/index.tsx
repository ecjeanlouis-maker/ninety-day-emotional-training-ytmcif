
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
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
    color: '#95E1D3',
  },
  thoughts: {
    title: 'Thoughts Regulation',
    subtitle: '12-Week Mental Mastery Training',
    description: 'Master your mind and direct your thoughts intentionally with 12 methods',
    icon: 'psychology',
    iconIOS: 'brain.head.profile',
    color: '#A8E6CF',
  },
};

export default function HomeScreen() {
  console.log('HomeScreen rendered');
  
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

  const handleProgramSelect = (program: 'emotional' | 'confidence' | 'anger' | 'stress' | 'social-anxiety' | 'thoughts') => {
    console.log('User selected program:', program);
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

  const handleTechniquePress = (id: number) => {
    console.log('User tapped technique:', id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTechnique(selectedTechnique === id ? null : id);
  };

  const handleCheckboxPress = (id: number) => {
    console.log('User toggled technique completion:', id);
    
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

  const motivationalPhrase = 'BE THE BEST VERSION OF YOURSELF';

  if (!selectedProgram) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
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
            {(Object.keys(PROGRAM_CONFIGS) as Array<keyof typeof PROGRAM_CONFIGS>).map((programKey, index) => {
              const config = PROGRAM_CONFIGS[programKey];
              return (
                <TouchableOpacity
                  key={programKey}
                  style={styles.programCard}
                  onPress={() => handleProgramSelect(programKey)}
                  activeOpacity={0.9}
                >
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
                    <View style={styles.programCardButton}>
                      <Text style={styles.programCardButtonText}>Start Program</Text>
                      <IconSymbol
                        ios_icon_name="arrow.right"
                        android_material_icon_name="arrow-forward"
                        size={20}
                        color="#FFFFFF"
                      />
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}
          </Animated.View>

          <Animated.View 
            entering={FadeInDown.delay(600).duration(600)}
            style={styles.selectionFooter}
          >
            <Text style={styles.selectionFooterText}>
              Each program contains 12 weekly techniques designed for the 12-week duration of your 90-day journey.
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

            return (
              <TechniqueCard
                key={technique.id}
                technique={technique}
                index={index}
                isExpanded={isExpanded}
                isCompleted={isCompleted}
                categoryColor={programColor}
                weekText={weekText}
                onPress={() => handleTechniquePress(technique.id)}
                onCheckboxPress={() => handleCheckboxPress(technique.id)}
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
      style={[styles.techniqueCard, cardStyle]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.9}
    >
      <View style={styles.techniqueHeader}>
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

        <View style={[styles.iconCircle, { backgroundColor: colors.highlight }]}>
          <IconSymbol
            ios_icon_name={technique.icon}
            android_material_icon_name={technique.icon}
            size={24}
            color={categoryColor}
          />
        </View>
        
        <View style={styles.techniqueInfo}>
          <Text style={styles.techniqueNumber}>{weekText}</Text>
          <Text style={[
            styles.techniqueTitle,
            isCompleted && styles.techniqueTitleCompleted
          ]}>
            {technique.title}
          </Text>
        </View>

        <Animated.View style={chevronStyle}>
          <IconSymbol
            ios_icon_name="chevron.down"
            android_material_icon_name="keyboard-arrow-down"
            size={24}
            color={colors.textSecondary}
          />
        </Animated.View>
      </View>

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
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? 48 : 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
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
  programCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  programCardButtonText: {
    fontSize: 16,
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
  techniqueHeader: {
    flexDirection: 'row',
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
});
