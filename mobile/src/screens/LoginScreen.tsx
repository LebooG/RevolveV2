import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, BorderRadius, FontSizes, Spacing } from '../utils/theme';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen({ navigation }: any) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const { requestOtp } = useAuth();

  const handleRequestOtp = async () => {
    if (phone.length < 9) {
      Alert.alert('Invalid Phone', 'Please enter a valid Kenyan phone number');
      return;
    }
    const formatted = phone.startsWith('254') ? phone : `254${phone.replace(/^0/, '')}`;
    setLoading(true);
    try {
      await requestOtp(formatted);
      navigation.navigate('OTP', { phone: formatted });
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        {/* Logo & Branding */}
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Ionicons name="home" size={32} color={Colors.white} />
          </View>
          <Text style={styles.brand}>Revolve Rent</Text>
          <Text style={styles.tagline}>Manage your rental properties with ease</Text>
        </View>

        {/* Phone Input */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>Phone Number</Text>
          <View style={styles.phoneRow}>
            <View style={styles.countryCode}>
              <Text style={styles.countryCodeText}>KE +254</Text>
            </View>
            <TextInput
              style={styles.phoneInput}
              placeholder="712 345 678"
              placeholderTextColor={Colors.gray400}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              maxLength={12}
            />
          </View>
          <Text style={styles.hint}>We'll send you a one-time verification code</Text>
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={[styles.ctaButton, loading && styles.ctaDisabled]}
          onPress={handleRequestOtp}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={styles.ctaText}>{loading ? 'Sending...' : 'Get OTP Code'}</Text>
        </TouchableOpacity>

        {/* Footer */}
        <Text style={styles.footer}>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  inner: { flex: 1, paddingHorizontal: 24, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 48 },
  logoCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.orange500,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  brand: { fontSize: 28, fontWeight: '700', color: Colors.gray900 },
  tagline: { fontSize: FontSizes.base, color: Colors.gray500, marginTop: 8, textAlign: 'center' },
  inputSection: { marginBottom: 24 },
  label: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.gray900, marginBottom: 8 },
  phoneRow: { flexDirection: 'row', gap: 8 },
  countryCode: {
    backgroundColor: Colors.gray100, borderRadius: BorderRadius.xl,
    paddingHorizontal: 16, justifyContent: 'center',
  },
  countryCodeText: { fontSize: FontSizes.base, fontWeight: '600', color: Colors.gray700 },
  phoneInput: {
    flex: 1, backgroundColor: Colors.gray100, borderRadius: BorderRadius.xl,
    paddingHorizontal: 16, paddingVertical: 16,
    fontSize: FontSizes.lg, fontWeight: '600', color: Colors.gray900,
  },
  hint: { fontSize: FontSizes.sm, color: Colors.gray500, marginTop: 8 },
  ctaButton: {
    backgroundColor: Colors.orange500, borderRadius: BorderRadius.xl,
    paddingVertical: 18, alignItems: 'center', marginBottom: 16,
  },
  ctaDisabled: { opacity: 0.6 },
  ctaText: { color: Colors.white, fontSize: FontSizes.lg, fontWeight: '700' },
  footer: {
    fontSize: FontSizes.xs, color: Colors.gray400, textAlign: 'center',
    lineHeight: 16, paddingHorizontal: 32,
  },
});
