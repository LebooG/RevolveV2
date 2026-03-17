import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, BorderRadius, FontSizes } from '../utils/theme';
import { useAuth } from '../context/AuthContext';

export default function OtpScreen({ route, navigation }: any) {
  const { phone } = route.params;
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const inputs = useRef<TextInput[]>([]);
  const { verifyOtp, requestOtp } = useAuth();

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleChange = (text: string, index: number) => {
    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);

    if (text && index < 5) {
      inputs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits entered
    if (newCode.every((d) => d !== '')) {
      handleVerify(newCode.join(''));
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (otpCode?: string) => {
    const finalCode = otpCode || code.join('');
    if (finalCode.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter the full 6-digit code');
      return;
    }
    setLoading(true);
    try {
      await verifyOtp(phone, finalCode);
      // Navigation handled by AuthContext / AppNavigator
    } catch (err: any) {
      Alert.alert('Verification Failed', err?.response?.data?.message || 'Invalid OTP code');
      setCode(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    try {
      await requestOtp(phone);
      setCountdown(60);
      Alert.alert('Code Sent', 'A new OTP has been sent to your phone');
    } catch {
      Alert.alert('Error', 'Failed to resend code');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color={Colors.gray900} />
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.title}>Verify Your Number</Text>
        <Text style={styles.subtitle}>
          Enter the 6-digit code sent to{'\n'}
          <Text style={styles.phone}>{phone}</Text>
        </Text>

        {/* OTP Inputs */}
        <View style={styles.otpRow}>
          {code.map((digit, i) => (
            <TextInput
              key={i}
              ref={(ref) => { if (ref) inputs.current[i] = ref; }}
              style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
              keyboardType="number-pad"
              maxLength={1}
              value={digit}
              onChangeText={(text) => handleChange(text, i)}
              onKeyPress={(e) => handleKeyPress(e, i)}
              autoFocus={i === 0}
            />
          ))}
        </View>

        {/* Resend */}
        <TouchableOpacity onPress={handleResend} disabled={countdown > 0}>
          <Text style={styles.resend}>
            {countdown > 0
              ? `Resend code in ${countdown}s`
              : 'Resend Code'}
          </Text>
        </TouchableOpacity>

        {/* Verify Button */}
        <TouchableOpacity
          style={[styles.verifyBtn, loading && { opacity: 0.6 }]}
          onPress={() => handleVerify()}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={styles.verifyText}>{loading ? 'Verifying...' : 'Verify'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  back: { paddingHorizontal: 16, paddingTop: 16 },
  content: { flex: 1, paddingHorizontal: 24, justifyContent: 'center', marginTop: -60 },
  title: { fontSize: 28, fontWeight: '700', color: Colors.gray900, marginBottom: 8 },
  subtitle: { fontSize: FontSizes.base, color: Colors.gray500, lineHeight: 22, marginBottom: 32 },
  phone: { fontWeight: '700', color: Colors.gray900 },
  otpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, gap: 8 },
  otpBox: {
    flex: 1, height: 56, borderWidth: 2, borderColor: Colors.gray200,
    borderRadius: BorderRadius.lg, textAlign: 'center',
    fontSize: 22, fontWeight: '700', color: Colors.gray900,
  },
  otpBoxFilled: { borderColor: Colors.orange500, backgroundColor: Colors.orange50 },
  resend: {
    textAlign: 'center', fontSize: FontSizes.sm,
    color: Colors.orange500, fontWeight: '600', marginBottom: 32,
  },
  verifyBtn: {
    backgroundColor: Colors.orange500, borderRadius: BorderRadius.xl,
    paddingVertical: 18, alignItems: 'center',
  },
  verifyText: { color: Colors.white, fontSize: FontSizes.lg, fontWeight: '700' },
});
