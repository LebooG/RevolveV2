import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, ScrollView, Image, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, BorderRadius, FontSizes, Shadows, Spacing } from '../utils/theme';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function HomeScreen({ navigation }: any) {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dashboard, setDashboard] = useState<any>(null);

  // Sample data matching TSX design — replaced by API in production
  const tenantData = {
    name: user?.name || 'Alex Kipchoge',
    property: 'Westlands Heights',
    unit: 'Apartment 4B',
    location: 'Westlands, Nairobi',
    rentAmount: 65000,
    waterBill: 2800,
    totalAmount: 67800,
    nextRentDue: 'Aug 15, 2025',
    daysLeft: 4,
  };

  const properties = [
    { id: '1', name: 'Westlands Heights', location: 'Westlands', image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=300&h=200&fit=crop' },
    { id: '2', name: 'Kilimani Plaza', location: 'Kilimani', image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=300&h=200&fit=crop' },
    { id: '3', name: 'Karen Gardens', location: 'Karen', image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=300&h=200&fit=crop' },
    { id: '4', name: 'Lavington Courts', location: 'Lavington', image: 'https://images.unsplash.com/photo-1460317442991-0ec209397118?w=300&h=200&fit=crop' },
  ];

  const loadDashboard = async () => {
    try {
      const res = await api.getDashboard();
      setDashboard(res.data);
    } catch {}
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  };

  useEffect(() => { loadDashboard(); }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.orange500} />}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* ─── Header ─────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.avatarRow}>
              <Image
                source={{ uri: user?.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face' }}
                style={styles.avatar}
              />
              <View>
                <Text style={styles.userName}>{tenantData.name}</Text>
                <Text style={styles.userRole}>Tenant</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Ionicons name="notifications-outline" size={22} color={Colors.gray600} />
            </TouchableOpacity>
          </View>

          <Text style={styles.greeting}>Let's manage your rent</Text>

          {/* ─── Search ───────────────────────── */}
          <View style={styles.searchRow}>
            <Ionicons name="search" size={20} color={Colors.gray400} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search properties"
              placeholderTextColor={Colors.gray400}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <TouchableOpacity style={styles.searchBtn}>
              <Text style={styles.searchBtnText}>Search</Text>
            </TouchableOpacity>
          </View>

          {/* ─── Property Circles ─────────────── */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.propCircles}>
            {properties.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={styles.propCircleItem}
                onPress={() => navigation.navigate('PropertyDetail', { propertyId: p.id })}
              >
                <Image source={{ uri: p.image }} style={styles.propCircleImg} />
                <Text style={styles.propCircleLabel}>{p.location}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ─── Current Property Card ──────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Current Property</Text>
            <TouchableOpacity>
              <Text style={styles.sectionLink}>View Details</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.propertyCard}>
            {/* Image + Overlays */}
            <View style={styles.propertyImageWrap}>
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&h=400&fit=crop' }}
                style={styles.propertyImage}
              />
              {/* Heart badge */}
              <View style={styles.heartBadge}>
                <Ionicons name="heart" size={14} color={Colors.orange500} />
                <Text style={styles.heartText}>24.3k</Text>
              </View>
              {/* Due countdown */}
              <View style={styles.dueBadge}>
                <Text style={styles.dueLabel}>Due in</Text>
                <Text style={styles.dueNumber}>{tenantData.daysLeft}d</Text>
              </View>
            </View>

            {/* Card Body */}
            <View style={styles.cardBody}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>{tenantData.property}</Text>
                <TouchableOpacity style={styles.arrowBtn}>
                  <Ionicons name="arrow-forward" size={18} color={Colors.white} />
                </TouchableOpacity>
              </View>

              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={16} color={Colors.gray400} />
                <Text style={styles.locationText}>{tenantData.location}</Text>
              </View>

              {/* Payment Breakdown */}
              <View style={styles.breakdownBox}>
                <Text style={styles.breakdownTitle}>Payment Breakdown</Text>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Base Rent</Text>
                  <Text style={styles.breakdownValue}>KES {tenantData.rentAmount.toLocaleString()}</Text>
                </View>
                <View style={styles.breakdownRow}>
                  <View style={styles.waterRow}>
                    <Ionicons name="water" size={14} color={Colors.blue500} />
                    <Text style={styles.breakdownLabel}>Water Bill</Text>
                  </View>
                  <Text style={styles.breakdownValue}>KES {tenantData.waterBill.toLocaleString()}</Text>
                </View>
                <View style={[styles.breakdownRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>Total Amount</Text>
                  <Text style={styles.totalValue}>KES {tenantData.totalAmount.toLocaleString()}</Text>
                </View>
              </View>

              {/* Pay Now CTA */}
              <TouchableOpacity
                style={styles.payBtn}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('Payment', {
                  amount: tenantData.totalAmount,
                  rentAmount: tenantData.rentAmount,
                  waterBill: tenantData.waterBill,
                  property: tenantData.property,
                })}
              >
                <Text style={styles.payBtnText}>Pay Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.gray50 },
  header: { backgroundColor: Colors.white, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  userName: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.gray900 },
  userRole: { fontSize: FontSizes.sm, color: Colors.gray500 },
  iconBtn: { padding: 8, borderRadius: 999 },
  greeting: { fontSize: FontSizes.xxl, fontWeight: '700', color: Colors.gray900, marginBottom: 20 },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.gray100, borderRadius: BorderRadius.xl, marginBottom: 16 },
  searchIcon: { paddingLeft: 12 },
  searchInput: { flex: 1, paddingHorizontal: 8, paddingVertical: 14, fontSize: FontSizes.base, color: Colors.gray900 },
  searchBtn: { backgroundColor: Colors.orange500, borderRadius: BorderRadius.lg, paddingHorizontal: 16, paddingVertical: 10, marginRight: 4 },
  searchBtnText: { color: Colors.white, fontSize: FontSizes.sm, fontWeight: '600' },
  propCircles: { marginBottom: 4 },
  propCircleItem: { alignItems: 'center', marginRight: 16 },
  propCircleImg: { width: 64, height: 64, borderRadius: 32, marginBottom: 6 },
  propCircleLabel: { fontSize: FontSizes.xs, color: Colors.gray600 },
  section: { paddingHorizontal: 16, marginTop: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.gray900 },
  sectionLink: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.orange500 },
  propertyCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.xxl, overflow: 'hidden', ...Shadows.md },
  propertyImageWrap: { position: 'relative' },
  propertyImage: { width: '100%', height: 192 },
  heartBadge: {
    position: 'absolute', top: 16, left: 16,
    backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 999,
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, gap: 4,
  },
  heartText: { fontSize: FontSizes.sm, fontWeight: '600' },
  dueBadge: {
    position: 'absolute', top: 16, right: 16,
    backgroundColor: Colors.orange500, borderRadius: BorderRadius.xl,
    paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center',
  },
  dueLabel: { fontSize: FontSizes.xs, color: Colors.orange100 },
  dueNumber: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.white },
  cardBody: { padding: 16 },
  cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.gray900 },
  arrowBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.orange500, alignItems: 'center', justifyContent: 'center',
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  locationText: { fontSize: FontSizes.base, color: Colors.gray600 },
  breakdownBox: { backgroundColor: Colors.gray50, borderRadius: BorderRadius.xl, padding: 16, marginBottom: 16 },
  breakdownTitle: { fontWeight: '600', color: Colors.gray900, marginBottom: 12 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  breakdownLabel: { color: Colors.gray600, fontSize: FontSizes.base },
  breakdownValue: { fontWeight: '600', fontSize: FontSizes.base, color: Colors.gray900 },
  waterRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  totalRow: { borderTopWidth: 1, borderTopColor: Colors.gray200, paddingTop: 8, marginTop: 4, marginBottom: 0 },
  totalLabel: { fontWeight: '600', color: Colors.gray900 },
  totalValue: { fontWeight: '700', color: Colors.orange500, fontSize: FontSizes.base },
  payBtn: { backgroundColor: Colors.orange500, borderRadius: BorderRadius.xl, paddingVertical: 16, alignItems: 'center' },
  payBtnText: { color: Colors.white, fontSize: FontSizes.lg, fontWeight: '700' },
});
