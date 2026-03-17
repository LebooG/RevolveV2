import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../utils/theme';

// Screens
import HomeScreen from '../screens/HomeScreen';
import TransactionsScreen from '../screens/TransactionsScreen';
import MessagesScreen from '../screens/MessagesScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import LoginScreen from '../screens/LoginScreen';
import OtpScreen from '../screens/OtpScreen';
import PropertyDetailScreen from '../screens/PropertyDetailScreen';
import PaymentScreen from '../screens/PaymentScreen';
import TenantDetailScreen from '../screens/TenantDetailScreen';
import LeaseScreen from '../screens/LeaseScreen';
import AddPropertyScreen from '../screens/AddPropertyScreen';
import AddTenantScreen from '../screens/AddTenantScreen';

import { useAuth } from '../context/AuthContext';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// ─── Floating bottom tab bar (matching TSX design) ──────
function CustomTabBar({ state, descriptors, navigation }: any) {
  const icons: Record<string, string> = {
    Home: 'home',
    Transactions: 'card',
    Messages: 'chatbubble',
    Profile: 'person',
  };

  return (
    <View style={styles.tabBarContainer}>
      <View style={styles.tabBar}>
        {state.routes.map((route: any, index: number) => {
          const isFocused = state.index === index;
          const iconName = icons[route.name] || 'ellipse';

          return (
            <View
              key={route.key}
              style={[styles.tabItem, isFocused && styles.tabItemActive]}
            >
              <Ionicons
                name={iconName as any}
                size={22}
                color={isFocused ? Colors.white : Colors.gray400}
                onPress={() => {
                  if (!isFocused) {
                    navigation.navigate(route.name);
                  }
                }}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─── Main Tab Navigator ─────────────────────────────────
function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Transactions" component={TransactionsScreen} />
      <Tab.Screen name="Messages" component={MessagesScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// ─── Auth Stack ─────────────────────────────────────────
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="OTP" component={OtpScreen} />
    </Stack.Navigator>
  );
}

// ─── Root Navigator ─────────────────────────────────────
export default function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null; // Splash screen handles this
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <>
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen name="PropertyDetail" component={PropertyDetailScreen} />
          <Stack.Screen name="Payment" component={PaymentScreen} />
          <Stack.Screen name="TenantDetail" component={TenantDetailScreen} />
          <Stack.Screen name="Lease" component={LeaseScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="AddProperty" component={AddPropertyScreen} />
          <Stack.Screen name="AddTenant" component={AddTenantScreen} />
        </>
      ) : (
        <Stack.Screen name="Auth" component={AuthStack} />
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.gray900,
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 24,
  },
  tabItem: {
    padding: 12,
    borderRadius: 999,
  },
  tabItemActive: {
    backgroundColor: Colors.orange500,
  },
});
