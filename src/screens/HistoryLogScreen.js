import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getHistoryLogs, clearAllData } from '../../database/db';

function formatSectionTitle(iso){
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function formatTime(timeIso){
  const d = new Date(timeIso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function HistoryLogScreen({ navigation }){
  const [filter, setFilter] = useState('all');
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory(){
    try {
      setLoading(true);
      const rows = await getHistoryLogs();
      const grouped = rows.reduce((acc, row) => {
        const key = row.logDate;
        if (!acc[key]) acc[key] = [];
        acc[key].push({
          id: `${row.medicationId}-${row.logDate}`,
          name: row.name,
          dosage: row.dosage,
          time: row.time,
          status: row.status,
        });
        return acc;
      }, {});
      setData(grouped);
    } catch (err) {
      console.warn('History load error', err);
    } finally {
      setLoading(false);
    }
  }

  const sections = Object.keys(data).sort((a,b)=> new Date(b)-new Date(a));

  function clearAll(){
    Alert.alert('Clear All Data','This will delete all medications and history. Continue?',[
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          setLoading(true);
          await clearAllData();
          setData({});
          await loadHistory();
          // Navigate to Home so it reloads via focus listener
          navigation.navigate('Home');
        } catch (e) {
          console.warn('clearAll error', e);
        } finally {
          setLoading(false);
        }
      }}
    ]);
  }

  function filteredItems(items){
    if(filter === 'all') return items;
    return items.filter(i => i.status === filter);
  }

  return (
    <ScrollView contentContainerStyle={styles.screenWrap}>
      <View style={styles.topGreen}>
        <View style={styles.topInner}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color="#2E7D32" />
          </TouchableOpacity>
          <Text style={styles.topTitle}>History Log</Text>
          <View style={{width:40}} />
        </View>
      </View>

      <View style={styles.contentPad}>
        <View style={styles.filterRow}>
          <TouchableOpacity style={[styles.filterBtn, filter==='all'&&styles.filterActive]} onPress={()=>setFilter('all')}><Text style={[styles.filterText, filter==='all'&&styles.filterTextActive]}>All</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.filterBtn, filter==='taken'&&styles.filterActive]} onPress={()=>setFilter('taken')}><Text style={[styles.filterText, filter==='taken'&&styles.filterTextActive]}>Taken</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.filterBtn, filter==='missed'&&styles.filterActive]} onPress={()=>setFilter('missed')}><Text style={[styles.filterText, filter==='missed'&&styles.filterTextActive]}>Missed</Text></TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color="#2E7D32" />
        ) : sections.length === 0 ? (
          <View style={styles.emptyWrap}><Text style={styles.emptyText}>No history available.</Text></View>
        ) : (
          sections.map(sectionKey => {
            const items = filteredItems(data[sectionKey]);
            if(items.length === 0) return null;
            return (
              <View key={sectionKey} style={styles.sectionWrap}>
                <Text style={styles.sectionTitle}>{formatSectionTitle(sectionKey)}</Text>
                {items.map(it => (
                  <View key={it.id} style={styles.card}>
                    <View style={styles.cardLeft}>
                      <View style={[styles.pillColor, { backgroundColor: '#E8F5E9' }]} />
                      <View style={{ marginLeft: 12 }}>
                        <Text style={styles.cardTitle}>{it.name}</Text>
                        <Text style={styles.cardSub}>{it.dosage} · {formatTime(it.time)}</Text>
                      </View>
                    </View>
                    <View style={styles.cardRight}>
                      <View style={[styles.statusPill, it.status==='taken' ? styles.statusTaken : styles.statusMissed]}>
                        <Text style={styles.statusText}>{it.status === 'taken' ? 'Taken' : 'Missed'}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )
          })
        )}

        <View style={{height:20}} />
        <TouchableOpacity style={styles.clearBtn} onPress={clearAll}><Text style={styles.clearText}>Clear All Data</Text></TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screenWrap: { backgroundColor: '#F2F6F4', paddingBottom: 40 },
  topGreen: { backgroundColor: '#2E7D32', paddingTop: Platform.OS === 'android' ? 25 : 44, paddingBottom: 12, paddingHorizontal: 12 },
  topInner: { flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  backBtn: { width:40, height:40, alignItems:'center', justifyContent:'center', backgroundColor:'#ffffff', borderRadius:20 },
  topTitle: { color:'white', fontSize:20, fontWeight:'800' },
  contentPad: { padding:16 },
  filterRow: { flexDirection:'row', paddingVertical:8, justifyContent:'flex-start' },
  filterBtn: { paddingVertical:6, paddingHorizontal:12, borderRadius:18, backgroundColor:'#fff', marginRight:10 },
  filterActive: { backgroundColor:'#E6F6E9' },
  filterText: { color:'#6B7280', fontWeight:'700' },
  filterTextActive: { color:'#2E7D32' },
  sectionWrap: { marginTop:12 },
  sectionTitle: { fontWeight:'700', marginBottom:8 },
  card: { backgroundColor:'white', borderRadius:12, padding:12, flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:10, shadowColor:'#000', shadowOpacity:0.03, shadowRadius:6, shadowOffset:{width:0,height:3}, elevation:2 },
  cardLeft: { flexDirection:'row', alignItems:'center' },
  pillColor: { width:10, height:36, borderRadius:8 },
  cardTitle: { fontWeight:'700' },
  cardSub: { color:'#6B7280', marginTop:4 },
  statusPill: { paddingVertical:6, paddingHorizontal:12, borderRadius:18 },
  statusTaken: { backgroundColor:'#E6F9EE' },
  statusMissed: { backgroundColor:'#FFE9E9' },
  statusText: { color:'#2E7D32', fontWeight:'700' },
  clearBtn: { backgroundColor:'#FFCDD2', paddingVertical:12, borderRadius:12, alignItems:'center', marginTop:12 },
  clearText: { color:'#B00020', fontWeight:'700' },
  emptyWrap: { paddingVertical:40, alignItems:'center' },
  emptyText: { color:'#6B7280' },
});
