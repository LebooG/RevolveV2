import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, BorderRadius, FontSizes, Shadows } from '../utils/theme';

export default function NotificationsScreen({ navigation }: any) {
  const notifications = [
    { id: '1', title: 'Rent Due Soon', message: 'Your monthly rent payment is due in 4 days', time: '2h ago', type: 'urgent' },
    { id: '2', title: 'Water Bill Updated', message: 'Your water usage for July has been calculated', time: '1d ago', type: 'info' },
    { id: '3', title: 'Payment Received', message: "We've received your June rent payment", time: '2d ago', type: 'success' },
  ];

  const getIcon = (type: string) => {
    switch (type) {
      case 'urgent': return { name: 'warning', color: Colors.red600, bg: Colors.red100 };
      case 'success': return { name: 'checkmark-circle', color: Colors.green600, bg: Colors.green100 };
      default: return { name: 'notifications', color: Colors.orange600, bg: Colors.orange100 };
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={Colors.gray900} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity style={styles.backBtn}>
          <Ionicons name="settings-outline" size={22} color={Colors.gray900} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {notifications.map((n) => {
          const icon = getIcon(n.type);
          return (
            <View key={n.id} style={styles.card}>
              <View style={[styles.iconCircle, { backgroundColor: icon.bg }]}>
                <Ionicons name={icon.name as any} size={22} color={icon.color} />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{n.title}</Text>
                <Text style={styles.cardMsg}>{n.message}</Text>
                <Text style={styles.cardTime}>{n.time}</Text>
              </View>
            </View>
          );
        })}
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
  card: {
    backgroundColor: Colors.white, borderRadius: BorderRadius.xxl,
    padding: 16, marginBottom: 12, flexDirection: 'row',
    alignItems: 'flex-start', gap: 12, ...Shadows.sm,
  },
  iconCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  cardContent: { flex: 1 },
  cardTitle: { fontWeight: '700', color: Colors.gray900, marginBottom: 4, fontSize: FontSizes.base },
  cardMsg: { color: Colors.gray600, fontSize: FontSizes.sm, marginBottom: 6, lineHeight: 20 },
  cardTime: { color: Colors.gray400, fontSize: FontSizes.xs },
});
