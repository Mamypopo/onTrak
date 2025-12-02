/**
 * Routing Service - เรียกผ่าน Backend API
 * หลีกเลี่ยง CORS และเก็บ API key ใน backend
 */

import api from './api';

/**
 * Calculate route between multiple points using Backend API
 * Backend จะเรียก OpenRouteService ให้ (หลีกเลี่ยง CORS)
 */
export async function calculateRoute(
  coordinates: Array<[number, number]>, // [lat, lng] pairs
  profile: 'driving-car' | 'foot-walking' | 'cycling-regular' = 'driving-car'
): Promise<Array<[number, number]> | null> {
  // Fallback to original if less than 2 points
  if (coordinates.length < 2) {
    return coordinates;
  }

  // This function is kept for compatibility but not used directly
  // Use calculateSimplifiedRoute instead
  return coordinates;
}

/**
 * Simplified route calculation - เรียกผ่าน Backend API
 * Backend จะจัดการ OpenRouteService ให้ (หลีกเลี่ยง CORS)
 */
export async function calculateSimplifiedRoute(
  coordinates: Array<[number, number]>,
  minDistance: number = 200, // Only route if points are > 200m apart
  profile: 'driving-car' | 'foot-walking' | 'cycling-regular' = 'driving-car',
  deviceId?: string // Device ID for backend API call
): Promise<Array<[number, number]>> {
  if (coordinates.length < 2) {
    return coordinates;
  }

  // ถ้ามี deviceId ให้เรียก backend API (แนะนำ)
  if (deviceId) {
    try {
      const response = await api.get(`/api/device/${deviceId}/route`, {
        params: {
          days: 7,
          minDistance,
          profile,
        },
      });

      if (response.data.success && response.data.data) {
        console.log(
          `Route calculated via backend: ${response.data.routePoints} points (from ${response.data.originalPoints} original points)`
        );
        return response.data.data;
      }
    } catch (error) {
      console.error('Error calling backend route API, using straight line:', error);
      // Fallback to straight line
      return coordinates;
    }
  }

  // Fallback: ถ้าไม่มี deviceId หรือ API ล้มเหลว ใช้ straight line
  return coordinates;
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

