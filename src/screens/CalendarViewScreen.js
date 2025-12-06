import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAllMedications, getLogsByDate, logMedicationStatus } from '../../database/db';
import { useFocusEffect } from '@react-navigation/native';

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function generateMonth(year, month) {
    // month: 0-11
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const days = [];
    // add empty slots for first weekday
    for (let i = 0; i < first.getDay(); i++) days.push(null);
    for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d));
    return days;
}

export default function CalendarViewScreen({ navigation }) {
    const today = new Date();
    const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() });
    const [selected, setSelected] = useState(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
    const [loading, setLoading] = useState(false);
    const [medicationData, setMedicationData] = useState({}); // {dateKey: [logs]}
    const [allMedications, setAllMedications] = useState([]);

    const days = useMemo(() => generateMonth(view.year, view.month), [view]);

    useEffect(() => {
        loadCalendarData();
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadCalendarData();
        }, [])
    );

    const loadCalendarData = async () => {
        try {
            setLoading(true);
            const meds = await getAllMedications();
            setAllMedications(meds);

            console.log('Loading calendar, total meds:', meds.length);

            // Load past logs and calculate future meds
            const data = {};
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            for (const med of meds) {
                if (!med.startDate) continue;
                const startDate = new Date(med.startDate);
                const startDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
                const today_day = new Date(today.getFullYear(), today.getMonth(), today.getDate());

                console.log(`Med ${med.name}: starts ${startDay.toISOString().split('T')[0]}`);

                if (startDay > today_day) continue; // Skip medications that haven't started yet

                // Calculate end date
                let endDate = null;
                if (med.duration && med.duration !== 'ongoing') {
                    const days = parseInt(med.duration, 10);
                    if (!Number.isNaN(days)) {
                        endDate = new Date(startDate);
                        endDate.setDate(endDate.getDate() + days);
                    }
                }

                // Load past and today's logs
                const current = new Date(startDay);
                while (current <= today_day) {
                    if (endDate && current > endDate) break;

                    const dateKey = formatDateKey(current);
                    const logs = await getLogsByDate(dateKey);

                    if (!data[dateKey]) data[dateKey] = [];

                    const existingLog = logs.find(l => l.medicationId === med.id);
                    const status = existingLog?.status || null; // show scheduled even if not logged

                    data[dateKey].push({
                        id: med.id,
                        name: med.name,
                        dosage: med.dosage,
                        time: med.time,
                        status,
                    });
                    if (existingLog) {
                        console.log(`  ${dateKey}: ${med.name} - ${existingLog.status}`);
                    }

                    current.setDate(current.getDate() + 1);
                }
            }

            console.log('Calendar data loaded, dates with logs:', Object.keys(data).length);
            setMedicationData(data);
        } catch (err) {
            console.warn('Calendar load error', err);
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

    function prevMonth() {
        setView(v => {
            const m = v.month - 1;
            if (m < 0) return { year: v.year - 1, month: 11 };
            return { year: v.year, month: m };
        })
    }

    function nextMonth() {
        setView(v => {
            const m = v.month + 1;
            if (m > 11) return { year: v.year + 1, month: 0 };
            return { year: v.year, month: m };
        })
    }

    function iso(d) {
        if (!d) return null;
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    function hasLogs(dateKey) {
        return medicationData[dateKey] && medicationData[dateKey].length > 0;
    }

    async function markStatus(medId, status) {
        const dateKey = iso(selected);
        await logMedicationStatus(medId, status, selected);
        
        // Update local state
        setMedicationData(prev => ({
            ...prev,
            [dateKey]: (prev[dateKey] || []).map(m =>
                m.id === medId ? { ...m, status } : m
            )
        }));
    }

    const selectedKey = iso(selected);
    const list = medicationData[selectedKey] || [];

    function formatTime(timeIso) {
        const d = new Date(timeIso);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    return (
        <ScrollView contentContainerStyle={styles.screenWrap}>
            <View style={styles.topGreen}>
                <View style={styles.topInner}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={22} color="white" />
                    </TouchableOpacity>
                    <Text style={styles.topTitle}>Calendar</Text>
                    <View style={{ width: 40 }} />
                </View>

                <View style={styles.monthNav}>
                    <TouchableOpacity onPress={prevMonth} style={styles.navChev}><Ionicons name="chevron-back" size={18} color="#2E7D32" /></TouchableOpacity>
                    <Text style={styles.monthTitleGreen}>{new Date(view.year, view.month).toLocaleString(undefined, { month: 'long', year: 'numeric' })}</Text>
                    <TouchableOpacity onPress={nextMonth} style={styles.navChev}><Ionicons name="chevron-forward" size={18} color="#2E7D32" /></TouchableOpacity>
                </View>
            </View>

            <View style={styles.contentPad}>
                <View style={styles.calendarCard}>
                    <View style={styles.weekRow}>{weekDays.map(w => <Text key={w} style={styles.weekDay}>{w}</Text>)}</View>

                    <View style={styles.datesGrid}>
                        {days.map((d, idx) => {
                            const key = idx;
                            const dayIso = iso(d);
                            const hasEvents = dayIso && hasLogs(dayIso);
                            const isSelected = d && dayIso === selectedKey;
                            return (
                                <TouchableOpacity
                                    key={key}
                                    style={[styles.dateCell, isSelected && styles.dateCellActive]}
                                    onPress={() => d && setSelected(d)}
                                    activeOpacity={d ? 0.7 : 1}
                                >
                                    <Text style={[styles.dateText, isSelected && styles.dateTextActive]}>{d ? d.getDate() : ''}</Text>
                                    {hasEvents ? <View style={styles.dot} /> : null}
                                </TouchableOpacity>
                            )
                        })}
                    </View>
                </View>

                <View style={styles.listCard}>
                    <Text style={styles.listTitle}>{selected.toDateString()}</Text>
                    {loading ? (
                        <ActivityIndicator color="#2E7D32" />
                    ) : list.length === 0 ? (
                        <View style={styles.emptyRow}><Text style={styles.emptyText}>No medications scheduled for this date.</Text></View>
                    ) : (
                        list.map(item => (
                            <View key={item.id} style={styles.mItem}>
                                <View style={styles.mLeft}>
                                    <View style={[styles.mPill, item.status === 'taken' ? { backgroundColor: '#E6F6E9' } : { backgroundColor: '#FFE9E9' }]} />
                                    <View style={{ marginLeft: 12 }}>
                                        <Text style={styles.mName}>{item.name}</Text>
                                        <Text style={styles.mMeta}>{item.dosage} · {formatTime(item.time)}</Text>
                                    </View>
                                </View>
                                {item.status ? (
                                    <View style={[styles.statusPill, item.status === 'taken' ? styles.statusTaken : styles.statusMissed]}>
                                        <Text style={item.status === 'taken' ? styles.statusTakenText : styles.statusMissedText}>
                                            {item.status === 'taken' ? 'Taken' : 'Missed'}
                                        </Text>
                                    </View>
                                ) : (
                                    <TouchableOpacity style={[styles.takeBtn]} onPress={() => markStatus(item.id, 'taken')}>
                                        <Text style={styles.takeText}>Take</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        ))
                    )}
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    screenWrap: { backgroundColor: '#F2F6F4', paddingBottom: 40 },
    topGreen: { backgroundColor: '#2E7D32', paddingTop: Platform.OS === 'android' ? 30 : 50, paddingBottom: 12, paddingHorizontal: 12, borderBottomLeftRadius: 18, borderBottomRightRadius: 18 },
    topInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    topTitle: { color: 'white', fontSize: 18, fontWeight: '700' },
    monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10 },
    navChev: { backgroundColor: '#EAF7EA', padding: 8, borderRadius: 10, marginHorizontal: 14 },
    monthTitleGreen: { color: '#fff', fontWeight: '700', fontSize: 16 },
    contentPad: { padding: 12 },
    calendarCard: { backgroundColor: 'white', borderRadius: 14, padding: 12, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
    weekRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 6 },
    weekDay: { width: 36, textAlign: 'center', color: '#6B7280', fontWeight: '600', fontSize: 12 },
    datesGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 },
    dateCell: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', margin: 4 },
    dateCellActive: { backgroundColor: '#E6F6E9' },
    dateText: { color: '#111' },
    dateTextActive: { color: '#2E7D32', fontWeight: '700' },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#2E7D32', marginTop: 4 },
    listCard: { backgroundColor: 'white', borderRadius: 12, padding: 12 },
    listTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
    emptyRow: { paddingVertical: 24, alignItems: 'center' },
    emptyText: { color: '#6B7280' },
    mItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F1F1' },
    mLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    mPill: { width: 10, height: 36, borderRadius: 8 },
    mName: { fontWeight: '700' },
    mMeta: { color: '#6B7280', marginTop: 4, fontSize: 12 },
    takeBtn: { backgroundColor: '#2EAF4F', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 18 },
    takeText: { color: 'white', fontWeight: '700', fontSize: 12 },
    statusPill: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16 },
    statusTaken: { backgroundColor: '#E6F6E9' },
    statusMissed: { backgroundColor: '#FFE9E9' },
    statusTakenText: { color: '#2E7D32', fontWeight: '700', fontSize: 12 },
    statusMissedText: { color: '#B00020', fontWeight: '700', fontSize: 12 },
});
