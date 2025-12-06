import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { getAllMedications, getLogsByDate, logMedicationStatus, getNotificationsCount } from '../../database/db';
import { useFocusEffect } from '@react-navigation/native';
import { NotificationContext } from '../../context/NotificationContext';

export default function HomeScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [todayMeds, setTodayMeds] = useState([]); // {id,name,dosage,time,status}
  const [notificationCount, setNotificationCount] = useState(0);
  const { lastNotificationAction, notificationReceived } = useContext(NotificationContext);

  const totalDoses = todayMeds.length || 0;
  const takenDoses = todayMeds.filter(m => m.status === 'taken').length;
  const missedDoses = todayMeds.filter(m => m.status === 'missed').length;
  const progress = totalDoses === 0 ? 0 : (takenDoses / totalDoses) * 100;

  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference - (progress / 100) * circumference;

  useEffect(() => {
    loadToday();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadToday();
      loadNotificationCount();
    }, [])
  );

  async function loadNotificationCount() {
    try {
      const count = await getNotificationsCount();
      setNotificationCount(count);
    } catch (err) {
      console.warn('Load notification count error', err);
    }
  }

  // Listen for notification actions
  useEffect(() => {
    if (lastNotificationAction?.status === 'taken') {
      const { medicationId } = lastNotificationAction;
      setTodayMeds(prev =>
        prev.map(med => med.id === medicationId ? { ...med, status: 'taken' } : med)
      );
    }
  }, [lastNotificationAction]);

  // Listen for new notifications received
  useEffect(() => {
    if (notificationReceived) {
      loadNotificationCount();
    }
  }, [notificationReceived]);

  const loadToday = async () => {
    try {
      setLoading(true);
      const meds = await getAllMedications();
      const todayKey = formatDateKey(new Date());
      const logs = await getLogsByDate(todayKey);
      const now = new Date();

      const activeToday = [];
      for (const m of meds.filter(isActiveToday)) {
        const log = logs.find(l => l.medicationId === m.id);
        const scheduled = m.time ? new Date(m.time) : null;
        let status = log?.status;

        // Auto-mark missed if more than 1 hour past scheduled time and no status yet
        if (!status && scheduled && isSameDay(scheduled, now) && now - scheduled > 60 * 60 * 1000) {
          await logMedicationStatus(m.id, 'missed', now);
          status = 'missed';
        }

        activeToday.push({
          id: m.id,
          name: m.name,
          dosage: m.dosage,
          time: m.time,
          status,
        });
      }

      activeToday.sort((a, b) => new Date(a.time) - new Date(b.time));

      setTodayMeds(activeToday);
    } catch (err) {
      console.warn('HomeScreen loadToday error', err);
    } finally {
      setLoading(false);
    }
  };

  function formatDateKey(dateLike) {
    const d = typeof dateLike === 'string' ? new Date(dateLike) : dateLike;
    const y = d.getFullYear();
    const m = `${d.getMonth() + 1}`.padStart(2, '0');
    const da = `${d.getDate()}`.padStart(2, '0');
    return `${y}-${m}-${da}`;
  }

  function isActiveToday(med) {
    if (!med?.startDate) return false;
    const start = new Date(med.startDate);
    const today = new Date();
    // Zero out time for comparison
    const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (startDay > todayDay) return false;

    if (med.duration && med.duration !== 'ongoing') {
      const days = parseInt(med.duration, 10);
      if (!Number.isNaN(days)) {
        const diff = Math.floor((todayDay - startDay) / (1000 * 60 * 60 * 24));
        if (diff >= days) return false;
      }
    }
    return true;
  }

  function isSameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  async function markStatus(id, status) {
    // Update UI immediately
    setTodayMeds(prev =>
      prev.map(med => med.id === id ? { ...med, status } : med)
    );

    // Then persist to DB in background
    try {
      await logMedicationStatus(id, status, new Date());
    } catch (err) {
      console.warn('markStatus DB error', err);
      // Reload if DB fails to keep UI consistent
      await loadToday();
    }
  }

  function formatTime(timeIso) {
    const d = new Date(timeIso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#2EAF4F" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerContainer}>
          {/* Top Header Row */}
          <View style={styles.topRow}>
            <Text style={styles.headerTitle}>Daily Progress</Text>

            <TouchableOpacity 
              style={styles.bellWrap} 
              accessibilityLabel="Notifications"
              onPress={() => navigation.navigate('Notifications')}
            >
              <Ionicons
                name="notifications-outline"
                size={22}
                color="white"
              />
              {notificationCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{notificationCount > 99 ? '99+' : notificationCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Progress Card */}
          <View style={styles.progressCard}>
          <View style={styles.progressWrapper}>

            <Svg
              width={200}
              height={200}
            >
              {/* Background Ring */}
              <Circle
                cx={100}
                cy={100}
                r={radius}
                stroke="rgba(255,255,255,0.25)"
                strokeWidth={12}
                fill="transparent"
              />

              {/* Progress Ring */}
              <Circle
                cx={100}
                cy={100}
                r={radius}
                stroke="#ffffff"
                strokeWidth={12}
                strokeLinecap="round"
                fill="transparent"
                strokeDasharray={`${circumference} ${circumference}`}
                strokeDashoffset={strokeOffset}
                transform="rotate(-90 100 100)"
              />
            </Svg>

            {/* Text Inside Progress Circle */}
            <View style={styles.progressCenter}>
              <Text style={styles.progressPercent}>
                {Math.round(progress)}%
              </Text>

              <Text style={styles.progressLabel}>
                {takenDoses} of {totalDoses} doses
              </Text>
            </View>

          </View>
        </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsWrap}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: '#2EAF4F' }]}
              onPress={() => navigation.navigate('AddMedication')}
            >
              <View style={styles.iconWrap}>
                <Ionicons name="add" size={26} color="white" />
              </View>
              <Text style={styles.actionText}>Add Medication</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: '#2E8BF0' }]}
              onPress={() => navigation.navigate('CalendarView')}
            >
              <View style={styles.iconWrap}>
                <Ionicons name="calendar-outline" size={26} color="white" />
              </View>
              <Text style={styles.actionText}>Calendar View</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: '#E85D8A' }]}
              onPress={() => navigation.navigate('HistoryLog')}
            >
              <View style={styles.iconWrap}>
                <Ionicons name="time-outline" size={26} color="white" />
              </View>
              <Text style={styles.actionText}>History Log</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: '#FF7A3D' }]}
            >
              <View style={styles.iconWrap}>
                <Ionicons name="refresh-circle-outline" size={26} color="white" />
              </View>
              <Text style={styles.actionText}>Refill Tracker</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Schedule */}
        <View style={styles.scheduleWrap}>
          <View style={styles.scheduleHeader}>
            <Text style={styles.sectionTitle}>Today's Schedule</Text>
            <Text style={styles.smallHint}>{missedDoses > 0 ? `${missedDoses} missed` : ''}</Text>
          </View>

          {loading ? (
            <ActivityIndicator size="small" color="#2E7D32" />
          ) : todayMeds.length === 0 ? (
            <View style={styles.emptyCard}><Text style={styles.emptyText}>No medications scheduled today.</Text></View>
          ) : (
            <View style={styles.scheduleList}>
              {todayMeds.map(item => (
                <View key={item.id} style={styles.scheduleItem}>
                  <View style={styles.itemLeft}>
                    <View style={styles.itemIcon} />
                    <View style={styles.itemTextWrap}>
                      <Text style={styles.itemTitle}>{item.name}</Text>
                      <Text style={styles.itemSubtitle}>{item.dosage || ''} · {formatTime(item.time)}</Text>
                    </View>
                  </View>

                  {item.status ? (
                    <View style={[styles.statusPill, item.status === 'taken' ? styles.statusTaken : styles.statusMissed]}>
                      <Text style={item.status === 'taken' ? styles.statusTakenText : styles.statusMissedText}>
                        {item.status === 'taken' ? 'Taken' : 'Missed'}
                      </Text>
                    </View>
                  ) : (
                    <TouchableOpacity style={[styles.takeBtn, { backgroundColor: '#2EAF4F' }]} onPress={() => markStatus(item.id, 'taken')}>
                      <Text style={styles.takeText}>Take</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({

  safe: {
    flex: 1,
    backgroundColor: '#F2F6F4',
  },

  container: {
    padding: 16,
    backgroundColor: '#F2F6F4',
  },

  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 15,
  },

  headerTitle: {
    color: '#2E7D32',
    fontWeight: '600',
    fontSize: 16,
  },

  bellWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#2E7D32',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },

  badge: {
    position: 'absolute',
    right: -6,
    top: -6,
    backgroundColor: '#FF3B30',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },

  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },

  progressCard: {
    backgroundColor: '#2EAF4F',
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },

  progressWrapper: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },

  progressCenter: {
    position: 'absolute',
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },

  progressPercent: {
    color: 'white',
    fontSize: 32,
    fontWeight: '700',
  },

  progressLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    marginTop: 6,
  },

  quickActionsWrap: {
    marginBottom: 18,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    marginBottom: 10,
  },

  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  actionCard: {
    width: '48%',
    height: 90,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    justifyContent: 'space-between',
  },

  actionText: {
    color: 'white',
    fontWeight: '600',
    marginTop: 6,
  },

  scheduleWrap: {
    marginBottom: 40,
  },

  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  smallHint: { color: '#6B7280', fontSize: 12 },

  scheduleItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  itemIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#E8F5E9',
  },

  itemTextWrap: {
    marginLeft: 12,
  },

  itemTitle: {
    fontWeight: '700',
    color: '#111',
  },

  itemSubtitle: {
    color: '#888',
    marginTop: 4,
  },

  takeBtn: {
    backgroundColor: '#FFB74D',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
  },

  takeText: {
    color: 'white',
    fontWeight: '700',
  },

  actionRow: { flexDirection: 'row', alignItems: 'center' },
  statusPill: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16 },
  statusTaken: { backgroundColor: '#E6F6E9' },
  statusMissed: { backgroundColor: '#FFE9E9' },
  statusTakenText: { color: '#2E7D32', fontWeight: '700' },
  statusMissedText: { color: '#B00020', fontWeight: '700' },
  emptyCard: { backgroundColor: 'white', borderRadius: 12, padding: 14 },
  emptyText: { color: '#6B7280' },
});

