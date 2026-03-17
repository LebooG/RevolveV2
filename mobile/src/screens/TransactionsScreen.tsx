import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, BorderRadius, FontSizes, Shadows } from '../utils/theme';
import { LinearGradient } from 'expo-linear-gradient' ;
import api from '../services/api';

export default function TransactionsScreen({ navigation }: any) {
  const [showBalance, setShowBalance] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const balance = 12500;
  const property = 'Westlands Heights';
  const unit = 'Apartment 4B';

  const transactions = [
    { id: '1', type: 'Monthly Rent', amount: 67800, date: 'Jun 15', status: 'completed', method: 'M-Pesa', rent: 65000, water: 2800 },
    { id: '2', type: 'Monthly Rent', amount: 67800, date: 'May 15', status: 'completed', method: 'M-Pesa', rent: 65000, water: 2800 },
    { id: '3', type: 'Monthly Rent', amount: 67800, date: 'Apr 15', status: 'completed', method: 'Bank', rent: 65000, water: 2800 },
  ];

  const onRefresh = async () => {
    setRefreshing(true);
    try { await api.getPayments(); } catch {}
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={Colors.gray900} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment History</Text>
        <TouchableOpacity style={styles.backBtn}>
          <Ionicons name="filter" size={22} color={Colors.gray900} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.orange500} />}
      >
        {/* Balance Card — orange → red gradient */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceGradient}>
            <View style={styles.balanceTop}>
              <View>
                <Text style={styles.balanceLabel}>Account Balance</Text>
                <Text style={styles.balanceAmount}>
                  {showBalance ? `KES ${balance.toLocaleString()}` : 'KES ••••••'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowBalance(!showBalance)}>
                <Ionicons name={showBalance ? 'eye-off' : 'eye'} size={22} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
            </View>
            <Text style={styles.balanceProperty}>{property} • {unit}</Text>
          </View>
        </View>

        {/* Transactions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          {transactions.map((tx) => (
            <View key={tx.id} style={styles.txCard}>
              <View style={styles.txTop}>
                <View style={styles.txLeft}>
                  <View style={styles.txIcon}>
                    <Ionicons name="checkmark-circle" size={22} color={Colors.green600} />
                  </View>
                  <View>
                    <Text style={styles.txType}>{tx.type}</Text>
                    <Text style={styles.txMeta}>{tx.date} • {tx.method}</Text>
                  </View>
                </View>
                <View style={styles.txRight}>
                  <Text style={styles.txAmount}>KES {tx.amount.toLocaleString()}</Text>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>{tx.status}</Text>
                  </View>
                </View>
              </View>

              {/* Breakdown */}
              <View style={styles.txBreakdown}>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Rent</Text>
                  <Text style={styles.breakdownValue}>KES {tx.rent.toLocaleString()}</Text>
                </View>
                <View style={styles.breakdownRow}>
                  <View style={styles.waterLabel}>
                    <Ionicons name="water" size={12} color={Colors.blue500} />
                    <Text style={styles.breakdownLabel}>Water</Text>
                  </View>
                  <Text style={styles.breakdownValue}>KES {tx.water.toLocaleString()}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.gray50 },
  header: {
    backgroundColor: Colors.white, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 16,
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.gray900 },
  balanceCard: { paddingHorizontal: 16, marginTop: 8 },
  balanceGradient: {
    backgroundColor: Colors.orange500,
    borderRadius: BorderRadius.xxl, padding: 24,
    // In production, use expo-linear-gradient for the orange→red effect
  },
  balanceTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  balanceLabel: { color: 'rgba(255,255,255,0.7)', marginBottom: 4, fontSize: FontSizes.sm },
  balanceAmount: { color: Colors.white, fontSize: FontSizes.xxxl, fontWeight: '700' },
  balanceProperty: { color: 'rgba(255,255,255,0.7)', fontSize: FontSizes.sm },
  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionTitle: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.gray900, marginBottom: 12 },
  txCard: {
    backgroundColor: Colors.white, borderRadius: BorderRadius.xxl,
    padding: 16, marginBottom: 12, ...Shadows.sm,
  },
  txTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  txLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  txIcon: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.green100, alignItems: 'center', justifyContent: 'center',
  },
  txType: { fontWeight: '700', color: Colors.gray900, fontSize: FontSizes.base },
  txMeta: { color: Colors.gray500, fontSize: FontSizes.sm },
  txRight: { alignItems: 'flex-end' },
  txAmount: { fontWeight: '700', color: Colors.gray900, fontSize: FontSizes.base },
  statusBadge: {
    backgroundColor: Colors.green100, borderRadius: 999,
    paddingHorizontal: 8, paddingVertical: 2, marginTop: 4,
  },
  statusText: { fontSize: FontSizes.xs, color: Colors.green600, fontWeight: '600' },
  txBreakdown: { backgroundColor: Colors.gray50, borderRadius: BorderRadius.xl, padding: 12 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  breakdownLabel: { color: Colors.gray600, fontSize: FontSizes.sm },
  breakdownValue: { fontWeight: '600', fontSize: FontSizes.sm, color: Colors.gray900 },
  waterLabel: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
