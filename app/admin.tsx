import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useUser } from '@/contexts/UserContext';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';

interface AdminCard {
  icon_ios: string;
  icon_android: string;
  title: string;
  description: string;
}

const ADMIN_CARDS: AdminCard[] = [
  {
    icon_ios: 'person.2.fill',
    icon_android: 'group',
    title: 'User Management',
    description: 'View and manage user accounts, roles, and access.',
  },
  {
    icon_ios: 'chart.bar.fill',
    icon_android: 'bar-chart',
    title: 'Subscription Insights',
    description: 'Monitor active subscriptions, trials, and revenue metrics.',
  },
  {
    icon_ios: 'shield.lefthalf.filled',
    icon_android: 'security',
    title: 'Content Moderation',
    description: 'Review flagged content and manage community guidelines.',
  },
];

export default function AdminDashboardScreen() {
  const router = useRouter();
  const { isAdmin } = useUser();

  useEffect(() => {
    if (!isAdmin) {
      console.warn('[Admin] Non-admin user attempted to access admin dashboard — redirecting');
      router.replace('/');
    }
  }, [isAdmin]);

  const handleBack = () => {
    console.log('[Admin] Back button pressed');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleViewCard = (title: string) => {
    console.log('[Admin] View tapped for card:', title);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
          <IconSymbol
            ios_icon_name="chevron.left"
            android_material_icon_name="arrow-back"
            size={20}
            color={colors.primary}
          />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Admin badge */}
        <View style={styles.adminBadgeRow}>
          <View style={styles.adminBadge}>
            <IconSymbol
              ios_icon_name="shield.checkmark"
              android_material_icon_name="verified-user"
              size={16}
              color="#FFFFFF"
            />
            <Text style={styles.adminBadgeText}>ADMIN</Text>
          </View>
          <Text style={styles.adminSubtitle}>Internal tools — restricted access</Text>
        </View>

        {/* Cards */}
        {ADMIN_CARDS.map((card) => (
          <View key={card.title} style={styles.card}>
            <View style={styles.cardLeft}>
              <View style={styles.cardIconContainer}>
                <IconSymbol
                  ios_icon_name={card.icon_ios}
                  android_material_icon_name={card.icon_android}
                  size={22}
                  color="#6B4CE6"
                />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>{card.title}</Text>
                <Text style={styles.cardDescription}>{card.description}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.viewButton}
              onPress={() => handleViewCard(card.title)}
              disabled
              activeOpacity={0.6}
            >
              <Text style={styles.viewButtonText}>Coming soon</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  headerSpacer: {
    width: 60,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  adminBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#6B4CE6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  adminBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  adminSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  cardIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F0EBFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 3,
  },
  cardDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  viewButton: {
    backgroundColor: colors.highlight,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    opacity: 0.7,
  },
  viewButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
