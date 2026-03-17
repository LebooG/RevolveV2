import React, { useState } from 'react';
import { View, Text, TextInput, SafeAreaView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, BorderRadius, FontSizes } from '../utils/theme';
import api from '../services/api';

export default function AddPropertyScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [address, setAddress] = useState('');
  const [units, setUnits] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name || !location || !units) { Alert.alert('Required', 'Please fill all fields'); return; }
    setLoading(true);
    try {
      await api.createProperty({ name, location, address, units: parseInt(units) });
      Alert.alert('Success', 'Property added', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to add property');
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.c}>
      <View style={styles.h}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={22} color={Colors.gray900} /></TouchableOpacity>
        <Text style={styles.t}>Add Property</Text>
        <View style={{ width: 22 }} />
      </View>
      <View style={styles.form}>
        {[
          { label: 'Property Name', value: name, set: setName, ph: 'e.g. Westlands Heights' },
          { label: 'Location', value: location, set: setLocation, ph: 'e.g. Westlands, Nairobi' },
          { label: 'Address', value: address, set: setAddress, ph: 'Full address' },
          { label: 'Number of Units', value: units, set: setUnits, ph: 'e.g. 24', kb: 'numeric' as const },
        ].map((f, i) => (
          <View key={i} style={styles.field}>
            <Text style={styles.label}>{f.label}</Text>
            <TextInput style={styles.input} value={f.value} onChangeText={f.set} placeholder={f.ph} placeholderTextColor={Colors.gray400} keyboardType={f.kb || 'default'} />
          </View>
        ))}
        <TouchableOpacity style={[styles.btn, loading && { opacity: 0.6 }]} onPress={handleSubmit} disabled={loading}>
          <Text style={styles.btnText}>{loading ? 'Adding...' : 'Add Property'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: Colors.white },
  h: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  t: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.gray900 },
  form: { padding: 24, gap: 16 },
  field: {},
  label: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.gray900, marginBottom: 6 },
  input: { borderWidth: 2, borderColor: Colors.gray200, borderRadius: BorderRadius.xl, padding: 14, fontSize: FontSizes.base, color: Colors.gray900 },
  btn: { backgroundColor: Colors.orange500, borderRadius: BorderRadius.xl, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  btnText: { color: Colors.white, fontWeight: '700', fontSize: FontSizes.base },
});
