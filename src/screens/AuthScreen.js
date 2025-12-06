import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
const AuthScreen = ({ navigation }) => {
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        setIsBiometricAvailable(hasHardware && isEnrolled);
      } catch (e) {
        setIsBiometricAvailable(false);
      }
    })();
  }, []);

  const handleAuthenticate = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to continue',
        fallbackLabel: 'Use PIN',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        // Authentication successful — go to Home
        navigation.replace('Home');
      } else {
        Alert.alert('Authentication failed', 'Please try again or use PIN.');
      }
    } catch (e) {
      Alert.alert('Authentication error', String(e));
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoWrap} accessible accessibilityLabel="MediClock logo">
        <View style={styles.capsule}>
          <Ionicons name="medkit" size={40} color="#4CAF50" />
        </View>
      </View>

      <Text style={styles.appName}>MediClock</Text>
      <Text style={styles.subtitle}>Your Personal Medication Assistant</Text>

      <View style={styles.card}>
        <Text style={styles.welcome}>Welcome Back!</Text>
        <Text style={styles.hint}>Use fingerprint or pattern  to continue</Text>

        <TouchableOpacity
          style={styles.authButton}
          onPress={handleAuthenticate}
          accessibilityLabel="Authenticate"
        >
          <Ionicons name="finger-print" size={20} color="white" style={{ marginRight: 8 }} />
          <Text style={styles.authButtonText}>{isBiometricAvailable ? 'Use Biometric' : 'Use PIN'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default AuthScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  logoWrap: {
    marginBottom: 24,
  },
  capsule: {
    width: 110,
    height: 50,
    borderRadius: 26,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: {
    color: 'white',
    fontSize: 32,
    fontWeight: '700',
    marginTop: 12,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    marginTop: 6,
  },
  card: {
    marginTop: 28,
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
  },
  welcome: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222',
    marginBottom: 6,
  },
  hint: {
    fontSize: 13,
    color: '#666',
    marginBottom: 25,
    textAlign: 'center',
  },
  authButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 45,
    borderRadius: 8,
  },
  authButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
