
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
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
import { authenticatedGet, authenticatedPost, authenticatedPut, authenticatedDelete } from '@/utils/api';

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

// Inline error color since commonStyles doesn't export it
const ERROR_COLOR = '#FF3B30';

export default function PaymentMethodsScreen() {
  console.log('[PaymentMethods] Screen rendered');
  const router = useRouter();
  
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [cardErrors, setCardErrors] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Inline feedback modal state (replaces alert())
  const [feedbackModal, setFeedbackModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'error' | 'success';
  }>({ visible: false, title: '', message: '', type: 'error' });

  const showFeedback = (title: string, message: string, type: 'error' | 'success' = 'error') => {
    setFeedbackModal({ visible: true, title, message, type });
  };

  const hideFeedback = () => {
    setFeedbackModal(prev => ({ ...prev, visible: false }));
  };

  // Fetch payment methods on mount
  React.useEffect(() => {
    const fetchPaymentMethods = async () => {
      console.log('[PaymentMethods] Fetching payment methods from backend');
      try {
        const methods = await authenticatedGet<PaymentMethod[]>('/api/payment-methods');
        console.log('[PaymentMethods] ✓ Payment methods fetched successfully:', methods.length, 'methods');
        setPaymentMethods(Array.isArray(methods) ? methods : []);
      } catch (error) {
        console.error('[PaymentMethods] ✗ Error fetching payment methods:', error);
        // Show empty state if fetch fails (user may not be signed in yet)
        if (error instanceof Error && error.message.includes('Authentication required')) {
          showFeedback(
            'Sign In Required',
            'Please sign in to view and manage your payment methods.',
            'error'
          );
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentMethods();
  }, []);

  const handleBack = () => {
    console.log('[PaymentMethods] User tapped back button');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleAddPaymentMethod = () => {
    console.log('[PaymentMethods] User tapped add payment method');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowAddModal(true);
  };

  const handleSaveCard = async () => {
    console.log('[PaymentMethods] User saving new card:', { cardNumber, expiryDate, cardholderName });
    
    // Validate all fields
    const errors = {
      cardNumber: '',
      expiryDate: '',
      cvv: '',
      cardholderName: '',
    };
    
    if (!validateCardNumber(cardNumber)) {
      errors.cardNumber = 'Invalid card number';
    }
    if (!validateExpiryDate(expiryDate)) {
      errors.expiryDate = 'Invalid or expired date';
    }
    if (!validateCVV(cvv)) {
      errors.cvv = 'Invalid CVV';
    }
    if (cardholderName.trim().length === 0) {
      errors.cardholderName = 'Name is required';
    }
    
    setCardErrors(errors);
    
    if (Object.values(errors).some(err => err !== '')) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    
    setIsSaving(true);
    const [monthValue, yearValue] = expiryDate.split('/');
    
    try {
      console.log('[PaymentMethods] Requesting POST /api/payment-methods...');
      const newMethod = await authenticatedPost<PaymentMethod>('/api/payment-methods', {
        cardNumber: cardNumber.replace(/\s/g, ''),
        expiryMonth: monthValue,
        expiryYear: yearValue,
        cvv: cvv,
        cardholderName: cardholderName.trim(),
      });
      console.log('[PaymentMethods] ✓ Payment method added successfully:', newMethod.id);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      setPaymentMethods(prev => [...prev, newMethod]);
      
      setShowAddModal(false);
      setCardNumber('');
      setExpiryDate('');
      setCvv('');
      setCardholderName('');
      setCardErrors({ cardNumber: '', expiryDate: '', cvv: '', cardholderName: '' });
      
      showFeedback(
        'Card Added',
        'Your payment method has been saved securely.',
        'success'
      );
    } catch (error) {
      console.error('[PaymentMethods] ✗ Error adding payment method:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showFeedback(
        'Card Not Added',
        error instanceof Error ? error.message : 'Failed to add payment method. Please check your card details and try again.',
        'error'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetDefault = async (methodId: string) => {
    console.log('[PaymentMethods] User setting default payment method:', methodId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      console.log(`[PaymentMethods] Requesting PUT /api/payment-methods/${methodId}/default...`);
      await authenticatedPut(`/api/payment-methods/${methodId}/default`, {});
      console.log('[PaymentMethods] ✓ Default payment method updated successfully');
      
      setPaymentMethods(prev => prev.map(method => ({
        ...method,
        isDefault: method.id === methodId,
      })));
      
      showFeedback(
        'Default Updated',
        'Your default payment method has been updated.',
        'success'
      );
    } catch (error) {
      console.error('[PaymentMethods] ✗ Error setting default payment method:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showFeedback(
        'Update Failed',
        'Failed to set default payment method. Please try again.',
        'error'
      );
    }
  };

  const handleDeleteMethod = (methodId: string) => {
    console.log('[PaymentMethods] User requesting to delete payment method:', methodId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedMethodId(methodId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    console.log('[PaymentMethods] User confirmed delete payment method:', selectedMethodId);
    
    if (!selectedMethodId) return;
    
    setIsDeleting(true);
    try {
      console.log(`[PaymentMethods] Requesting DELETE /api/payment-methods/${selectedMethodId}...`);
      await authenticatedDelete(`/api/payment-methods/${selectedMethodId}`);
      console.log('[PaymentMethods] ✓ Payment method deleted successfully');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      setPaymentMethods(prev => {
        const updatedMethods = prev.filter(method => method.id !== selectedMethodId);
        if (updatedMethods.length > 0) {
          const deletedMethod = prev.find(m => m.id === selectedMethodId);
          if (deletedMethod?.isDefault) {
            updatedMethods[0] = { ...updatedMethods[0], isDefault: true };
          }
        }
        return updatedMethods;
      });
      
      setShowDeleteConfirm(false);
      setSelectedMethodId(null);
      
      showFeedback(
        'Card Deleted',
        'Your payment method has been removed.',
        'success'
      );
    } catch (error) {
      console.error('[PaymentMethods] ✗ Error deleting payment method:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setShowDeleteConfirm(false);
      setSelectedMethodId(null);
      showFeedback(
        'Delete Failed',
        'Failed to delete payment method. Please try again.',
        'error'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDelete = () => {
    console.log('[PaymentMethods] User cancelled delete');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowDeleteConfirm(false);
    setSelectedMethodId(null);
  };

  const closeAddModal = () => {
    console.log('[PaymentMethods] User closed add payment modal');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowAddModal(false);
    setCardNumber('');
    setExpiryDate('');
    setCvv('');
    setCardholderName('');
    setCardErrors({ cardNumber: '', expiryDate: '', cvv: '', cardholderName: '' });
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

  const validateCardNumber = (number: string) => {
    const cleaned = number.replace(/\s/g, '');
    return cleaned.length === 16 && /^\d+$/.test(cleaned);
  };

  const validateExpiryDate = (date: string) => {
    if (date.length !== 5) return false;
    const [month, year] = date.split('/');
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt('20' + year, 10);
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    if (monthNum < 1 || monthNum > 12) return false;
    if (yearNum < currentYear) return false;
    if (yearNum === currentYear && monthNum < currentMonth) return false;
    
    return true;
  };

  const validateCVV = (cvvValue: string) => {
    return cvvValue.length >= 3 && cvvValue.length <= 4 && /^\d+$/.test(cvvValue);
  };

  const isFormValid = 
    validateCardNumber(cardNumber) && 
    validateExpiryDate(expiryDate) && 
    validateCVV(cvv) && 
    cardholderName.trim().length > 0;

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
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading payment methods...</Text>
          </View>
        ) : (
          <>
            <Animated.View entering={FadeInDown.delay(100).springify()}>
              <View style={styles.headerSection}>
                <Text style={styles.headerTitle}>Manage Payment Methods</Text>
                <Text style={styles.headerSubtitle}>
                  Add, edit, or remove payment methods for your subscriptions
                </Text>
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(150).springify()}>
              <View style={styles.authInfoBox}>
                <View style={styles.authInfoIcon}>
                  <IconSymbol
                    ios_icon_name="lock.shield.fill"
                    android_material_icon_name="verified-user"
                    size={20}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.authInfoTextContainer}>
                  <Text style={styles.authInfoTitle}>Secure & Authenticated</Text>
                  <Text style={styles.authInfoText}>
                    Your payment methods are protected with authentication tokens and encrypted storage
                  </Text>
                </View>
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
                  Your payment information is encrypted and securely stored via Stripe. All transactions are protected with authentication tokens.
                </Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Add Card Modal */}
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
                  style={[styles.input, cardErrors.cardholderName && styles.inputError]}
                  placeholder="John Doe"
                  placeholderTextColor={colors.textSecondary}
                  value={cardholderName}
                  onChangeText={(text) => {
                    setCardholderName(text);
                    if (cardErrors.cardholderName) {
                      setCardErrors({ ...cardErrors, cardholderName: '' });
                    }
                  }}
                  autoCapitalize="words"
                />
                {cardErrors.cardholderName ? (
                  <Text style={styles.errorText}>{cardErrors.cardholderName}</Text>
                ) : null}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Card Number</Text>
                <TextInput
                  style={[styles.input, cardErrors.cardNumber && styles.inputError]}
                  placeholder="1234 5678 9012 3456"
                  placeholderTextColor={colors.textSecondary}
                  value={formatCardNumber(cardNumber)}
                  onChangeText={(text) => {
                    setCardNumber(text.replace(/\s/g, ''));
                    if (cardErrors.cardNumber) {
                      setCardErrors({ ...cardErrors, cardNumber: '' });
                    }
                  }}
                  keyboardType="number-pad"
                  maxLength={19}
                />
                {cardErrors.cardNumber ? (
                  <Text style={styles.errorText}>{cardErrors.cardNumber}</Text>
                ) : null}
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, styles.formGroupHalf]}>
                  <Text style={styles.label}>Expiry Date</Text>
                  <TextInput
                    style={[styles.input, cardErrors.expiryDate && styles.inputError]}
                    placeholder="MM/YY"
                    placeholderTextColor={colors.textSecondary}
                    value={expiryDate}
                    onChangeText={(text) => {
                      setExpiryDate(formatExpiryDate(text));
                      if (cardErrors.expiryDate) {
                        setCardErrors({ ...cardErrors, expiryDate: '' });
                      }
                    }}
                    keyboardType="number-pad"
                    maxLength={5}
                  />
                  {cardErrors.expiryDate ? (
                    <Text style={styles.errorText}>{cardErrors.expiryDate}</Text>
                  ) : null}
                </View>

                <View style={[styles.formGroup, styles.formGroupHalf]}>
                  <Text style={styles.label}>CVV</Text>
                  <TextInput
                    style={[styles.input, cardErrors.cvv && styles.inputError]}
                    placeholder="123"
                    placeholderTextColor={colors.textSecondary}
                    value={cvv}
                    onChangeText={(text) => {
                      setCvv(text);
                      if (cardErrors.cvv) {
                        setCardErrors({ ...cardErrors, cvv: '' });
                      }
                    }}
                    keyboardType="number-pad"
                    maxLength={4}
                    secureTextEntry
                  />
                  {cardErrors.cvv ? (
                    <Text style={styles.errorText}>{cardErrors.cvv}</Text>
                  ) : null}
                </View>
              </View>

              <TouchableOpacity
                style={[styles.saveButton, (!isFormValid || isSaving) && styles.saveButtonDisabled]}
                onPress={handleSaveCard}
                disabled={!isFormValid || isSaving}
                activeOpacity={0.8}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Card</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
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
                color={ERROR_COLOR}
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
                disabled={isDeleting}
              >
                <Text style={styles.confirmButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, styles.confirmButtonDelete]}
                onPress={confirmDelete}
                activeOpacity={0.8}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmButtonTextDelete}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Feedback Modal (replaces alert()) */}
      <Modal
        visible={feedbackModal.visible}
        transparent
        animationType="fade"
        onRequestClose={hideFeedback}
      >
        <View style={styles.modalOverlay}>
          <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)} style={styles.feedbackModal}>
            <View style={[
              styles.feedbackIconContainer,
              { backgroundColor: feedbackModal.type === 'error' ? '#FFF0F0' : '#F0FFF4' }
            ]}>
              <IconSymbol
                ios_icon_name={feedbackModal.type === 'error' ? 'xmark.circle.fill' : 'checkmark.circle.fill'}
                android_material_icon_name={feedbackModal.type === 'error' ? 'cancel' : 'check-circle'}
                size={48}
                color={feedbackModal.type === 'error' ? ERROR_COLOR : colors.success}
              />
            </View>
            <Text style={styles.feedbackTitle}>{feedbackModal.title}</Text>
            <Text style={styles.feedbackMessage}>{feedbackModal.message}</Text>
            <TouchableOpacity
              style={[
                styles.feedbackButton,
                { backgroundColor: feedbackModal.type === 'error' ? ERROR_COLOR : colors.success }
              ]}
              onPress={hideFeedback}
              activeOpacity={0.8}
            >
              <Text style={styles.feedbackButtonText}>OK</Text>
            </TouchableOpacity>
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
    console.log('[PaymentMethodCard] Setting default payment method:', method.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    scale.value = withSpring(0.95, {}, () => {
      scale.value = withSpring(1);
    });
    onSetDefault(method.id);
  };

  const handleDelete = () => {
    console.log('[PaymentMethodCard] Deleting payment method:', method.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onDelete(method.id);
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
                color={method.isDefault ? '#FFFFFF' : ERROR_COLOR}
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
    marginBottom: 16,
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
  authInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.highlight,
    padding: 14,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
  },
  authInfoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  authInfoTextContainer: {
    flex: 1,
  },
  authInfoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  authInfoText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
    lineHeight: 16,
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
  inputError: {
    borderColor: ERROR_COLOR,
    borderWidth: 2,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    color: ERROR_COLOR,
    marginTop: 4,
    marginLeft: 4,
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
    backgroundColor: ERROR_COLOR,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 16,
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
