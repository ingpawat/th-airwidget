import { StatusBar } from 'expo-status-bar';
import { Text, View, ActivityIndicator, TouchableOpacity, RefreshControl, ScrollView, StyleSheet, SafeAreaView, Platform } from 'react-native';
import { useCallback, useState, useEffect } from 'react';
import { AirQualityService } from './service/AirQualityService';
import { styles } from './styles/air-quality-styles'

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

    try {
      // Get nearby stations (within 10km by default)
      const nearbyStations = await AirQualityService.getNearbyStations();
      console.log('Nearby stations:', nearbyStations);
      if (nearbyStations.length === 0) {
        throw new Error('No air quality stations found nearby');
      }

      // Use the closest station (first in the array since they're sorted by distance)
      const closestStation = nearbyStations[0];

      // Create AirData object from the station data
      const newAirData: AirData = {
        aqi: parseInt(closestStation.dustboy_status), // Assuming this is the AQI value
        coordinates: {
          latitude: parseFloat(closestStation.dustboy_lat),
          longitude: parseFloat(closestStation.dustboy_lng)
        },
        stationName: closestStation.dustboy_name_en,
        timestamp: new Date().toISOString(),
        pollutants: {
          'PM2.5': parseFloat(closestStation.dustboy_pv), // Add other pollutants as needed
        }
      };

      setAirData(newAirData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch air quality data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Rest of your component code remains the same...
  const getAQIColor = (aqi?: number) => {
    if (!aqi) return '#3b82f6';
    if (aqi <= 50) return '#10b981';
    if (aqi <= 100) return '#f59e0b';
    if (aqi <= 150) return '#ef4444';
    return '#7f1d1d';
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
