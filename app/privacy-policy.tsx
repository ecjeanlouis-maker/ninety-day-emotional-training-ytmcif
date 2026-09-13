import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  const handleBack = () => {
    console.log('[PrivacyPolicy] Back button tapped');
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <Text style={styles.bodyText}>
            This Privacy Policy describes how NEXTECH Digital Services ("we", "us", or "our") collects, uses, and protects your information when you use the Control & Confidence (ECCT) mobile application ("App"). By using the App, you agree to the practices described in this policy.
          </Text>
          <Text style={styles.bodyText}>
            Last updated: June 2025
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Information We Collect</Text>
          <Text style={styles.subHeading}>Account Information</Text>
          <Text style={styles.bodyText}>
            When you create an account, we collect your name and email address. If you sign in with Google, we receive your name, email, and profile picture from Google. We do not collect your password in plain text — passwords are securely hashed.
          </Text>
          <Text style={styles.subHeading}>Usage Analytics</Text>
          <Text style={styles.bodyText}>
            We collect anonymous usage data such as which features you use, how often you open the app, and general navigation patterns. This data does not identify you personally and is used solely to improve the App. You can opt out of analytics at any time in Account & Privacy settings.
          </Text>
          <Text style={styles.subHeading}>Journal Entries</Text>
          <Text style={styles.bodyText}>
            If you use the journaling features, your entries are stored securely on our servers and associated with your account. Journal content is private and is never shared with third parties or used for advertising.
          </Text>
          <Text style={styles.subHeading}>Subscription Status</Text>
          <Text style={styles.bodyText}>
            We store your subscription status (free or Pro) to unlock premium features. Payment processing is handled entirely by Apple or Google — we never see or store your payment card details.
          </Text>
          <Text style={styles.subHeading}>Device Information</Text>
          <Text style={styles.bodyText}>
            We may collect basic device information (operating system, app version) for debugging and support purposes.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How We Use Your Information</Text>
          <Text style={styles.bodyText}>
            We use the information we collect to:
          </Text>
          <Text style={styles.bulletText}>• Provide and maintain the App and its features</Text>
          <Text style={styles.bulletText}>• Authenticate your account and keep it secure</Text>
          <Text style={styles.bulletText}>• Sync your progress and journal entries across devices</Text>
          <Text style={styles.bulletText}>• Improve the App based on anonymous usage analytics</Text>
          <Text style={styles.bulletText}>• Respond to support requests and troubleshoot issues</Text>
          <Text style={styles.bulletText}>• Enforce our Terms of Service</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Third-Party Services</Text>
          <Text style={styles.subHeading}>RevenueCat</Text>
          <Text style={styles.bodyText}>
            We use RevenueCat to manage in-app subscriptions and purchases. RevenueCat receives your device identifier and subscription status to verify entitlements. RevenueCat's privacy policy is available at revenuecat.com/privacy.
          </Text>
          <Text style={styles.subHeading}>Better Auth</Text>
          <Text style={styles.bodyText}>
            Authentication is powered by Better Auth, which handles secure sign-in flows including email/password and Google OAuth. Your credentials are processed securely and never stored in plain text.
          </Text>
          <Text style={styles.subHeading}>Google Sign-In</Text>
          <Text style={styles.bodyText}>
            If you choose to sign in with Google, Google's authentication service processes your credentials. We only receive your name, email, and profile picture from Google.
          </Text>
          <Text style={styles.subHeading}>Analytics</Text>
          <Text style={styles.bodyText}>
            We use internal analytics to track anonymous usage patterns. No third-party advertising or tracking SDKs are used.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Retention</Text>
          <Text style={styles.bodyText}>
            We retain your account data for as long as your account is active. If you delete your account, your data is scheduled for permanent deletion after a 30-day grace period, which allows you to recover your account if the deletion was accidental. Anonymous analytics data may be retained in aggregated form indefinitely.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Rights</Text>
          <Text style={styles.subHeading}>Data Export</Text>
          <Text style={styles.bodyText}>
            You can download a copy of all data associated with your account at any time from Account & Privacy → Download My Data.
          </Text>
          <Text style={styles.subHeading}>Account Deletion</Text>
          <Text style={styles.bodyText}>
            You can permanently delete your account and all associated data from Account & Privacy → Delete Account. Deletion is irreversible after the 30-day grace period.
          </Text>
          <Text style={styles.subHeading}>Analytics Opt-Out</Text>
          <Text style={styles.bodyText}>
            You can opt out of anonymous usage analytics at any time from Account & Privacy → Analytics & Privacy.
          </Text>
          <Text style={styles.subHeading}>Correction</Text>
          <Text style={styles.bodyText}>
            You can update your name and profile information at any time from Account & Privacy → Edit Profile.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>No Sale of Personal Data</Text>
          <Text style={styles.bodyText}>
            We do not sell, rent, or trade your personal information to third parties for marketing or advertising purposes. Your data is used solely to operate and improve the App.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Children's Privacy</Text>
          <Text style={styles.bodyText}>
            The App is intended for users aged 13 and older. We do not knowingly collect personal information from children under 13. If you believe a child under 13 has provided us with personal information, please contact us and we will delete it promptly.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          <Text style={styles.bodyText}>
            We implement industry-standard security measures including encrypted data transmission (HTTPS/TLS), hashed password storage, and access controls. No method of transmission over the internet is 100% secure, but we take reasonable steps to protect your information.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Changes to This Policy</Text>
          <Text style={styles.bodyText}>
            We may update this Privacy Policy from time to time. We will notify you of significant changes by updating the "Last updated" date at the top of this policy. Continued use of the App after changes constitutes acceptance of the updated policy.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Us</Text>
          <Text style={styles.bodyText}>
            If you have questions about this Privacy Policy or your data, please contact us at:
          </Text>
          <Text style={styles.bodyText}>
            NEXTECH Digital Services{'\n'}
            Email: nextechdigitalservices@gmail.com
          </Text>
        </View>

        <View style={{ height: 40 }} />
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  subHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginTop: 4,
  },
  bodyText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 21,
  },
  bulletText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 22,
    paddingLeft: 4,
  },
});
