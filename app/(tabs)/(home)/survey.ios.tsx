
import React, { useState } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeInDown,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { ProgramType } from '@/types/program';

interface Question {
  id: number;
  question: string;
  options: {
    text: string;
    programs: ProgramType[];
  }[];
}

const SURVEY_QUESTIONS: Question[] = [
  {
    id: 1,
    question: 'How do you typically react when something unexpected or frustrating happens?',
    options: [
      {
        text: 'I feel overwhelmed and struggle to control my emotions',
        programs: ['emotional', 'stress'],
      },
      {
        text: 'I get angry quickly and sometimes lash out',
        programs: ['anger', 'emotional'],
      },
      {
        text: 'I doubt myself and feel anxious about handling it',
        programs: ['confidence', 'stress'],
      },
      {
        text: 'I worry about what others will think of me',
        programs: ['social-anxiety', 'confidence'],
      },
    ],
  },
  {
    id: 2,
    question: 'What is your biggest challenge in social situations?',
    options: [
      {
        text: 'I feel anxious and uncomfortable around people',
        programs: ['social-anxiety', 'confidence'],
      },
      {
        text: 'I struggle to express myself without getting emotional',
        programs: ['emotional', 'anger'],
      },
      {
        text: 'I lack confidence and feel inferior to others',
        programs: ['confidence', 'thoughts'],
      },
      {
        text: 'I feel stressed and drained after social interactions',
        programs: ['stress', 'social-anxiety'],
      },
    ],
  },
  {
    id: 3,
    question: 'How would you describe your inner dialogue (self-talk)?',
    options: [
      {
        text: 'Mostly negative and self-critical',
        programs: ['thoughts', 'confidence'],
      },
      {
        text: 'Anxious and worried about the future',
        programs: ['stress', 'thoughts'],
      },
      {
        text: 'Angry and resentful about past events',
        programs: ['anger', 'thoughts'],
      },
      {
        text: 'Fearful of judgment and rejection',
        programs: ['social-anxiety', 'thoughts'],
      },
    ],
  },
  {
    id: 4,
    question: 'What happens when you face a challenging situation?',
    options: [
      {
        text: 'I feel paralyzed and unable to take action',
        programs: ['confidence', 'stress'],
      },
      {
        text: 'I react impulsively without thinking',
        programs: ['emotional', 'anger'],
      },
      {
        text: 'I overthink and get stuck in negative thoughts',
        programs: ['thoughts', 'stress'],
      },
      {
        text: 'I avoid it because I fear failure or judgment',
        programs: ['social-anxiety', 'confidence'],
      },
    ],
  },
  {
    id: 5,
    question: 'Which statement best describes your current state?',
    options: [
      {
        text: 'I feel constantly stressed and overwhelmed',
        programs: ['stress', 'emotional'],
      },
      {
        text: 'I struggle with anger and frustration regularly',
        programs: ['anger', 'emotional'],
      },
      {
        text: 'I lack self-confidence and self-belief',
        programs: ['confidence', 'thoughts'],
      },
      {
        text: 'I avoid social situations due to anxiety',
        programs: ['social-anxiety', 'confidence'],
      },
    ],
  },
  {
    id: 6,
    question: 'What would make the biggest positive impact on your life right now?',
    options: [
      {
        text: 'Learning to manage my emotions effectively',
        programs: ['emotional', 'stress'],
      },
      {
        text: 'Controlling my anger and responding calmly',
        programs: ['anger', 'emotional'],
      },
      {
        text: 'Building unshakeable confidence and self-belief',
        programs: ['confidence', 'thoughts'],
      },
      {
        text: 'Overcoming social anxiety and connecting with others',
        programs: ['social-anxiety', 'confidence'],
      },
      {
        text: 'Mastering my thoughts and mental patterns',
        programs: ['thoughts', 'stress'],
      },
      {
        text: 'Reducing stress and finding balance',
        programs: ['stress', 'emotional'],
      },
    ],
  },
];

