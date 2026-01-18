import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  SafeAreaView,
  StatusBar
} from 'react-native';
import * as Location from 'expo-location';

export default function App() {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [narration, setNarration] = useState("Enter your flight number and press 'Download Flight Pack' before takeoff, or press 'Scan Horizon' to identify your current location.");
  const [isTracking, setIsTracking] = useState(false);
  const [flightNumber, setFlightNumber] = useState('');

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Location permission denied. Enable it in settings to use this app.');
        return;
      }
    })();
  }, []);

  const scanHorizon = async () => {
    setNarration("Scanning horizon...");

    try {
      let loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
      setLocation(loc);

      // Mock narration - will be replaced with Claude API call
      const mockNarrations = [
        {
          text: "You are currently over the European continent. The patchwork of green and brown fields below tells the story of thousands of years of agriculture. Those geometric patterns are a testament to human cultivation dating back to the Neolithic period."
        },
        {
          text: "Below you lies terrain shaped by ancient glaciers. The U-shaped valleys and scattered lakes are remnants of the last Ice Age, approximately 10,000 years ago. The rivers you see carved their paths as the ice retreated northward."
        },
        {
          text: "The coastline visible on the horizon marks the boundary between land and sea that has shifted dramatically over millennia. During the last glacial maximum, this area was dry land, connecting regions now separated by water."
        }
      ];

      const randomNarration = mockNarrations[Math.floor(Math.random() * mockNarrations.length)];

      setTimeout(() => {
        setNarration(randomNarration.text);
      }, 1500);

    } catch (error) {
      setNarration("Could not get location. Make sure GPS is enabled.");
    }
  };

  const downloadFlightPack = () => {
    if (!flightNumber.trim()) {
      setNarration("Please enter a flight number first (e.g., BA284, LH123)");
      return;
    }

    setNarration(`Downloading flight pack for ${flightNumber.toUpperCase()}...\n\nThis will pre-cache all narrations for your route so they work offline during your flight.`);

    // Mock download - will be replaced with actual flight path API + Claude pre-generation
    setTimeout(() => {
      setNarration(`Flight pack for ${flightNumber.toUpperCase()} ready!\n\n23 checkpoints downloaded.\nEstimated flight time: 4h 32m\n\nYou can now enable Airplane Mode. The app will use GPS to trigger narrations as you fly.`);
    }, 2000);
  };

  const toggleTracking = async () => {
    if (isTracking) {
      setIsTracking(false);
      setNarration("Live tracking paused. Press 'Start Tracking' to resume.");
    } else {
      setIsTracking(true);
      setNarration("Live tracking enabled. Narrations will play automatically as you cross landmarks.");

      // Start watching position
      await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 1000, // Update every 1km
        },
        (newLocation) => {
          setLocation(newLocation);
          // Here we would check against geofenced checkpoints
        }
      );
    }
  };

  const formatAltitude = (meters) => {
    if (!meters) return "---";
    const feet = Math.round(meters * 3.28084);
    return feet.toLocaleString();
  };

  const formatSpeed = (mps) => {
    if (!mps) return "---";
    const knots = Math.round(mps * 1.94384);
    return knots;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>WINDOW SEAT</Text>
        <Text style={styles.subtitle}>AI Flight Narrator</Text>
      </View>

      {/* Telemetry Bar */}
      <View style={styles.telemetry}>
        <View style={styles.telemetryItem}>
          <Text style={styles.telemetryLabel}>LAT</Text>
          <Text style={styles.telemetryValue}>
            {location?.coords.latitude.toFixed(4) || "---"}
          </Text>
        </View>
        <View style={styles.telemetryItem}>
          <Text style={styles.telemetryLabel}>LNG</Text>
          <Text style={styles.telemetryValue}>
            {location?.coords.longitude.toFixed(4) || "---"}
          </Text>
        </View>
        <View style={styles.telemetryItem}>
          <Text style={styles.telemetryLabel}>ALT</Text>
          <Text style={styles.telemetryValue}>
            {formatAltitude(location?.coords.altitude)} FT
          </Text>
        </View>
        <View style={styles.telemetryItem}>
          <Text style={styles.telemetryLabel}>SPD</Text>
          <Text style={styles.telemetryValue}>
            {formatSpeed(location?.coords.speed)} KTS
          </Text>
        </View>
      </View>

      {/* Flight Number Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Enter Flight Number (e.g., BA284)"
          placeholderTextColor="#666"
          value={flightNumber}
          onChangeText={setFlightNumber}
          autoCapitalize="characters"
        />
        <TouchableOpacity style={styles.downloadBtn} onPress={downloadFlightPack}>
          <Text style={styles.downloadBtnText}>Download</Text>
        </TouchableOpacity>
      </View>

      {/* Narration Display */}
      <ScrollView style={styles.narrationContainer}>
        <Text style={styles.narrationText}>
          {errorMsg || narration}
        </Text>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.buttonSecondary]}
          onPress={toggleTracking}
        >
          <Text style={styles.buttonTextSecondary}>
            {isTracking ? "Stop Tracking" : "Start Tracking"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={scanHorizon}>
          <Text style={styles.buttonText}>Scan Horizon</Text>
        </TouchableOpacity>
      </View>

      {/* Status Indicator */}
      <View style={styles.statusBar}>
        <View style={[styles.statusDot, isTracking && styles.statusDotActive]} />
        <Text style={styles.statusText}>
          {isTracking ? "LIVE TRACKING" : "STANDBY"}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a1628',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  title: {
    color: '#00d4ff',
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 4,
  },
  subtitle: {
    color: '#ffffff',
    opacity: 0.6,
    fontSize: 14,
    marginTop: 4,
  },
  telemetry: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  telemetryItem: {
    alignItems: 'center',
  },
  telemetryLabel: {
    color: '#00d4ff',
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 4,
  },
  telemetryValue: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 15,
    color: '#ffffff',
    fontSize: 16,
  },
  downloadBtn: {
    backgroundColor: '#00d4ff',
    borderRadius: 12,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  downloadBtnText: {
    color: '#0a1628',
    fontWeight: 'bold',
  },
  narrationContainer: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  narrationText: {
    color: '#ffffff',
    fontSize: 18,
    lineHeight: 28,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 15,
  },
  button: {
    flex: 1,
    backgroundColor: '#00d4ff',
    padding: 18,
    borderRadius: 30,
    alignItems: 'center',
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#00d4ff',
  },
  buttonText: {
    color: '#0a1628',
    fontWeight: 'bold',
    fontSize: 16,
  },
  buttonTextSecondary: {
    color: '#00d4ff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#666',
    marginRight: 8,
  },
  statusDotActive: {
    backgroundColor: '#00ff88',
  },
  statusText: {
    color: '#666',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 2,
  },
});
