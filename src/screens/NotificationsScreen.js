import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getNotificationsHistory, deleteNotification, clearAllNotifications } from '../../database/db';
import { useFocusEffect } from '@react-navigation/native';

function formatTime(isoTime) {
  const date = new Date(isoTime);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatDateHeader(isoTime) {
  const date = new Date(isoTime);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const notifDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((today - notifDate) / 86400000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  
  return date.toLocaleDateString('en-US', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });
}

function groupNotificationsByDate(notifications) {
  const groups = {};
  
  notifications.forEach(notif => {
    const date = new Date(notif.notificationTime);
    const dateKey = date.toDateString();
    
    if (!groups[dateKey]) {
      groups[dateKey] = {
        dateHeader: formatDateHeader(notif.notificationTime),
        notifications: [],
        isoDate: notif.notificationTime,
      };
    }
    
    groups[dateKey].notifications.push(notif);
  });
  
  // Convert to array and sort by date descending
  return Object.values(groups).sort((a, b) => 
    new Date(b.isoDate) - new Date(a.isoDate)
  );
}

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [groupedNotifications, setGroupedNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [])
  );

  async function loadNotifications() {
    try {
      setLoading(true);
      const data = await getNotificationsHistory();
      setNotifications(data);
      setGroupedNotifications(groupNotificationsByDate(data));
    } catch (err) {
      console.warn('Load notifications error', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    Alert.alert('Delete Notification', 'Remove this notification from history?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteNotification(id);
          await loadNotifications();
        },
      },
    ]);
  }

  async function handleClearAll() {
    Alert.alert('Clear All', 'Remove all notifications from history?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          await clearAllNotifications();
          await loadNotifications();
        },
      },
    ]);
  }

  return (
    <View style={styles.screen}>
      <View style={styles.topGreen}>
        <View style={styles.topInner}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="white" />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Notifications</Text>
          {notifications.length > 0 && (
            <TouchableOpacity onPress={handleClearAll} style={styles.clearBtn}>
              <Text style={styles.clearText}>Clear All</Text>
            </TouchableOpacity>
          )}
          {notifications.length === 0 && <View style={{ width: 40 }} />}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {notifications.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="notifications-off-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>No notifications yet</Text>
            <Text style={styles.emptySubtext}>Medication reminders will appear here</Text>
          </View>
        ) : (
          groupedNotifications.map((group, groupIndex) => (
            <View key={groupIndex} style={styles.dateGroup}>
              <Text style={styles.dateHeader}>{group.dateHeader}</Text>
              
              {group.notifications.map((notif) => (
                <View key={notif.id} style={styles.notifCard}>
                  <View style={styles.notifIcon}>
                    <Ionicons name="notifications" size={20} color="#2EAF4F" />
                  </View>
                  <View style={styles.notifContent}>
                    <View style={styles.notifTopRow}>
                      <Text style={styles.notifTitle}>{notif.medicationName}</Text>
                      <Text style={styles.notifTime}>{formatTime(notif.notificationTime)}</Text>
                    </View>
                    {notif.dosage && (
                      <Text style={styles.notifDosage}>{notif.dosage}</Text>
                    )}
                    <Text style={styles.notifBody}>{notif.body}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDelete(notif.id)} style={styles.deleteBtn}>
                    <Ionicons name="close" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F2F6F4' },
  topGreen: {
    backgroundColor: '#2EAF4F',
    paddingTop: Platform.OS === 'android' ? 30 : 50,
    paddingBottom: 12,
    paddingHorizontal: 12,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  topInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  topTitle: { color: 'white', fontSize: 20, fontWeight: '800', flex: 1, textAlign: 'center' },
  clearBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  clearText: { color: 'white', fontSize: 14, fontWeight: '600' },
  content: { padding: 16 },
  emptyWrap: { alignItems: 'center', paddingVertical: 80 },
  emptyText: { fontSize: 18, fontWeight: '700', color: '#6B7280', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#9CA3AF', marginTop: 8 },
  dateGroup: { marginBottom: 20 },
  dateHeader: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#374151', 
    marginBottom: 12,
    marginLeft: 4,
  },
  notifCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  notifIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E6F6E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notifContent: { flex: 1 },
  notifTopRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: 4,
  },
  notifTitle: { fontSize: 16, fontWeight: '700', color: '#111', flex: 1 },
  notifDosage: { 
    fontSize: 13, 
    color: '#2EAF4F', 
    marginBottom: 4,
    fontWeight: '600',
  },
  notifBody: { fontSize: 13, color: '#6B7280' },
  notifTime: { fontSize: 13, color: '#9CA3AF', fontWeight: '600', marginLeft: 8 },
  deleteBtn: { padding: 4 },
});
