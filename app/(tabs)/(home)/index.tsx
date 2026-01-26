
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
  
  const [selectedTechnique, setSelectedTechnique] = useState<number | null>(null);
  const [completedTechniques, setCompletedTechniques] = useState<Set<number>>(new Set());
  
  const currentDay = 1;
  const totalDays = 90;
  const progressPercentage = (currentDay / totalDays) * 100;
  const progressText = `Day ${currentDay} of ${totalDays}`;
  
  const progressAnimation = useSharedValue(0);

  const emotionalTechniques = techniques.filter(t => t.category === 'emotional');
  const confidenceTechniques = techniques.filter(t => t.category === 'confidence');

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
          <Text style={styles.headerTitle}>Emotional Control &</Text>
          <Text style={styles.headerTitle}>Confidence Development</Text>
          <Text style={styles.headerSubtitle}>90-Day Transformation Program</Text>
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
              color={colors.primary}
            />
            <Text style={styles.progressTitle}>Your Progress</Text>
          </View>
          
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBackground}>
              <Animated.View 
                style={[styles.progressBarFill, progressBarStyle]} 
              />
            </View>
          </View>
          
          <Text style={styles.progressText}>{progressText}</Text>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{completedTechniques.size}</Text>
              <Text style={styles.statLabel}>Completed Today</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{techniques.length}</Text>
              <Text style={styles.statLabel}>Total Techniques</Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View 
          entering={FadeInDown.delay(300).duration(600)}
          style={styles.categorySection}
        >
          <View style={styles.categorySectionHeader}>
            <IconSymbol
              ios_icon_name="brain"
              android_material_icon_name="psychology"
              size={28}
              color={colors.primary}
            />
            <Text style={styles.categorySectionTitle}>Emotional Control</Text>
          </View>
          <Text style={styles.categorySectionSubtitle}>
            Master your emotions and respond with clarity
          </Text>
        </Animated.View>

        <View style={styles.techniquesContainer}>
          {emotionalTechniques.map((technique, index) => {
            const isExpanded = selectedTechnique === technique.id;
            const isCompleted = completedTechniques.has(technique.id);
            const categoryColor = colors.primary;
            const categoryLabel = 'Emotional Control';

            return (
              <TechniqueCard
                key={technique.id}
                technique={technique}
                index={index}
                isExpanded={isExpanded}
                isCompleted={isCompleted}
                categoryColor={categoryColor}
                categoryLabel={categoryLabel}
                onPress={() => handleTechniquePress(technique.id)}
                onCheckboxPress={() => handleCheckboxPress(technique.id)}
              />
            );
          })}
        </View>

        <Animated.View 
          entering={FadeInDown.delay(400).duration(600)}
          style={styles.categorySection}
        >
          <View style={styles.categorySectionHeader}>
            <IconSymbol
              ios_icon_name="star"
              android_material_icon_name="star"
              size={28}
              color={colors.accent}
            />
            <Text style={styles.categorySectionTitle}>Confidence Development</Text>
          </View>
          <Text style={styles.categorySectionSubtitle}>
            Build unshakeable self-belief and inner strength
          </Text>
        </Animated.View>

        <View style={styles.techniquesContainer}>
          {confidenceTechniques.map((technique, index) => {
            const isExpanded = selectedTechnique === technique.id;
            const isCompleted = completedTechniques.has(technique.id);
            const categoryColor = colors.accent;
            const categoryLabel = 'Confidence Development';

            return (
              <TechniqueCard
                key={technique.id}
                technique={technique}
                index={index}
                isExpanded={isExpanded}
                isCompleted={isCompleted}
                categoryColor={categoryColor}
                categoryLabel={categoryLabel}
                onPress={() => handleTechniquePress(technique.id)}
                onCheckboxPress={() => handleCheckboxPress(technique.id)}
              />
            );
          })}
        </View>

        <Animated.View 
          entering={FadeInDown.delay(500).duration(600)}
          style={styles.footer}
        >
          <Text style={styles.footerText}>
            Consistency is key. Practice these techniques daily for 90 days to see lasting transformation.
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
  categoryLabel: string;
  onPress: () => void;
  onCheckboxPress: () => void;
}

function TechniqueCard({
  technique,
  index,
  isExpanded,
  isCompleted,
  categoryColor,
  categoryLabel,
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
          <Text style={styles.techniqueNumber}>Technique {technique.id}</Text>
          <Text style={[
            styles.techniqueTitle,
            isCompleted && styles.techniqueTitleCompleted
          ]}>
            {technique.title}
          </Text>
          <View style={[styles.categoryBadge, { backgroundColor: categoryColor }]}>
            <Text style={styles.categoryText}>{categoryLabel}</Text>
          </View>
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
  header: {
    marginTop: 20,
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
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
    backgroundColor: colors.primary,
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
    color: colors.primary,
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
  categorySection: {
    marginTop: 32,
    marginBottom: 20,
  },
  categorySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  categorySectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginLeft: 12,
  },
  categorySectionSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textSecondary,
    lineHeight: 20,
    marginLeft: 40,
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
    marginBottom: 6,
  },
  techniqueTitleCompleted: {
    color: colors.textSecondary,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
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
