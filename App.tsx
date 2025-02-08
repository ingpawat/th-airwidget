import { StatusBar } from 'expo-status-bar';
import { Text, View, ActivityIndicator, TouchableOpacity, RefreshControl, ScrollView, StyleSheet, SafeAreaView, Platform } from 'react-native';
import { useCallback, useState, useEffect } from 'react';
import { AirQualityService } from './service/AirQualityService';

interface AirData {
  aqi?: number;
  pollutants?: Record<string, number>;
  timestamp?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  stationName?: string;
}

export default function App() {
  const [airData, setAirData] = useState<AirData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const response = await AirQualityService.getStations();
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getAQIColor = (aqi?: number) => {
    if (!aqi) return '#3b82f6';
    if (aqi <= 50) return '#10b981'; // Good
    if (aqi <= 100) return '#f59e0b'; // Moderate
    if (aqi <= 150) return '#ef4444'; // Unhealthy for Sensitive Groups
    return '#7f1d1d'; // Unhealthy
  };

  const getAQILabel = (aqi?: number) => {
    if (!aqi) return 'Unknown';
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
    return 'Unhealthy';
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={fetchData}
            tintColor="#3b82f6"
          />
        }
      >
        <View style={styles.container}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={styles.loadingText}>Updating air quality data...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={fetchData}
              >
                <Text style={styles.buttonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : airData ? (
            <View style={styles.dataContainer}>
              <Text style={styles.title}>Air Quality Index</Text>
              
              {/* Location Display */}
              <View style={styles.locationContainer}>
                <Text style={styles.locationLabel}>Current Location</Text>
                <Text style={styles.locationText}>
                  {airData.coordinates?.latitude.toFixed(6)}, {airData.coordinates?.longitude.toFixed(6)}
                </Text>
                {airData.stationName && (
                  <Text style={styles.stationName}>
                    Nearest Station: {airData.stationName}
                  </Text>
                )}
              </View>

              <View style={[styles.aqiContainer, { backgroundColor: `${getAQIColor(airData.aqi)}15` }]}>
                <Text style={[styles.aqiNumber, { color: getAQIColor(airData.aqi) }]}>
                  {airData.aqi || 'N/A'}
                </Text>
                <Text style={[styles.aqiLabel, { color: getAQIColor(airData.aqi) }]}>
                  {getAQILabel(airData.aqi)}
                </Text>
              </View>

              <View style={styles.pollutantsContainer}>
                <Text style={styles.sectionTitle}>Pollutants</Text>
                {airData.pollutants && Object.entries(airData.pollutants).map(([key, value]) => (
                  <View key={key} style={styles.pollutantRow}>
                    <Text style={styles.pollutantKey}>{key}</Text>
                    <Text style={styles.pollutantValue}>{value} µg/m³</Text>
                  </View>
                ))}
              </View>

              <Text style={styles.timestamp}>
                Last Updated: {airData.timestamp || new Date().toLocaleString()}
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.fetchButton}
              onPress={fetchData}
            >
              <Text style={styles.buttonText}>Check Air Quality</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    marginBottom: 16,
    textAlign: 'center',
  },
  dataContainer: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  locationContainer: {
    backgroundColor: '#f3f4f6',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  locationLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
    textAlign: 'center',
  },
  locationText: {
    fontSize: 14,
    color: '#4b5563',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 8,
  },
  stationName: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  aqiContainer: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  aqiNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  aqiLabel: {
    fontSize: 18,
    fontWeight: '600',
  },
  pollutantsContainer: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  pollutantRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  pollutantKey: {
    fontSize: 16,
    color: '#4b5563',
  },
  pollutantValue: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
  },
  timestamp: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  fetchButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignSelf: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});