const PROGRAM_INFO = {
  emotional: {
    title: 'Emotional Control',
    description: 'Master your emotions and respond with clarity',
    color: colors.primary,
    icon: 'psychology',
    iconIOS: 'brain',
  },
  confidence: {
    title: 'Confidence Development',
    description: 'Build unshakeable self-belief and inner strength',
    color: colors.accent,
    icon: 'star',
    iconIOS: 'star',
  },
  anger: {
    title: 'Anger Management',
    description: 'Transform anger into constructive action',
    color: '#FF6B6B',
    icon: 'warning',
    iconIOS: 'exclamationmark.triangle',
  },
  stress: {
    title: 'Stress Management',
    description: 'Build resilience and manage stress effectively',
    color: '#4ECDC4',
    icon: 'spa',
    iconIOS: 'leaf',
  },
  'social-anxiety': {
    title: 'Social Anxiety',
    description: 'Overcome social fears and build authentic connections',
    color: '#9B59B6',
    icon: 'group',
    iconIOS: 'person.3',
  },
  thoughts: {
    title: 'Thoughts Regulation',
    description: 'Master your mind and direct your thoughts intentionally',
    color: '#27AE60',
    icon: 'psychology',
    iconIOS: 'brain.head.profile',
  },
};

interface SurveyProps {
  onComplete: (recommendedPrograms: ProgramType[]) => void;
  onBack: () => void;
}

