// PropertyDetailScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, BorderRadius, FontSizes, Shadows } from '../utils/theme';

export default function PropertyDetailScreen({ route, navigation }: any) {
  const { propertyId } = route.params || {};

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={Colors.gray900} />
        </TouchableOpacity>
        <Text style={styles.title}>Property Details</Text>
        <View style={{ width: 38 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&h=400&fit=crop' }}
          style={styles.image}
        />
        <Text style={styles.propName}>Westlands Heights</Text>
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={16} color={Colors.gray400} />
          <Text style={styles.locationText}>Westlands, Nairobi</Text>
        </View>

        <View style={styles.statsRow}>
          {[{ label: 'Units', value: '24' }, { label: 'Occupied', value: '21' }, { label: 'Vacant', value: '3' }].map((s, i) => (
            <View key={i} style={styles.statCard}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.addTenantBtn} onPress={() => navigation.navigate('AddTenant')}>
          <Ionicons name="person-add" size={20} color={Colors.white} />
          <Text style={styles.addTenantText}>Add Tenant</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.gray50 },
  header: { backgroundColor: Colors.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  back: { padding: 8 },
  title: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.gray900 },
  image: { width: '100%', height: 200, borderRadius: BorderRadius.xxl, marginBottom: 16 },
  propName: { fontSize: FontSizes.xxl, fontWeight: '700', color: Colors.gray900, marginBottom: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 20 },
  locationText: { color: Colors.gray500, fontSize: FontSizes.base },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: 16, alignItems: 'center', ...Shadows.sm },
  statValue: { fontSize: FontSizes.xxl, fontWeight: '700', color: Colors.orange500 },
  statLabel: { fontSize: FontSizes.sm, color: Colors.gray500, marginTop: 4 },
  addTenantBtn: { backgroundColor: Colors.orange500, borderRadius: BorderRadius.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  addTenantText: { color: Colors.white, fontWeight: '700', fontSize: FontSizes.base },
});
