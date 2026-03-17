import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, BorderRadius, FontSizes, Shadows } from '../utils/theme';
import { useAuth } from '../context/AuthContext';

export default function ProfileScreen({ navigation }: any) {
  const { user, logout } = useAuth();

  const menuItems = [
    { icon: 'person-outline', label: 'Edit Profile', screen: null },
    { icon: 'home-outline', label: 'My Properties', screen: null },
    { icon: 'document-text-outline', label: 'Lease Agreements', screen: 'Lease' },
    { icon: 'card-outline', label: 'Payment Methods', screen: null },
    { icon: 'notifications-outline', label: 'Notification Settings', screen: null },
    { icon: 'shield-checkmark-outline', label: 'Privacy & Security', screen: null },
    { icon: 'help-circle-outline', label: 'Help & Support', screen: null },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <Image
            source={{ uri: user?.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face' }}
            style={styles.avatar}
          />
          <Text style={styles.name}>{user?.name || 'Alex Kipchoge'}</Text>
          <Text style={styles.role}>{user?.role === 'landlord' ? 'Landlord' : 'Tenant'}</Text>
          <Text style={styles.phone}>{user?.phone || '+254 712 345 678'}</Text>
        </View>

        {/* Menu */}
        <View style={styles.menu}>
          {menuItems.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={styles.menuItem}
              onPress={() => item.screen && navigation.navigate(item.screen)}
            >
              <View style={styles.menuLeft}>
                <Ionicons name={item.icon as any} size={22} color={Colors.gray600} />
                <Text style={styles.menuLabel}>{item.label}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.gray400} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Ionicons name="log-out-outline" size={22} color={Colors.red500} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.gray50 },
  profileHeader: {
    backgroundColor: Colors.white, alignItems: 'center',
    paddingVertical: 32, paddingHorizontal: 16,
  },
  avatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 12 },
  name: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.gray900 },
  role: { fontSize: FontSizes.sm, color: Colors.orange500, fontWeight: '600', marginTop: 2 },
  phone: { fontSize: FontSizes.sm, color: Colors.gray500, marginTop: 4 },
  menu: { backgroundColor: Colors.white, marginTop: 12 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.gray100,
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuLabel: { fontSize: FontSizes.base, color: Colors.gray900, fontWeight: '500' },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginTop: 24, paddingVertical: 16,
  },
  logoutText: { color: Colors.red500, fontWeight: '700', fontSize: FontSizes.base },
});
