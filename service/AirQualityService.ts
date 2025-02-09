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
}

interface StationDistance {
    dustboy_id: string;
    distance: number;
}

export class AirQualityService {
    private static readonly EARTH_RADIUS_KM = 6371;
    private static readonly EXACT_MATCH_THRESHOLD = 0.1;
    
    private static axiosInstance: AxiosInstance = axios.create({
        baseURL: 'https://www.cmuccdc.org/api/ccdc/stations'
    });

    private static calculateDistance(
        lat1: number,
        lon1: number,
        lat2: number,
        lon2: number
    ): number {
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

    private static async getCurrentLocation(): Promise<LocationCoordinates> {
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
            if (error instanceof Error) {
                throw new Error(`Failed to get current location: ${error.message}`);
            }
            throw new Error('An unexpected error occurred while getting location');
        }
    }

    public static async getNearbyStations(maxDistance: number = 10): Promise<string> {
        try {
            const [userLocation, { data: stations }] = await Promise.all([
                this.getCurrentLocation(),
                this.axiosInstance.get<DustboyStation[]>('')
            ]);

            if (!stations?.length) {
                throw new Error('No stations data available');
            }

            const stationsWithDistance: StationDistance[] = stations.map(station => ({
                dustboy_id: station.dustboy_id,
                distance: this.calculateDistance(
                    userLocation.latitude,
                    userLocation.longitude,
                    parseFloat(station.dustboy_lat),
                    parseFloat(station.dustboy_lng)
                )
            }));

            const exactMatch = stationsWithDistance.find(
                station => station.distance < this.EXACT_MATCH_THRESHOLD
            );
            if (exactMatch) {
                return exactMatch.dustboy_id;
            }

            const nearbyStations = stationsWithDistance
                .filter(station => station.distance <= maxDistance)
                .sort((a, b) => a.distance - b.distance);

            if (!nearbyStations.length) {
                throw new Error(`No stations found within ${maxDistance} km`);
            }

            return nearbyStations[0].dustboy_id;
        } catch (error) {
            console.error('Error fetching nearby station ID:', error);
            throw error instanceof Error 
                ? error 
                : new Error('An unexpected error occurred while finding nearby stations');
        }
    }
}