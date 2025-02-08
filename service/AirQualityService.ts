// service/AirQualityService.ts

import * as Location from 'expo-location';
import axios from 'axios';

interface DustboyStation {
    dustboy_id: string;
    dustboy_uri: string;
    dustboy_alias: string;
    dustboy_name_th: string;
    dustboy_name_en: string;
    dustboy_lat: string;
    dustboy_lng: string;
    dustboy_status: string;
    dustboy_pv: string;
    dustboy_version: string;
    db_email: string;
    db_co: string;
    db_mobile: string;
    db_addr: string;
    db_status: string;
    db_model: string;
    location: string;
}

interface LocationCoordinates {
    latitude: number;
    longitude: number;
}

export class AirQualityService {
    // private static readonly BASE_URL = 'https://www.cmuccdc.org/api/ccdc/stations';
    private static readonly axiosInstance = axios.create({
        baseURL: 'https://www.cmuccdc.org/api/ccdc/stations',
        timeout: 5000,
        headers: {
            'Content-Type': 'application/json'
        }
    });

    private static async getCurrentLocation(): Promise<LocationCoordinates> {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            throw new Error('Location permission denied');
        }

        const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High
        });
        console.log('Location:', location);
        return {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude
        };
    }

    public static async getStations(): Promise<DustboyStation[]> {
        try {
            const location = await AirQualityService.getCurrentLocation();
            const { data: stations } = await this.axiosInstance.get<DustboyStation[]>('');
            console.log('Stations:', stations);
            return stations;
        } catch (error) {
            console.error('Error fetching stations:', error);
            throw error;
        }
    }
}