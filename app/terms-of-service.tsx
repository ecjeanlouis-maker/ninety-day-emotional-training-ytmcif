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

export default function TermsOfServiceScreen() {
  const router = useRouter();

  const handleBack = () => {
    console.log('[TermsOfService] Back button tapped');
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <Text style={styles.bodyText}>
            These Terms of Service ("Terms") govern your use of the Control & Confidence (ECCT) mobile application ("App") provided by NEXTECH Digital Services ("we", "us", or "our"). By downloading, installing, or using the App, you agree to be bound by these Terms.
          </Text>
          <Text style={styles.bodyText}>
            Last updated: June 2025
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acceptance of Terms</Text>
          <Text style={styles.bodyText}>
            By accessing or using the App, you confirm that you are at least 13 years of age, have read and understood these Terms, and agree to be bound by them. If you do not agree to these Terms, you must not use the App.
          </Text>
          <Text style={styles.bodyText}>
            If you are using the App on behalf of an organization, you represent that you have the authority to bind that organization to these Terms.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description of Service</Text>
          <Text style={styles.bodyText}>
            Control & Confidence (ECCT) is an educational wellness and skills-training application designed to help users develop emotional regulation, confidence, and coping strategies through structured programs, exercises, and journaling tools.
          </Text>
          <Text style={styles.bodyText}>
            IMPORTANT: The App provides educational and informational content only. It is NOT a substitute for professional mental health care, diagnosis, treatment, or crisis intervention. If you are experiencing a mental health emergency, please contact emergency services (911 in the US) or the 988 Suicide & Crisis Lifeline (call or text 988 in the US).
          </Text>
          <Text style={styles.bodyText}>
            The App does not establish a therapist-patient or doctor-patient relationship. Content in the App should not be interpreted as medical advice.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>User Accounts</Text>
          <Text style={styles.bodyText}>
            To access most features of the App, you must create an account. You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account.
          </Text>
          <Text style={styles.bodyText}>
            You agree to provide accurate and complete information when creating your account and to keep your information up to date. You must notify us immediately at nextechdigitalservices@gmail.com if you suspect unauthorized access to your account.
          </Text>
          <Text style={styles.bodyText}>
            We reserve the right to suspend or terminate accounts that violate these Terms or that have been inactive for an extended period.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subscriptions and Billing</Text>
          <Text style={styles.subHeading}>Pro Subscription</Text>
          <Text style={styles.bodyText}>
            The App offers a free tier and a paid Pro subscription that unlocks additional features. Subscription pricing is displayed in the App prior to purchase.
          </Text>
          <Text style={styles.subHeading}>Auto-Renewal</Text>
          <Text style={styles.bodyText}>
            Subscriptions automatically renew at the end of each billing period unless cancelled. Your payment method will be charged through your Apple App Store or Google Play account. The renewal charge occurs within 24 hours before the end of the current period.
          </Text>
          <Text style={styles.subHeading}>Cancellation</Text>
          <Text style={styles.bodyText}>
            You may cancel your subscription at any time through your device's subscription settings: on iOS, go to Settings → Apple ID → Subscriptions; on Android, go to Google Play → Subscriptions. Cancellation takes effect at the end of the current billing period — you retain access to Pro features until then.
          </Text>
          <Text style={styles.subHeading}>Refunds</Text>
          <Text style={styles.bodyText}>
            All purchases are processed by Apple or Google. Refund requests are subject to their respective refund policies. We do not issue refunds directly, except where required by applicable law.
          </Text>
          <Text style={styles.subHeading}>Free Trials</Text>
          <Text style={styles.bodyText}>
            If a free trial is offered, it will convert to a paid subscription at the end of the trial period unless cancelled before the trial ends.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prohibited Conduct</Text>
          <Text style={styles.bodyText}>
            You agree not to:
          </Text>
          <Text style={styles.bulletText}>• Use the App for any unlawful purpose or in violation of any applicable laws</Text>
          <Text style={styles.bulletText}>• Attempt to reverse-engineer, decompile, or disassemble the App</Text>
          <Text style={styles.bulletText}>• Circumvent or attempt to circumvent any subscription or access controls</Text>
          <Text style={styles.bulletText}>• Share your account credentials with others</Text>
          <Text style={styles.bulletText}>• Upload or transmit harmful, offensive, or illegal content</Text>
          <Text style={styles.bulletText}>• Interfere with or disrupt the App's servers or infrastructure</Text>
          <Text style={styles.bulletText}>• Use automated tools to scrape or extract content from the App</Text>
          <Text style={styles.bulletText}>• Impersonate any person or entity</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Intellectual Property</Text>
          <Text style={styles.bodyText}>
            All content in the App — including text, graphics, audio, programs, exercises, and software — is owned by or licensed to NEXTECH Digital Services and is protected by copyright, trademark, and other intellectual property laws.
          </Text>
          <Text style={styles.bodyText}>
            We grant you a limited, non-exclusive, non-transferable, revocable license to use the App for your personal, non-commercial use. You may not reproduce, distribute, modify, or create derivative works from any App content without our prior written consent.
          </Text>
          <Text style={styles.bodyText}>
            Content you create within the App (such as journal entries) remains yours. By storing it in the App, you grant us a limited license to process and store it solely to provide the service to you.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Disclaimer of Warranties</Text>
          <Text style={styles.bodyText}>
            THE APP IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
          </Text>
          <Text style={styles.bodyText}>
            We do not warrant that the App will be uninterrupted, error-free, or free of viruses or other harmful components. We do not warrant that the educational content will produce any particular outcome or result for any individual user.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Limitation of Liability</Text>
          <Text style={styles.bodyText}>
            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, NEXTECH DIGITAL SERVICES SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF OR INABILITY TO USE THE APP.
          </Text>
          <Text style={styles.bodyText}>
            Our total liability to you for any claims arising from these Terms or your use of the App shall not exceed the amount you paid us in the twelve months preceding the claim, or $10 USD if you have not made any payments.
          </Text>
          <Text style={styles.bodyText}>
            Some jurisdictions do not allow the exclusion of certain warranties or limitation of liability, so some of the above limitations may not apply to you.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Governing Law</Text>
          <Text style={styles.bodyText}>
            These Terms are governed by and construed in accordance with applicable law. Any disputes arising from these Terms or your use of the App shall be resolved through good-faith negotiation first. If negotiation fails, disputes shall be submitted to binding arbitration or the courts of competent jurisdiction.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Changes to Terms</Text>
          <Text style={styles.bodyText}>
            We may update these Terms from time to time. We will notify you of material changes by updating the "Last updated" date and, where appropriate, by sending a notification through the App. Your continued use of the App after changes take effect constitutes your acceptance of the revised Terms.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Termination</Text>
          <Text style={styles.bodyText}>
            We may suspend or terminate your access to the App at any time for violation of these Terms or for any other reason at our discretion. You may terminate your account at any time by deleting it from Account & Privacy settings. Upon termination, your right to use the App ceases immediately.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Us</Text>
          <Text style={styles.bodyText}>
            If you have questions about these Terms, please contact us at:
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
