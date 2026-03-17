import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, BorderRadius, FontSizes } from '../utils/theme';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

type PaymentStatus = 'idle' | 'initiating' | 'waiting' | 'polling' | 'success' | 'failed';

export default function PaymentScreen({ route, navigation }: any) {
  const { amount, rentAmount, waterBill, property } = route.params;
  const { user } = useAuth();

  const [paymentAmount, setPaymentAmount] = useState(amount?.toString() || '');
  // Pre-fill phone from authenticated user
  const [phone, setPhone] = useState(user?.phone || '');
  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [paymentId, setPaymentId] = useState<string | null>(null);

  const pollInterval = useRef<NodeJS.Timeout | null>(null);
  const pollCount = useRef(0);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollInterval.current) clearInterval(pollInterval.current);
    };
  }, []);

  const startPolling = (id: string) => {
    pollCount.current = 0;
    setStatus('polling');
    setStatusMessage('Waiting for M-Pesa confirmation...');

    pollInterval.current = setInterval(async () => {
      pollCount.current += 1;

      // Stop after 60 seconds (12 polls x 5s)
      if (pollCount.current > 12) {
        if (pollInterval.current) clearInterval(pollInterval.current);
        setStatus('idle');
        setStatusMessage('');
        Alert.alert(
          'Payment Pending',
          'We have not received confirmation yet. Check your M-Pesa messages and the Transactions tab for updates.'
        );
        return;
      }

      try {
        const res = await api.getPaymentStatus(id);
        const payment = res.data.payment;

        if (payment.status === 'completed') {
          if (pollInterval.current) clearInterval(pollInterval.current);
          setStatus('success');
          setStatusMessage('Payment confirmed');
          setTimeout(() => {
            Alert.alert(
              'Payment Successful',
              `KES ${parseInt(paymentAmount).toLocaleString()} received.\nReceipt: ${payment.mpesa_receipt_number || 'Processing'}`,
              [{ text: 'Done', onPress: () => navigation.goBack() }]
            );
          }, 500);
        } else if (payment.status === 'failed') {
          if (pollInterval.current) clearInterval(pollInterval.current);
          setStatus('failed');
          setStatusMessage('Payment was not completed');
        }
      } catch {
        // Silent — keep polling
      }
    }, 5000);
  };

  const handlePayment = async () => {
    const amt = parseInt(paymentAmount);
    if (!amt || amt < 1) {
      Alert.alert('Invalid Amount', 'Please enter a valid payment amount');
      return;
    }
    if (!phone || phone.length < 10) {
      Alert.alert('Invalid Phone', 'Please enter a valid M-Pesa number');
      return;
    }

    const formattedPhone = phone.startsWith('254') ? phone : `254${phone.replace(/^0/, '')}`;

    setStatus('initiating');
    setStatusMessage('Sending payment request...');

    try {
      const res = await api.initiatePayment({
        tenantId: 'current',
        amount: amt,
        phone: formattedPhone,
        description: `Rent payment for ${property}`,
      });

      const id = res.data.paymentId;
      setPaymentId(id);
      setStatus('waiting');
      setStatusMessage('Check your phone for the M-Pesa prompt and enter your PIN');

      // Start polling after a short delay for STK push to reach phone
      setTimeout(() => startPolling(id), 5000);
    } catch (err: any) {
      setStatus('failed');
      setStatusMessage('');
      Alert.alert(
        'Payment Failed',
        err?.response?.data?.message || 'Could not initiate payment. Please try again.'
      );
      setTimeout(() => setStatus('idle'), 2000);
    }
  };

  const isProcessing = status === 'initiating' || status === 'waiting' || status === 'polling';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.handle} />

      <Text style={styles.title}>Complete Payment</Text>

      {/* Payment Summary */}
      <View style={styles.summaryBox}>
        <Text style={styles.summaryTitle}>Payment Summary</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Base Rent</Text>
          <Text style={styles.value}>KES {(rentAmount || 0).toLocaleString()}</Text>
        </View>
        <View style={styles.row}>
          <View style={styles.waterLabel}>
            <Ionicons name="water" size={14} color={Colors.blue500} />
            <Text style={styles.label}>Water Bill</Text>
          </View>
          <Text style={styles.value}>KES {(waterBill || 0).toLocaleString()}</Text>
        </View>
        <View style={[styles.row, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.totalValue}>KES {(amount || 0).toLocaleString()}</Text>
        </View>
      </View>

      {/* Payment Amount */}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Payment Amount</Text>
        <View style={styles.amountInputWrap}>
          <Text style={styles.currency}>KES</Text>
          <TextInput
            style={styles.amountInput}
            value={paymentAmount}
            onChangeText={setPaymentAmount}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={Colors.gray400}
            editable={!isProcessing}
          />
        </View>
        <Text style={styles.hint}>You can pay partially. Minimum amount: KES 1</Text>
      </View>

      {/* M-Pesa Number */}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>M-Pesa Number</Text>
        <TextInput
          style={styles.phoneInput}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="254712345678"
          placeholderTextColor={Colors.gray400}
          editable={!isProcessing}
        />
      </View>

      {/* Status indicator */}
      {statusMessage ? (
        <View style={styles.statusRow}>
          {isProcessing && <ActivityIndicator size="small" color={Colors.orange500} />}
          {status === 'success' && <Ionicons name="checkmark-circle" size={20} color={Colors.green600} />}
          {status === 'failed' && <Ionicons name="close-circle" size={20} color={Colors.red500} />}
          <Text style={[
            styles.statusText,
            status === 'success' && { color: Colors.green600 },
            status === 'failed' && { color: Colors.red500 },
          ]}>{statusMessage}</Text>
        </View>
      ) : null}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => {
            if (pollInterval.current) clearInterval(pollInterval.current);
            navigation.goBack();
          }}
          disabled={status === 'initiating'}
        >
          <Text style={styles.cancelText}>{isProcessing ? 'Close' : 'Cancel'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.payBtn, isProcessing && { opacity: 0.6 }]}
          onPress={handlePayment}
          disabled={isProcessing}
          activeOpacity={0.8}
        >
          {status === 'initiating' ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.payText}>{isProcessing ? 'Processing...' : 'Pay Now'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white, paddingHorizontal: 24, paddingTop: 12 },
  handle: {
    width: 48, height: 4, backgroundColor: Colors.gray200,
    borderRadius: 2, alignSelf: 'center', marginBottom: 24,
  },
  title: { fontSize: FontSizes.xxl, fontWeight: '700', color: Colors.gray900, marginBottom: 24 },
  summaryBox: {
    backgroundColor: Colors.orange50, borderRadius: BorderRadius.xxl,
    padding: 16, borderWidth: 1, borderColor: Colors.orange100, marginBottom: 24,
  },
  summaryTitle: { fontWeight: '700', color: Colors.gray900, marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  label: { color: Colors.gray600 },
  value: { fontWeight: '600', color: Colors.gray900 },
  waterLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  totalRow: { borderTopWidth: 1, borderTopColor: Colors.orange100, paddingTop: 8, marginTop: 4, marginBottom: 0 },
  totalLabel: { fontWeight: '700', color: Colors.gray900 },
  totalValue: { fontWeight: '700', color: Colors.orange500 },
  field: { marginBottom: 20 },
  fieldLabel: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.gray900, marginBottom: 8 },
  amountInputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 2, borderColor: Colors.gray200, borderRadius: BorderRadius.xl,
    paddingHorizontal: 16,
  },
  currency: { color: Colors.gray500, fontWeight: '600', marginRight: 8 },
  amountInput: {
    flex: 1, paddingVertical: 16,
    fontSize: FontSizes.lg, fontWeight: '700', color: Colors.gray900,
  },
  hint: { color: Colors.gray500, fontSize: FontSizes.sm, marginTop: 8 },
  phoneInput: {
    borderWidth: 2, borderColor: Colors.gray200, borderRadius: BorderRadius.xl,
    paddingHorizontal: 16, paddingVertical: 16,
    fontSize: FontSizes.lg, fontWeight: '600', color: Colors.gray900,
  },
  statusRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginBottom: 16, paddingHorizontal: 4,
  },
  statusText: { fontSize: FontSizes.sm, color: Colors.gray600, flex: 1 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 'auto', marginBottom: 32 },
  cancelBtn: {
    flex: 1, borderWidth: 2, borderColor: Colors.gray200,
    borderRadius: BorderRadius.xl, paddingVertical: 16, alignItems: 'center',
  },
  cancelText: { color: Colors.gray700, fontWeight: '700', fontSize: FontSizes.base },
  payBtn: {
    flex: 1, backgroundColor: Colors.orange500,
    borderRadius: BorderRadius.xl, paddingVertical: 16, alignItems: 'center',
  },
  payText: { color: Colors.white, fontWeight: '700', fontSize: FontSizes.base },
});
