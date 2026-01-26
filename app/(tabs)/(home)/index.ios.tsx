
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
import { techniques } from '@/data/techniques';

export default function HomeScreen() {
  console.log('HomeScreen rendered (iOS)');
  
  const [selectedTechnique, setSelectedTechnique] = useState<number | null>(null);
  
  const currentDay = 1;
  const totalDays = 90;
  const progressPercentage = (currentDay / totalDays) * 100;
  const progressText = `Day ${currentDay} of ${totalDays}`;

  const handleTechniquePress = (id: number) => {
    console.log('User tapped technique:', id);
    setSelectedTechnique(selectedTechnique === id ? null : id);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Emotional Control &</Text>
          <Text style={styles.headerTitle}>Confidence Development</Text>
          <Text style={styles.headerSubtitle}>90-Day Transformation Program</Text>
        </View>

        <View style={styles.progressCard}>
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
              <View 
                style={[
                  styles.progressBarFill, 
                  { width: `${progressPercentage}%` }
                ]} 
              />
            </View>
          </View>
          
          <Text style={styles.progressText}>{progressText}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>12 Core Techniques</Text>
          <Text style={styles.sectionSubtitle}>
            Practice these techniques daily to build emotional mastery and unshakeable confidence
          </Text>
        </View>

        <View style={styles.techniquesContainer}>
          {techniques.map((technique, index) => {
            const isExpanded = selectedTechnique === technique.id;
            const categoryColor = technique.category === 'emotional' 
              ? colors.primary 
              : colors.accent;
            const categoryLabel = technique.category === 'emotional' 
              ? 'Emotional Control' 
              : 'Confidence';

            return (
              <React.Fragment key={technique.id}>
                <TouchableOpacity
                  style={styles.techniqueCard}
                  onPress={() => handleTechniquePress(technique.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.techniqueHeader}>
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
                      <Text style={styles.techniqueTitle}>{technique.title}</Text>
                      <View style={[styles.categoryBadge, { backgroundColor: categoryColor }]}>
                        <Text style={styles.categoryText}>{categoryLabel}</Text>
                      </View>
                    </View>

                    <IconSymbol
                      ios_icon_name={isExpanded ? 'chevron.up' : 'chevron.down'}
                      android_material_icon_name={isExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                      size={24}
                      color={colors.textSecondary}
                    />
                  </View>

                  {isExpanded && (
                    <View style={styles.techniqueDetails}>
                      <View style={styles.divider} />
                      
                      <Text style={styles.detailLabel}>Description</Text>
                      <Text style={styles.detailText}>{technique.description}</Text>
                      
                      <Text style={styles.detailLabel}>Practice Frequency</Text>
                      <View style={styles.frequencyContainer}>
                        <IconSymbol
                          ios_icon_name="clock"
                          android_material_icon_name="schedule"
                          size={16}
                          color={colors.primary}
                        />
                        <Text style={styles.frequencyText}>{technique.practiceFrequency}</Text>
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              </React.Fragment>
            );
          })}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Consistency is key. Practice these techniques daily for 90 days to see lasting transformation.
          </Text>
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
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
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
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textSecondary,
    lineHeight: 20,
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
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  techniqueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
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
    color: colors.primary,
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
