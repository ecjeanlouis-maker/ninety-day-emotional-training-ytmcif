
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface PaymentMethod {
  id: string;
  type: 'card' | 'paypal' | 'apple-pay' | 'google-pay';
  last4?: string;
  brand?: string;
  expiryMonth?: string;
  expiryYear?: string;
  email?: string;
  isDefault: boolean;
}

export default function PaymentMethodsScreen() {
  console.log('PaymentMethodsScreen rendered');
  const router = useRouter();
  
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    {
      id: '1',
      type: 'card',
      last4: '4242',
      brand: 'Visa',
      expiryMonth: '12',
      expiryYear: '25',
      isDefault: true,
    },
    {
      id: '2',
      type: 'card',
      last4: '5555',
      brand: 'Mastercard',
      expiryMonth: '08',
      expiryYear: '26',
      isDefault: false,
    },
  ]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');

  const handleBack = () => {
    console.log('User tapped back button');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleAddPaymentMethod = () => {
    console.log('User tapped add payment method');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowAddModal(true);
  };

  const handleSaveCard = () => {
    console.log('User saving new card:', { cardNumber, expiryDate, cardholderName });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    const last4Value = cardNumber.slice(-4);
    const brandValue = cardNumber.startsWith('4') ? 'Visa' : 'Mastercard';
    const [monthValue, yearValue] = expiryDate.split('/');
    
    const newMethod: PaymentMethod = {
      id: Date.now().toString(),
      type: 'card',
      last4: last4Value,
      brand: brandValue,
      expiryMonth: monthValue,
      expiryYear: yearValue,
      isDefault: paymentMethods.length === 0,
    };

    setPaymentMethods([...paymentMethods, newMethod]);
    
    // TODO: Backend Integration - POST /api/payment-methods with { cardNumber, expiryMonth, expiryYear, cvv, cardholderName } → { paymentMethodId, last4, brand }
    
    setShowAddModal(false);
    setCardNumber('');
    setExpiryDate('');
    setCvv('');
    setCardholderName('');
  };

  const handleSetDefault = (methodId: string) => {
    console.log('User setting default payment method:', methodId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const updatedMethods = paymentMethods.map(method => ({
      ...method,
      isDefault: method.id === methodId,
    }));
    
    setPaymentMethods(updatedMethods);
    
    // TODO: Backend Integration - PUT /api/payment-methods/:id/default → { success: true }
  };

  const handleDeleteMethod = (methodId: string) => {
    console.log('User requesting to delete payment method:', methodId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedMethodId(methodId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    console.log('User confirmed delete payment method:', selectedMethodId);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    const updatedMethods = paymentMethods.filter(method => method.id !== selectedMethodId);
    
    if (updatedMethods.length > 0) {
      const deletedMethod = paymentMethods.find(m => m.id === selectedMethodId);
      if (deletedMethod?.isDefault) {
        updatedMethods[0].isDefault = true;
      }
    }
    
    setPaymentMethods(updatedMethods);
    
    // TODO: Backend Integration - DELETE /api/payment-methods/:id → { success: true }
    
    setShowDeleteConfirm(false);
    setSelectedMethodId(null);
  };

  const cancelDelete = () => {
    console.log('User cancelled delete');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowDeleteConfirm(false);
    setSelectedMethodId(null);
  };

  const closeAddModal = () => {
    console.log('User closed add payment modal');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowAddModal(false);
    setCardNumber('');
    setExpiryDate('');
    setCvv('');
    setCardholderName('');
  };

  const getCardIcon = (brand: string) => {
    const brandLower = brand.toLowerCase();
    if (brandLower === 'visa') {
      return { ios: 'creditcard.fill', android: 'credit-card' };
    }
    if (brandLower === 'mastercard') {
      return { ios: 'creditcard.fill', android: 'credit-card' };
    }
    return { ios: 'creditcard', android: 'credit-card' };
  };

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\s/g, '');
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
    return formatted;
  };

  const formatExpiryDate = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      const formattedValue = cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4);
      return formattedValue;
    }
    return cleaned;
  };

  const isFormValid = cardNumber.length >= 16 && expiryDate.length === 5 && cvv.length >= 3 && cardholderName.length > 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Payment Methods',
          headerLeft: () => (
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <IconSymbol
                ios_icon_name="chevron.left"
                android_material_icon_name="arrow-back"
                size={24}
                color={colors.text}
              />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <View style={styles.headerSection}>
            <Text style={styles.headerTitle}>Manage Payment Methods</Text>
            <Text style={styles.headerSubtitle}>
              Add, edit, or remove payment methods for your subscriptions
            </Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddPaymentMethod}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[colors.primary, colors.accent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.addButtonGradient}
            >
              <IconSymbol
                ios_icon_name="plus.circle.fill"
                android_material_icon_name="add-circle"
                size={24}
                color="#FFFFFF"
              />
              <Text style={styles.addButtonText}>Add Payment Method</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.methodsList}>
          {paymentMethods.map((method, index) => {
            const delayValue = 300 + index * 100;
            return (
              <Animated.View
                key={method.id}
                entering={FadeInDown.delay(delayValue).springify()}
              >
                <PaymentMethodCard
                  method={method}
                  onSetDefault={handleSetDefault}
                  onDelete={handleDeleteMethod}
                />
              </Animated.View>
            );
          })}
        </View>

        {paymentMethods.length === 0 && (
          <Animated.View entering={FadeIn.delay(400)} style={styles.emptyState}>
            <IconSymbol
              ios_icon_name="creditcard"
              android_material_icon_name="credit-card"
              size={64}
              color={colors.textSecondary}
            />
            <Text style={styles.emptyStateTitle}>No Payment Methods</Text>
            <Text style={styles.emptyStateText}>
              Add a payment method to manage your subscriptions
            </Text>
          </Animated.View>
        )}

        <View style={styles.securitySection}>
          <View style={styles.securityIcon}>
            <IconSymbol
              ios_icon_name="lock.shield.fill"
              android_material_icon_name="verified-user"
              size={20}
              color={colors.success}
            />
          </View>
          <View style={styles.securityTextContainer}>
            <Text style={styles.securityTitle}>Secure Payment Processing</Text>
            <Text style={styles.securityText}>
              Your payment information is encrypted and securely stored
            </Text>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={showAddModal}
        transparent
        animationType="fade"
        onRequestClose={closeAddModal}
      >
        <View style={styles.modalOverlay}>
          <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Payment Method</Text>
              <TouchableOpacity onPress={closeAddModal} style={styles.closeButton}>
                <IconSymbol
                  ios_icon_name="xmark"
                  android_material_icon_name="close"
                  size={20}
                  color={colors.text}
                />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Cardholder Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="John Doe"
                  placeholderTextColor={colors.textSecondary}
                  value={cardholderName}
                  onChangeText={setCardholderName}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Card Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="1234 5678 9012 3456"
                  placeholderTextColor={colors.textSecondary}
                  value={formatCardNumber(cardNumber)}
                  onChangeText={(text) => setCardNumber(text.replace(/\s/g, ''))}
                  keyboardType="number-pad"
                  maxLength={19}
                />
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, styles.formGroupHalf]}>
                  <Text style={styles.label}>Expiry Date</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="MM/YY"
                    placeholderTextColor={colors.textSecondary}
                    value={expiryDate}
                    onChangeText={(text) => setExpiryDate(formatExpiryDate(text))}
                    keyboardType="number-pad"
                    maxLength={5}
                  />
                </View>

                <View style={[styles.formGroup, styles.formGroupHalf]}>
                  <Text style={styles.label}>CVV</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="123"
                    placeholderTextColor={colors.textSecondary}
                    value={cvv}
                    onChangeText={setCvv}
                    keyboardType="number-pad"
                    maxLength={4}
                    secureTextEntry
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.saveButton, !isFormValid && styles.saveButtonDisabled]}
                onPress={handleSaveCard}
                disabled={!isFormValid}
                activeOpacity={0.8}
              >
                <Text style={styles.saveButtonText}>Save Card</Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      <Modal
        visible={showDeleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={cancelDelete}
      >
        <View style={styles.modalOverlay}>
          <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)} style={styles.confirmModal}>
            <View style={styles.confirmIconContainer}>
              <IconSymbol
                ios_icon_name="exclamationmark.triangle.fill"
                android_material_icon_name="warning"
                size={48}
                color={colors.error}
              />
            </View>
            <Text style={styles.confirmTitle}>Delete Payment Method?</Text>
            <Text style={styles.confirmText}>
              Are you sure you want to remove this payment method? This action cannot be undone.
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.confirmButtonCancel]}
                onPress={cancelDelete}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, styles.confirmButtonDelete]}
                onPress={confirmDelete}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmButtonTextDelete}>Delete</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