export default function Survey({ onComplete, onBack }: SurveyProps) {
  console.log('Survey screen rendered (iOS)');
  
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [recommendedPrograms, setRecommendedPrograms] = useState<ProgramType[]>([]);

  const handleAnswer = (optionIndex: number) => {
    console.log('User selected option:', optionIndex, 'for question:', currentQuestion);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const newAnswers = [...answers, optionIndex];
    setAnswers(newAnswers);

    if (currentQuestion < SURVEY_QUESTIONS.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      calculateResults(newAnswers);
    }
  };

  const calculateResults = (finalAnswers: number[]) => {
    console.log('Calculating survey results');
    
    const programScores: Record<string, number> = {
      emotional: 0,
      confidence: 0,
      anger: 0,
      stress: 0,
      'social-anxiety': 0,
      thoughts: 0,
    };

    finalAnswers.forEach((answerIndex, questionIndex) => {
      const question = SURVEY_QUESTIONS[questionIndex];
      const selectedOption = question.options[answerIndex];
      
      selectedOption.programs.forEach(program => {
        programScores[program] = (programScores[program] || 0) + 1;
      });
    });

    const sortedPrograms = Object.entries(programScores)
      .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
      .map(([program]) => program as ProgramType);

    const topScore = programScores[sortedPrograms[0]];
    const recommended = sortedPrograms.filter(
      program => programScores[program] >= topScore - 1
    ).slice(0, 3);

    console.log('Recommended programs:', recommended);
    setRecommendedPrograms(recommended);
    setShowResults(true);
  };

  const handleBack = () => {
    console.log('User navigating back');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      setAnswers(answers.slice(0, -1));
    } else {
      onBack();
    }
  };

  const handleSkipSurvey = () => {
    console.log('User skipped survey');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onComplete([]);
  };

  const handleSelectProgram = (program: ProgramType) => {
    console.log('User selected program from results (iOS):', program);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onComplete([program]);
  };

  const handleBrowseAllPrograms = () => {
    console.log('User wants to browse all programs (iOS)');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onComplete(recommendedPrograms);
  };

  const progressPercentage = ((currentQuestion + 1) / SURVEY_QUESTIONS.length) * 100;
  const progressText = `Question ${currentQuestion + 1} of ${SURVEY_QUESTIONS.length}`;

  if (showResults) {
    return (
      <>
        <SafeAreaView style={styles.container} edges={['top']}>
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View 
              entering={FadeIn.duration(800)}
              style={styles.resultsHeader}
            >
              <View style={styles.resultsIconContainer}>
                <LinearGradient
                  colors={[colors.primary, colors.accent]}
                  style={styles.resultsIconGradient}
                >
                  <IconSymbol
                    ios_icon_name="checkmark.circle.fill"
                    android_material_icon_name="check-circle"
                    size={64}
                    color="#FFFFFF"
                  />
                </LinearGradient>
              </View>
              
              <Text style={styles.resultsTitle}>Assessment Complete!</Text>
              <Text style={styles.resultsSubtitle}>
                Based on your responses, we recommend the following programs:
              </Text>
            </Animated.View>

            <View style={styles.recommendedProgramsContainer}>
              {recommendedPrograms.map((program, index) => {
                const programInfo = PROGRAM_INFO[program];
                const delayValue = 200 + (index * 150);
                
                return (
                  <Animated.View
                    key={program}
                    entering={FadeInDown.delay(delayValue).duration(600)}
                  >
                    <TouchableOpacity
                      style={styles.resultProgramCard}
                      onPress={() => handleSelectProgram(program)}
                      activeOpacity={0.9}
                    >
                      <LinearGradient
                        colors={[programInfo.color, programInfo.color + 'DD']}
                        style={styles.resultProgramGradient}
                      >
                        {index === 0 && (
                          <View style={styles.bestMatchBadge}>
                            <IconSymbol
                              ios_icon_name="star.fill"
                              android_material_icon_name="star"
                              size={16}
                              color="#FFFFFF"
                            />
                            <Text style={styles.bestMatchText}>Best Match</Text>
                          </View>
                        )}
                        
                        <View style={styles.resultProgramIconContainer}>
                          <IconSymbol
                            ios_icon_name={programInfo.iconIOS}
                            android_material_icon_name={programInfo.icon}
                            size={48}
                            color="#FFFFFF"
                          />
                        </View>
                        
                        <Text style={styles.resultProgramTitle}>{programInfo.title}</Text>
                        <Text style={styles.resultProgramDescription}>
                          {programInfo.description}
                        </Text>
                        
                        <View style={styles.resultProgramButton}>
                          <Text style={styles.resultProgramButtonText}>Start Program</Text>
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
                );
              })}
            </View>

            <Animated.View 
              entering={FadeInDown.delay(800).duration(600)}
              style={styles.resultsFooter}
            >
              <Text style={styles.resultsFooterText}>
                You can start with any of these programs. Each contains 12 weekly techniques designed for lasting transformation.
              </Text>
              
              <TouchableOpacity
                style={styles.browseAllButton}
                onPress={handleBrowseAllPrograms}
                activeOpacity={0.7}
              >
                <IconSymbol
                  ios_icon_name="square.grid.2x2"
                  android_material_icon_name="apps"
                  size={20}
                  color={colors.primary}
                />
                <Text style={styles.browseAllButtonText}>Browse All Programs</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.retakeButton}
                onPress={() => {
                  console.log('User retaking survey');
                  setCurrentQuestion(0);
                  setAnswers([]);
                  setShowResults(false);
                  setRecommendedPrograms([]);
                }}
                activeOpacity={0.7}
              >
                <IconSymbol
                  ios_icon_name="arrow.counterclockwise"
                  android_material_icon_name="refresh"
                  size={20}
                  color={colors.textSecondary}
                />
                <Text style={styles.retakeButtonText}>Retake Assessment</Text>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </SafeAreaView>
      </>
    );
  }

  const question = SURVEY_QUESTIONS[currentQuestion];

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
          <View style={styles.headerRow}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={handleBack}
              activeOpacity={0.7}
            >
              <IconSymbol
                ios_icon_name="arrow.left"
                android_material_icon_name="arrow-back"
                size={24}
                color={colors.text}
              />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.skipButton}
              onPress={handleSkipSurvey}
              activeOpacity={0.7}
            >
              <Text style={styles.skipButtonText}>Skip</Text>
              <IconSymbol
                ios_icon_name="arrow.right"
                android_material_icon_name="arrow-forward"
                size={20}
                color={colors.primary}
              />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.headerTitle}>Assessment</Text>
        </Animated.View>

        <Animated.View 
          entering={FadeInDown.delay(200).duration(600)}
          style={styles.progressCard}
        >
          <Text style={styles.progressText}>{progressText}</Text>
          
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBackground}>
              <Animated.View 
                style={[
                  styles.progressBarFill,
                  { width: `${progressPercentage}%` }
                ]} 
              />
            </View>
          </View>
        </Animated.View>

        <Animated.View
          key={currentQuestion}
          entering={FadeInDown.duration(600)}
          exiting={FadeOut.duration(300)}
          style={styles.questionCard}
        >
          <View style={styles.questionIconContainer}>
            <LinearGradient
              colors={[colors.primary, colors.accent]}
              style={styles.questionIconGradient}
            >
              <IconSymbol
                ios_icon_name="questionmark.circle.fill"
                android_material_icon_name="help"
                size={40}
                color="#FFFFFF"
              />
            </LinearGradient>
          </View>
          
          <Text style={styles.questionText}>{question.question}</Text>
        </Animated.View>

        <View style={styles.optionsContainer}>
          {question.options.map((option, index) => {
            const delayValue = 400 + (index * 100);
            
            return (
              <Animated.View
                key={index}
                entering={FadeInDown.delay(delayValue).duration(500)}
              >
                <TouchableOpacity
                  style={styles.optionCard}
                  onPress={() => handleAnswer(index)}
                  activeOpacity={0.8}
                >
                  <View style={styles.optionContent}>
                    <View style={styles.optionIconCircle}>
                      <IconSymbol
                        ios_icon_name="circle"
                        android_material_icon_name="radio-button-unchecked"
                        size={24}
                        color={colors.primary}
                      />
                    </View>
                    <Text style={styles.optionText}>{option.text}</Text>
                  </View>
                  <IconSymbol
                    ios_icon_name="chevron.right"
                    android_material_icon_name="chevron-right"
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
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
  header: {
    marginTop: 20,
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: colors.highlight,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  skipButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
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
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  progressBarContainer: {
    height: 8,
  },
  progressBarBackground: {
    height: '100%',
    backgroundColor: colors.highlight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  questionCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0px 4px 16px rgba(107, 76, 230, 0.12)',
    elevation: 4,
    alignItems: 'center',
  },
  questionIconContainer: {
    marginBottom: 20,
  },
  questionIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  questionText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 28,
  },
  optionsContainer: {
    gap: 12,
  },
  optionCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: '0px 2px 8px rgba(107, 76, 230, 0.06)',
    elevation: 2,
  },
  optionContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.highlight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 22,
  },
  resultsHeader: {
    marginTop: 20,
    marginBottom: 32,
    alignItems: 'center',
  },
  resultsIconContainer: {
    marginBottom: 24,
  },
  resultsIconGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultsTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  resultsSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  recommendedProgramsContainer: {
    gap: 20,
    marginBottom: 32,
  },
  resultProgramCard: {
    borderRadius: 20,
    overflow: 'hidden',
    boxShadow: '0px 4px 16px rgba(107, 76, 230, 0.15)',
    elevation: 4,
  },
  resultProgramGradient: {
    padding: 24,
    position: 'relative',
  },
  bestMatchBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  bestMatchText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  resultProgramIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultProgramTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  resultProgramDescription: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
    lineHeight: 22,
    marginBottom: 20,
    opacity: 0.95,
  },
  resultProgramButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  resultProgramButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  resultsFooter: {
    padding: 20,
    backgroundColor: colors.highlight,
    borderRadius: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  resultsFooterText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  browseAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    marginBottom: 12,
  },
  browseAllButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  retakeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
