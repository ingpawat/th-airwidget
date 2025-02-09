import { StatusBar } from 'expo-status-bar';
import { Text, View, ActivityIndicator, TouchableOpacity, RefreshControl, ScrollView, SafeAreaView } from 'react-native';
import { useCallback, useState, useEffect } from 'react';
import { AirQualityService } from './service/AirQualityService';
import { styles } from './styles/air-quality-styles';

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface AirData {
  aqi: number;
  pollutants: {
    'PM2.5': number;
    'PM10': number;
  };
  timestamp: string;
  coordinates: Coordinates;
  stationName: string;
  stationId: string;
  quality: {
    label: string;
    color: string;
    description: string;
  };
}

export default function App() {
  const [airData, setAirData] = useState<AirData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const nearbyStations = await AirQualityService.getNearbyStations();
      console.log('Nearby stations:', nearbyStations);

      if (!nearbyStations || nearbyStations.length === 0) {
        throw new Error('No air quality stations found nearby');
      }

      // Try to get data from stations sequentially until we succeed
      const stationValue = await AirQualityService.getStationValueWithFallback(nearbyStations);
      console.log('Station value data:', stationValue);

      // Rest of your code remains the same...
      const newAirData: AirData = {
        aqi: parseInt(stationValue.us_aqi),
        pollutants: {
          'PM2.5': stationValue.pm25 || 0,
          'PM10': stationValue.pm10 || 0
        },
        coordinates: {
          latitude: parseFloat(stationValue.dustboy_lat),
          longitude: parseFloat(stationValue.dustboy_lon)
        },
        stationName: stationValue.dustboy_name_en,
        stationId: stationValue.dustboy_id,
        timestamp: stationValue.log_datetime,
        quality: {
          label: stationValue.us_title_en,
          color: stationValue.us_color.replace(/,/g, ', '),
          description: stationValue.us_caption_en
        }
      };

      console.log('Processed air data:', newAirData);
      setAirData(newAirData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch air quality data';
      console.error('Error fetching air quality data:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getAQIColor = (aqi: number) => {
    const rgbColor = airData?.quality.color || '59, 130, 246'; // Default blue
    return `rgb(${rgbColor})`;
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

              <View style={styles.locationContainer}>
                <Text style={styles.locationLabel}>Monitoring Station</Text>
                <Text style={styles.stationName}>{airData.stationName}</Text>
                <Text style={styles.locationText}>
                  {airData.coordinates.latitude.toFixed(6)}, {airData.coordinates.longitude.toFixed(6)}
                </Text>
              </View>

              <View style={[styles.aqiContainer, { backgroundColor: `${getAQIColor(airData.aqi)}15` }]}>
                <Text style={[styles.aqiNumber, { color: getAQIColor(airData.aqi) }]}>
                  {airData.aqi}
                </Text>
                <Text style={[styles.aqiLabel, { color: getAQIColor(airData.aqi) }]}>
                  {airData.quality.label}
                </Text>
                <Text style={styles.aqiDescription}>
                  {airData.quality.description}
                </Text>
              </View>

              <View style={styles.pollutantsContainer}>
                <Text style={styles.sectionTitle}>Pollutants</Text>
                {Object.entries(airData.pollutants).map(([key, value]) => (
                  <View key={key} style={styles.pollutantRow}>
                    <Text style={styles.pollutantKey}>{key}</Text>
                    <Text style={styles.pollutantValue}>{value} µg/m³</Text>
                  </View>
                ))}
              </View>

              <Text style={styles.timestamp}>
                Last Updated: {new Date(airData.timestamp).toLocaleString()}
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