interface PaymentMethodCardProps {
  method: PaymentMethod;
  onSetDefault: (id: string) => void;
  onDelete: (id: string) => void;
}

function PaymentMethodCard({ method, onSetDefault, onDelete }: PaymentMethodCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    const scaleValue = scale.value;
    return {
      transform: [{ scale: scaleValue }],
    };
  });

  const handleSetDefault = () => {
    console.log('Setting default payment method:', method.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    scale.value = withSpring(0.95, {}, () => {
      scale.value = withSpring(1);
    });
    onSetDefault(method.id);
  };

  const handleDelete = () => {
    console.log('Deleting payment method:', method.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onDelete(method.id);
  };

  const cardIcon = getCardIcon(method.brand || '');
  const expiryText = `${method.expiryMonth}/${method.expiryYear}`;

  return (
    <Animated.View style={[styles.methodCard, animatedStyle]}>
      <LinearGradient
        colors={method.isDefault ? [colors.primary, colors.accent] : [colors.card, colors.card]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.methodCardGradient}
      >
        <View style={styles.methodCardHeader}>
          <View style={styles.methodCardIcon}>
            <IconSymbol
              ios_icon_name={cardIcon.ios}
              android_material_icon_name={cardIcon.android}
              size={28}
              color={method.isDefault ? '#FFFFFF' : colors.text}
            />
          </View>
          <View style={styles.methodCardInfo}>
            <Text style={[styles.methodCardBrand, method.isDefault && styles.methodCardTextWhite]}>
              {method.brand}
            </Text>
            <Text style={[styles.methodCardNumber, method.isDefault && styles.methodCardTextWhite]}>
              •••• {method.last4}
            </Text>
          </View>
          {method.isDefault && (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultBadgeText}>Default</Text>
            </View>
          )}
        </View>

        <View style={styles.methodCardFooter}>
          <Text style={[styles.methodCardExpiry, method.isDefault && styles.methodCardTextWhite]}>
            Expires {expiryText}
          </Text>
          <View style={styles.methodCardActions}>
            {!method.isDefault && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleSetDefault}
                activeOpacity={0.7}
              >
                <Text style={styles.actionButtonText}>Set Default</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDelete}
              activeOpacity={0.7}
            >
              <IconSymbol
                ios_icon_name="trash"
                android_material_icon_name="delete"
                size={18}
                color={method.isDefault ? '#FFFFFF' : colors.error}
              />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backButton: {
    padding: 8,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  headerSection: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.text,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    lineHeight: 20,
  },
  addButton: {
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0px 4px 16px rgba(107, 76, 230, 0.2)',
    elevation: 4,
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 10,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  methodsList: {
    gap: 16,
    marginBottom: 32,
  },
  methodCard: {
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0px 2px 12px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  methodCardGradient: {
    padding: 20,
  },
  methodCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  methodCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  methodCardInfo: {
    flex: 1,
  },
  methodCardBrand: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  methodCardNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  methodCardTextWhite: {
    color: '#FFFFFF',
  },
  defaultBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  defaultBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  methodCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  methodCardExpiry: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  methodCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  securitySection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  securityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.highlight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  securityTextContainer: {
    flex: 1,
  },
  securityTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  securityText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    lineHeight: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.background,
    borderRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScroll: {
    flex: 1,
  },
  formGroup: {
    marginBottom: 20,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  formGroupHalf: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  confirmModal: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.background,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  confirmIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.highlight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  confirmText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonCancel: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  confirmButtonDelete: {
    backgroundColor: colors.error,
  },
  confirmButtonTextCancel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  confirmButtonTextDelete: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
