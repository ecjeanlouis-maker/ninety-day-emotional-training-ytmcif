
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
import { welcomeContent } from '@/data/welcomeContent';
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

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function HomeScreen() {
  console.log('HomeScreen rendered');
  
  const [selectedProgram, setSelectedProgram] = useState<ProgramType>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [selectedTechnique, setSelectedTechnique] = useState<number | null>(null);
  const [completedTechniques, setCompletedTechniques] = useState<Set<number>>(new Set());
  
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

  const handleProgramSelect = (program: 'emotional' | 'confidence') => {
    console.log('User selected program:', program);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedProgram(program);
    setShowWelcome(true);
    setSelectedTechnique(null);
    setCompletedTechniques(new Set());
  };

  const handleContinueFromWelcome = () => {
    console.log('User continuing from welcome screen');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowWelcome(false);
  };

  const handleBackToSelection = () => {
    console.log('User navigating back to program selection');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedProgram(null);
    setShowWelcome(false);
    setSelectedTechnique(null);
  };

  const handleTechniquePress = (id: number) => {
    console.log('User tapped technique:', id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTechnique(selectedTechnique === id ? null : id);
  };

  const handleCheckboxPress = (id: number) => {
    console.log('User toggled technique completion:', id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    setCompletedTechniques(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  if (!selectedProgram) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View 
            entering={FadeIn.duration(600)}
            style={styles.selectionHeader}
          >
            <Text style={styles.selectionTitle}>Choose Your</Text>
            <Text style={styles.selectionTitle}>12-Week Program</Text>
            <Text style={styles.selectionSubtitle}>
              Select one program to begin your 90-day transformation journey
            </Text>
          </Animated.View>

          <Animated.View 
            entering={FadeInDown.delay(200).duration(600)}
            style={styles.programCardsContainer}
          >
            <TouchableOpacity
              style={styles.programCard}
              onPress={() => handleProgramSelect('emotional')}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={[colors.primary, colors.primary + 'DD']}
                style={styles.programCardGradient}
              >
                <View style={styles.programCardIconContainer}>
                  <IconSymbol
                    ios_icon_name="brain"
                    android_material_icon_name="psychology"
                    size={48}
                    color="#FFFFFF"
                  />
                </View>
                <Text style={styles.programCardTitle}>Emotional Control</Text>
                <Text style={styles.programCardDescription}>
                  Master your emotions and respond with clarity through 12 powerful techniques
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

            <TouchableOpacity
              style={styles.programCard}
              onPress={() => handleProgramSelect('confidence')}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={[colors.accent, colors.accent + 'DD']}
                style={styles.programCardGradient}
              >
                <View style={styles.programCardIconContainer}>
                  <IconSymbol
                    ios_icon_name="star"
                    android_material_icon_name="star"
                    size={48}
                    color="#FFFFFF"
                  />
                </View>
                <Text style={styles.programCardTitle}>Confidence Development</Text>
                <Text style={styles.programCardDescription}>
                  Build unshakeable self-belief and inner strength with 12 proven methods
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
          </Animated.View>

          <Animated.View 
            entering={FadeInDown.delay(400).duration(600)}
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

  const programColor = selectedProgram === 'emotional' ? colors.primary : colors.accent;
  const programTitle = selectedProgram === 'emotional' ? 'Emotional Control' : 'Confidence Development';
  const programIcon = selectedProgram === 'emotional' ? 'psychology' : 'star';
  const programIconIOS = selectedProgram === 'emotional' ? 'brain' : 'star';
  const content = welcomeContent[selectedProgram];

  if (showWelcome) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View 
            entering={FadeIn.duration(600)}
            style={styles.welcomeHeader}
          >
            <View style={styles.welcomeIconContainer}>
              <LinearGradient
                colors={[programColor, programColor + 'DD']}
                style={styles.welcomeIconGradient}
              >
                <IconSymbol
                  ios_icon_name={programIconIOS}
                  android_material_icon_name={programIcon}
                  size={64}
                  color="#FFFFFF"
                />
              </LinearGradient>
            </View>
            <Text style={styles.welcomeTitle}>Welcome!</Text>
            <Text style={[styles.welcomeProgramTitle, { color: programColor }]}>
              {programTitle}
            </Text>
          </Animated.View>

          <Animated.View 
            entering={FadeInDown.delay(200).duration(600)}
            style={styles.welcomeMessageCard}
          >
            <View style={styles.welcomeMessageHeader}>
              <IconSymbol
                ios_icon_name="info.circle"
                android_material_icon_name="info"
                size={24}
                color={programColor}
              />
              <Text style={styles.welcomeMessageTitle}>Your Journey Begins</Text>
            </View>
            <Text style={styles.welcomeMessageText}>{content.welcomeMessage}</Text>
          </Animated.View>

          <Animated.View 
            entering={FadeInDown.delay(300).duration(600)}
            style={styles.quoteCard}
          >
            <View style={styles.quoteIconContainer}>
              <IconSymbol
                ios_icon_name="quote"
                android_material_icon_name="format-quote"
                size={32}
                color={programColor}
              />
            </View>
            <Text style={styles.quoteText}>{content.motivationalQuote}</Text>
            <Text style={styles.quoteAuthor}>{content.quoteAuthor}</Text>
          </Animated.View>

          <Animated.View 
            entering={FadeInDown.delay(400).duration(600)}
            style={styles.testimoniesSection}
          >
            <View style={styles.testimoniesHeader}>
              <IconSymbol
                ios_icon_name="person.2"
                android_material_icon_name="group"
                size={24}
                color={programColor}
              />
              <Text style={styles.testimoniesTitle}>Success Stories</Text>
            </View>
            <Text style={styles.testimoniesSubtitle}>
              Hear from others who transformed their lives
            </Text>

            {content.testimonies.map((testimony, index) => (
              <Animated.View
                key={testimony.id}
                entering={FadeInDown.delay(500 + index * 100).duration(600)}
                style={styles.testimonyCard}
              >
                <View style={styles.testimonyHeader}>
                  <View style={styles.testimonyAvatar}>
                    <IconSymbol
                      ios_icon_name="person"
                      android_material_icon_name="person"
                      size={24}
                      color={programColor}
                    />
                  </View>
                  <View style={styles.testimonyInfo}>
                    <Text style={styles.testimonyName}>{testimony.name}</Text>
                    <View style={styles.testimonyRating}>
                      {[...Array(testimony.rating)].map((_, i) => (
                        <IconSymbol
                          key={i}
                          ios_icon_name="star.fill"
                          android_material_icon_name="star"
                          size={14}
                          color={programColor}
                        />
                      ))}
                    </View>
                  </View>
                </View>
                <Text style={styles.testimonyText}>{testimony.text}</Text>
              </Animated.View>
            ))}
          </Animated.View>

          <Animated.View 
            entering={FadeInDown.delay(800).duration(600)}
            style={styles.welcomeFooter}
          >
            <TouchableOpacity
              style={[styles.continueButton, { backgroundColor: programColor }]}
              onPress={handleContinueFromWelcome}
              activeOpacity={0.8}
            >
              <Text style={styles.continueButtonText}>Begin Your Journey</Text>
              <IconSymbol
                ios_icon_name="arrow.right"
                android_material_icon_name="arrow-forward"
                size={24}
                color="#FFFFFF"
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backLink}
              onPress={handleBackToSelection}
              activeOpacity={0.7}
            >
              <IconSymbol
                ios_icon_name="arrow.left"
                android_material_icon_name="arrow-back"
                size={18}
                color={colors.textSecondary}
              />
              <Text style={styles.backLinkText}>Choose Different Program</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    );
  }

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
          <Text style={styles.headerSubtitle}>12-Week Transformation Program</Text>
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
        
        <Text style={styles.detailLabel}>Description</Text>
        <Text style={styles.detailText}>{technique.description}</Text>
        
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
  selectionHeader: {
    marginTop: 40,
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
  welcomeHeader: {
    marginTop: 40,
    marginBottom: 32,
    alignItems: 'center',
  },
  welcomeIconContainer: {
    marginBottom: 24,
  },
  welcomeIconGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0px 8px 24px rgba(107, 76, 230, 0.25)',
    elevation: 8,
  },
  welcomeTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
  },
  welcomeProgramTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  welcomeMessageCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0px 2px 8px rgba(107, 76, 230, 0.08)',
    elevation: 2,
  },
  welcomeMessageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  welcomeMessageTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginLeft: 8,
  },
  welcomeMessageText: {
    fontSize: 15,
    fontWeight: '400',
    color: colors.textSecondary,
    lineHeight: 24,
  },
  quoteCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0px 2px 8px rgba(107, 76, 230, 0.08)',
    elevation: 2,
    alignItems: 'center',
  },
  quoteIconContainer: {
    marginBottom: 16,
  },
  quoteText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    lineHeight: 26,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  quoteAuthor: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  testimoniesSection: {
    marginBottom: 20,
  },
  testimoniesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  testimoniesTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginLeft: 8,
  },
  testimoniesSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 16,
  },
  testimonyCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0px 2px 8px rgba(107, 76, 230, 0.08)',
    elevation: 2,
  },
  testimonyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  testimonyAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.highlight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  testimonyInfo: {
    flex: 1,
  },
  testimonyName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  testimonyRating: {
    flexDirection: 'row',
    gap: 2,
  },
  testimonyText: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textSecondary,
    lineHeight: 22,
  },
  welcomeFooter: {
    marginTop: 12,
    marginBottom: 20,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    gap: 12,
    boxShadow: '0px 4px 16px rgba(107, 76, 230, 0.25)',
    elevation: 4,
    marginBottom: 16,
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  backLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
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
    marginBottom: 6,
    marginTop: 12,
  },
  detailText: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textSecondary,
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
