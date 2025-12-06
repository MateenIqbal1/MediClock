import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  Switch,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";

import { insertMedication } from "../../database/db";
import { requestNotificationPermission, scheduleMedicationNotification } from "../../notification";

export default function AddMedicationScreen({ navigation }) {
  // ------------------ State ------------------
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("Once daily");
  const [duration, setDuration] = useState("7");
  const [startDate, setStartDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [reminders, setReminders] = useState(true);
  const [refill, setRefill] = useState(false);
  const [notes, setNotes] = useState("");

  // ------------------ Options ------------------
  const frequencyChoices = [
    "Once daily",
    "Twice daily",
    "Three times daily",
    "Four times daily",
    "As needed",
  ];

  const durationChoices = [
    { label: "7", text: "7 days" },
    { label: "14", text: "14 days" },
    { label: "30", text: "30 days" },
    { label: "90", text: "90 days" },
    { label: "ongoing", text: "Ongoing" },
  ];

  // ------------------ Handlers ------------------
  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Medication name is required.");
      return;
    }

    const med = {
      name,
      dosage,
      frequency,
      duration,
      startDate: startDate.toISOString(),
      time: startDate.toISOString(),
      reminders,
      refill,
      notes,
    };

    try {
      const id = await insertMedication(med);

      // Request notification permission & schedule
      await requestNotificationPermission();
      await scheduleMedicationNotification({ ...med, id });

      Alert.alert("Success", "Medication saved & reminder scheduled!");
      navigation.goBack();
    } catch (err) {
      console.error("Insert error:", err);
      Alert.alert("Error", "Failed to save medication.");
    }
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate && selectedDate > new Date()) {
      setStartDate(selectedDate);
    }
  };

  const handleTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const newDate = new Date(startDate);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      if (newDate > new Date()) setStartDate(newDate);
    }
  };

  // ------------------ Formatting ------------------
  const formatDate = (date) =>
    date.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
  const formatTime = (date) =>
    date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  // ------------------ Render ------------------
  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Medication</Text>
      </View>

      {/* Form */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content}>

          {/* Name & Dosage */}
          <View style={styles.fieldCard}>
            <TextInput
              placeholder="Medication Name"
              placeholderTextColor="#9CA3AF"
              value={name}
              onChangeText={setName}
              style={styles.input}
            />
            <TextInput
              placeholder="Dosage (e.g. 500mg)"
              placeholderTextColor="#9CA3AF"
              value={dosage}
              onChangeText={setDosage}
              style={styles.input}
            />
          </View>

          {/* Frequency */}
          <View style={styles.fieldCard}>
            <Text style={styles.label}>How often?</Text>
            <View style={styles.grid}>
              {frequencyChoices.map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[styles.tile, frequency === f && styles.tileActive]}
                  onPress={() => setFrequency(f)}
                >
                  <Text style={[styles.tileText, frequency === f && styles.tileTextActive]}>
                    {f}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Duration */}
          <View style={styles.fieldCard}>
            <Text style={styles.label}>For how long?</Text>
            <View style={styles.gridSmall}>
              {durationChoices.map((d) => (
                <TouchableOpacity
                  key={d.label}
                  style={[styles.durationTile, duration === d.label && styles.durationTileActive]}
                  onPress={() => setDuration(d.label)}
                >
                  <Text style={[styles.durationMain, duration === d.label && styles.durationMainActive]}>
                    {d.label}
                  </Text>
                  <Text style={[styles.durationSub, duration === d.label && styles.durationSubActive]}>
                    {d.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Start Date */}
          <View style={styles.fieldCardRow}>
            <TouchableOpacity style={styles.rowCard} onPress={() => setShowDatePicker(true)}>
              <View style={styles.rowLeft}>
                <View style={styles.rowIcon}>
                  <Ionicons name="calendar-outline" size={20} color="#2E7D32" />
                </View>
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.rowTitle}>Starts {formatDate(startDate)}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* Start Time */}
          <View style={styles.fieldCardRow}>
            <TouchableOpacity style={styles.rowCard} onPress={() => setShowTimePicker(true)}>
              <View style={styles.rowLeft}>
                <View style={styles.rowIcon}>
                  <Ionicons name="time-outline" size={20} color="#2E7D32" />
                </View>
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.rowTitle}>{formatTime(startDate)}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* Reminders */}
          <View style={styles.fieldCardRow}>
            <View style={styles.toggleRowCard}>
              <View style={styles.toggleText}>
                <Text style={styles.rowTitle}>Reminders</Text>
                <Text style={styles.rowSub}>Get notified when it's time to take your medication</Text>
              </View>
              <Switch value={reminders} onValueChange={setReminders} />
            </View>
          </View>

          {/* Refill */}
          <View style={styles.fieldCardRow}>
            <View style={styles.toggleRowCard}>
              <View style={styles.toggleText}>
                <Text style={styles.rowTitle}>Refill Tracking</Text>
                <Text style={styles.rowSub}>Get notified when you need to refill</Text>
              </View>
              <Switch value={refill} onValueChange={setRefill} />
            </View>
          </View>

          {/* Notes */}
          <View style={styles.fieldCard}>
            <Text style={styles.label}>Notes</Text>
            <TextInput
              placeholder="Add notes or special instructions..."
              placeholderTextColor="#9CA3AF"
              value={notes}
              onChangeText={setNotes}
              style={[styles.input, { height: 100 }]}
              multiline
            />
          </View>

          <View style={{ height: 100 }} />

          {/* Pickers */}
          {showDatePicker && (
            <DateTimePicker
              value={startDate}
              mode="date"
              minimumDate={new Date()}
              display="default"
              onChange={handleDateChange}
            />
          )}
          {showTimePicker && (
            <DateTimePicker
              value={startDate}
              mode="time"
              is24Hour={false}
              display="default"
              onChange={handleTimeChange}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.addMedBtn} onPress={handleSave}>
          <Text style={styles.addMedText}>Add Medication</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelTextWrap} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ------------------ Styles ------------------
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#b5dac1ff" },
  header: {
    height: 100,
    backgroundColor: "#2EAF4F",
    paddingTop: 20,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    flexDirection: "row",
    alignItems: "center",
  },
  backBtn: { padding: 8, marginRight: 12 },
  headerTitle: { color: "white", fontSize: 20, fontWeight: "700" },
  content: { padding: 16 },
  fieldCard: { backgroundColor: "#F8FAF8", borderRadius: 12, padding: 14, marginBottom: 14 },
  fieldCardRow: { paddingHorizontal: 0, marginBottom: 12 },
  input: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "#F7F7F7",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 12,
    color: "#111",
  },
  label: { color: "#6B7280", fontSize: 13, marginBottom: 8, fontWeight: "600" },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  tile: {
    width: "48%",
    backgroundColor: "white",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  tileActive: { backgroundColor: "#2EAF4F", borderColor: "transparent" },
  tileText: { marginTop: 6, color: "#374151", fontWeight: "600", textAlign: "center" },
  tileTextActive: { color: "white" },
  gridSmall: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  durationTile: {
    width: "48%",
    backgroundColor: "#F8FAF8",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  durationTileActive: { backgroundColor: "#2EAF4F" },
  durationMain: { fontSize: 18, fontWeight: "700", color: "#111" },
  durationMainActive: { color: "white" },
  durationSub: { fontSize: 12, color: "#6B7280" },
  durationSubActive: { color: "rgba(255,255,255,0.9)" },
  rowCard: {
    height: 56,
    backgroundColor: "#F8FAF8",
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  rowLeft: { flexDirection: "row", alignItems: "center" },
  rowIcon: { width: 40, height: 40, backgroundColor: "#F0FBF0", borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rowTitle: { fontSize: 16, fontWeight: "700", color: "#111" },
  rowSub: { fontSize: 12, color: "#6B7280" },
  toggleRowCard: { height: 76, backgroundColor: "#F8FAF8", borderRadius: 12, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%" },
  toggleText: { flex: 1, paddingHorizontal: 8 },
  footer: { position: "absolute", bottom: 18, left: 0, right: 0, alignItems: "center" },
  addMedBtn: { backgroundColor: "#2EAF4F", width: "90%", paddingVertical: 14, borderRadius: 28, alignItems: "center", marginBottom: 8 },
  addMedText: { color: "white", fontSize: 16, fontWeight: "700" },
  cancelTextWrap: { alignItems: "center" },
  cancelText: { color: "#374151" },
});
