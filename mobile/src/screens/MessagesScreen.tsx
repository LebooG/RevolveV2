import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, ScrollView, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, BorderRadius, FontSizes, Shadows } from '../utils/theme';

export default function MessagesScreen({ navigation }: any) {
  const [messageText, setMessageText] = useState('');

  const landlord = {
    name: 'Sarah Mwangi',
    role: 'Landlord',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b631?w=150&h=150&fit=crop&crop=face',
  };

  const tenant = {
    name: 'You',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
  };

  const messages = [
    {
      id: '1',
      sender: 'landlord',
      text: "Hi Alex, just a friendly reminder that your rent payment is due in 4 days. The water bill has been updated to KES 2,800 this month.",
      time: '2 hours ago',
    },
    {
      id: '2',
      sender: 'tenant',
      text: "Thank you for the reminder and the water bill update. I'll process the payment by tomorrow evening.",
      time: '1 day ago',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={Colors.gray900} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity style={styles.backBtn}>
          <Ionicons name="add" size={24} color={Colors.gray900} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((msg) => {
          const isLandlord = msg.sender === 'landlord';
          const person = isLandlord ? landlord : tenant;
          return (
            <View
              key={msg.id}
              style={[
                styles.msgCard,
                isLandlord ? styles.msgCardLandlord : styles.msgCardTenant,
              ]}
            >
              <View style={styles.msgHeader}>
                <Image source={{ uri: person.avatar }} style={styles.msgAvatar} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.msgName}>{person.name}</Text>
                  <Text style={styles.msgTime}>
                    {isLandlord ? `${landlord.role} • ` : ''}{msg.time}
                  </Text>
                </View>
                {isLandlord && <View style={styles.unreadDot} />}
              </View>
              <Text style={styles.msgText}>{msg.text}</Text>
              {isLandlord && (
                <TouchableOpacity>
                  <Text style={styles.replyLink}>Reply</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Compose Bar */}
      <View style={styles.composeBar}>
        <TextInput
          style={styles.composeInput}
          placeholder="Type a message..."
          placeholderTextColor={Colors.gray400}
          value={messageText}
          onChangeText={setMessageText}
        />
        <TouchableOpacity style={styles.sendBtn}>
          <Ionicons name="send" size={20} color={Colors.white} />
        </TouchableOpacity>
      </View>
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
  msgCard: {
    borderRadius: BorderRadius.xxl, padding: 16, marginBottom: 16, ...Shadows.sm,
  },
  msgCardLandlord: { backgroundColor: Colors.white },
  msgCardTenant: {
    backgroundColor: Colors.orange50,
    borderWidth: 1, borderColor: Colors.orange100,
  },
  msgHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  msgAvatar: { width: 48, height: 48, borderRadius: 24 },
  msgName: { fontWeight: '700', color: Colors.gray900, fontSize: FontSizes.base },
  msgTime: { color: Colors.gray500, fontSize: FontSizes.sm },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.orange500 },
  msgText: { color: Colors.gray700, fontSize: FontSizes.base, lineHeight: 22 },
  replyLink: { color: Colors.orange500, fontWeight: '600', marginTop: 12, fontSize: FontSizes.base },
  composeBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.white, paddingHorizontal: 16,
    paddingVertical: 12, paddingBottom: 32, gap: 8,
    borderTopWidth: 1, borderTopColor: Colors.gray100,
  },
  composeInput: {
    flex: 1, backgroundColor: Colors.gray100, borderRadius: BorderRadius.xl,
    paddingHorizontal: 16, paddingVertical: 12, fontSize: FontSizes.base,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.orange500, alignItems: 'center', justifyContent: 'center',
  },
});
