import { LocationObject, LocationAccuracy, requestForegroundPermissionsAsync, getCurrentPositionAsync } from 'expo-location';
import axios, { AxiosInstance } from 'axios';

interface LocationCoordinates {
    latitude: number;
    longitude: number;
}

interface DustboyStation {
    dustboy_id: string;
    dustboy_lat: string;
    dustboy_lng: string;
    dustboy_name: string;
    dustboy_name_en: string;
}

interface StationDistance extends DustboyStation {
    distance: number;
}

interface AirQualityValue {
    id: string;
    dustboy_id: string;
    dustboy_uri: string;
    dustboy_name: string;
    dustboy_name_en: string;
    dustboy_lat: string;
    dustboy_lon: string;
    pm10: number | null;
    pm25: number | null;
    wind_speed: number | null;
    wind_direction: number | null;
    atmospheric: number | null;
    pm10_th_aqi: number;
    pm10_us_aqi: string;
    pm25_th_aqi: number;
    pm25_us_aqi: string;
    temp: number | null;
    humid: number | null;
    us_aqi: string;
    us_color: string;
    us_dustboy_icon: string;
    us_title: string;
    us_title_en: string;
    us_caption: string;
    us_caption_en: string;
    th_aqi: number;
    th_color: string;
    th_dustboy_icon: string;
    th_title: string;
    th_title_en: string;
    th_caption: string;
    th_caption_en: string;
    daily_pm10: number;
    daily_pm10_th_aqi: number;
    daily_pm10_us_aqi: string;
    daily_pm25: number;
    daily_pm25_th_aqi: number;
    daily_pm25_us_aqi: string;
    daily_th_title: string;
    daily_th_title_en: string;
    daily_us_title: string;
    daily_us_title_en: string;
    daily_th_caption: string;
    daily_th_caption_en: string;
    daily_us_caption: string;
    daily_us_caption_en: string;
    daily_th_color: string;
    daily_us_color: string;
    daily_th_dustboy_icon: string;
    daily_us_dustboy_icon: string;
    daily_temp: number | null;
    daily_humid: number | null;
    daily_wind_speed: number | null;
    daily_wind_direction: number | null;
    daily_atmospheric: number | null;
    province_id: string;
    province_code: string;
    log_datetime: string;
}

export class AirQualityService {
    private static readonly EARTH_RADIUS_KM = 6371;
    private static readonly EXACT_MATCH_THRESHOLD = 0.1;
    private static readonly BASE_URL = 'https://www.cmuccdc.org/api/ccdc';

    private static axiosInstance: AxiosInstance = axios.create({
        baseURL: this.BASE_URL
    });

    private static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const dLat = this.toRadians(lat2 - lat1);
        const dLon = this.toRadians(lon2 - lon1);

        const lat1Rad = this.toRadians(lat1);
        const lat2Rad = this.toRadians(lat2);

        const sinDLatHalf = Math.sin(dLat / 2);
        const sinDLonHalf = Math.sin(dLon / 2);

        const a = sinDLatHalf * sinDLatHalf +
            Math.cos(lat1Rad) * Math.cos(lat2Rad) *
            sinDLonHalf * sinDLonHalf;

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return this.EARTH_RADIUS_KM * c;
    }

    private static toRadians(degrees: number): number {
        return degrees * (Math.PI / 180);
    }

    private static async getCurrentLocation(): Promise<{ latitude: number; longitude: number }> {
        try {
            const { status } = await requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                throw new Error('Location permission is required to find nearby stations');
            }

            const location: LocationObject = await getCurrentPositionAsync({
                accuracy: LocationAccuracy.High
            });

            if (!location?.coords) {
                throw new Error('Unable to get location coordinates');
            }

            return {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude
            };
        } catch (error) {
            console.error('Location error:', error);
            throw error instanceof Error
                ? error
                : new Error('An unexpected error occurred while getting location');
        }
    }

    public static async getNearbyStations(maxDistance: number = 105): Promise<any[]> {
        try {
            const [userLocation, { data: stations }] = await Promise.all([
                this.getCurrentLocation(),
                this.axiosInstance.get('/stations')
            ]);

            if (!stations?.length) {
                throw new Error('No stations data available');
            }

            const stationsWithDistance = stations.map(station => ({
                ...station,
                distance: this.calculateDistance(
                    userLocation.latitude,
                    userLocation.longitude,
                    parseFloat(station.dustboy_lat),
                    parseFloat(station.dustboy_lng)
                )
            }));

            const nearbyStations = stationsWithDistance
                .filter(station => station.distance <= maxDistance)
                .sort((a, b) => a.distance - b.distance);

            if (!nearbyStations.length) {
                throw new Error(`No stations found within ${maxDistance} km`);
            }

            return nearbyStations;
        } catch (error) {
            console.error('Error fetching nearby stations:', error);
            throw error instanceof Error
                ? error
                : new Error('An unexpected error occurred while finding nearby stations');
        }
    }

    public static async getStationValue(stationId: string): Promise<any> {
        console.log('Fetching data for station:', stationId);
        try {
            const { data } = await this.axiosInstance.get(`/value/${stationId}`);

            if (!data || (Array.isArray(data) && data.length === 0)) {
                throw new Error('No data available for this station');
            }

            return data;
        } catch (error) {
            console.error('Error fetching station value:', error);
            throw error instanceof Error
                ? error
                : new Error('An unexpected error occurred while fetching station value');
        }
    }

    public static async getStationValueWithFallback(stations: any[]): Promise<any> {
        if (!stations || stations.length === 0) {
            throw new Error('No stations provided');
        }

        let lastError: Error | null = null;

        for (const station of stations) {
            try {
                const data = await this.getStationValue(station.dustboy_id);
                if (data && (!Array.isArray(data) || data.length > 0)) {
                    return data;
                }
            } catch (error) {
                lastError = error instanceof Error ? error : new Error('Unknown error occurred');
                console.log(`Failed to fetch data for station ${station.dustboy_id}, trying next station...`);
                continue;
            }
        }

        throw lastError || new Error('No data available from any station');
    }
}
