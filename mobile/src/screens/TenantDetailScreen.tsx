// TenantDetailScreen.tsx
import React from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSizes } from '../utils/theme';

export default function TenantDetailScreen({ navigation }: any) {
  return (
    <SafeAreaView style={s.c}>
      <View style={s.h}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={22} color={Colors.gray900} /></TouchableOpacity>
        <Text style={s.t}>Tenant Details</Text>
        <View style={{ width: 22 }} />
      </View>
      <View style={s.b}><Text style={s.p}>Tenant detail view — connected to /tenants/:id API</Text></View>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: Colors.gray50 },
  h: { backgroundColor: Colors.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  t: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.gray900 },
  b: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  p: { color: Colors.gray500, textAlign: 'center' },
});
