import logger from '../utils/logger.js';

// Mapbox Directions API (แนะนำ - ดีกว่า OpenRouteService)
const MAPBOX_API_URL = 'https://api.mapbox.com/directions/v5';
const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN || '';

// OpenRouteService (fallback)
const ORS_API_URL = 'https://api.openrouteservice.org/v2/directions';
const ORS_API_KEY = process.env.ORS_API_KEY || '';

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
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

/**
 * Calculate route between two points using Mapbox Directions API (แนะนำ)
 */
async function calculateRouteSegmentMapbox(start, end, profile = 'driving') {
  try {
    if (!MAPBOX_ACCESS_TOKEN) {
      logger.warn('Mapbox access token not configured, falling back to OpenRouteService');
      return null;
    }

    // Mapbox expects [lng, lat] format
    const coords = `${start[1]},${start[0]};${end[1]},${end[0]}`;
    const url = `${MAPBOX_API_URL}/mapbox/${profile}/${coords}?geometries=geojson&access_token=${MAPBOX_ACCESS_TOKEN}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.warn({ status: response.status, error: errorText }, 'Mapbox API error');
      return null;
    }

    const data = await response.json();

    if (data.routes && data.routes[0]?.geometry?.coordinates) {
      // Convert back to [lat, lng]
      return data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    }

    return null;
  } catch (error) {
    logger.error({ error }, 'Error calculating route segment with Mapbox');
    return null;
  }
}

/**
 * Calculate route between two points using OpenRouteService (fallback)
 */
async function calculateRouteSegmentORS(start, end, profile = 'driving-car') {
  try {
    // OpenRouteService expects [lng, lat] format
    const coords = `${start[1]},${start[0]}|${end[1]},${end[0]}`;
    const apiKeyParam = ORS_API_KEY ? `&api_key=${ORS_API_KEY}` : '';
    const url = `${ORS_API_URL}/${profile}?coordinates=${coords}&geometry=true${apiKeyParam}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json, application/geo+json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.warn({ status: response.status, error: errorText }, 'OpenRouteService API error');
      return null;
    }

    const data = await response.json();

    if (data.geometry?.coordinates && data.geometry.coordinates.length > 0) {
      // Convert back to [lat, lng]
      return data.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    }

    return null;
  } catch (error) {
    logger.error({ error }, 'Error calculating route segment with OpenRouteService');
    return null;
  }
}

/**
 * Calculate route between two points (ใช้ Mapbox ก่อน, fallback ไป OpenRouteService)
 */
async function calculateRouteSegment(start, end, profile = 'driving-car') {
  // Mapbox profile mapping
  const mapboxProfile = profile === 'driving-car' ? 'driving' : 
                       profile === 'foot-walking' ? 'walking' : 
                       profile === 'cycling-regular' ? 'cycling' : 'driving';

  // Try Mapbox first (ดีกว่า)
  let segment = await calculateRouteSegmentMapbox(start, end, mapboxProfile);
  
  // Fallback to OpenRouteService if Mapbox fails
  if (!segment) {
    segment = await calculateRouteSegmentORS(start, end, profile);
  }

  return segment;
}

/**
 * Calculate route for multiple coordinates
 */
export async function calculateRoute(coordinates, profile = 'driving-car') {
  try {
    if (!coordinates || coordinates.length < 2) {
      return coordinates;
    }

    const routeSegments = [];
    let hasRoute = false;

    for (let i = 0; i < coordinates.length - 1; i++) {
      const start = coordinates[i];
      const end = coordinates[i + 1];

      const segment = await calculateRouteSegment(start, end, profile);

      if (segment && segment.length > 0) {
        hasRoute = true;
        // Add all points except the last one (to avoid duplicates)
        if (i === 0) {
          routeSegments.push(...segment);
        } else {
          routeSegments.push(...segment.slice(1));
        }
      } else {
        // Fallback to straight line
        if (i === 0) {
          routeSegments.push(start);
        }
        routeSegments.push(end);
      }

      // Rate limiting: wait between requests
      if (i < coordinates.length - 2) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    // Always add the last point
    if (routeSegments.length === 0 || 
        routeSegments[routeSegments.length - 1][0] !== coordinates[coordinates.length - 1][0]) {
      routeSegments.push(coordinates[coordinates.length - 1]);
    }

    return hasRoute && routeSegments.length > 0 ? routeSegments : coordinates;
  } catch (error) {
    logger.error({ error }, 'Error calculating route');
    return coordinates; // Fallback to original
  }
}

/**
 * Simplified route calculation - only route between significant points
 */
export async function calculateSimplifiedRoute(
  coordinates,
  minDistance = 200, // Only route if points are > 200m apart
  profile = 'driving-car'
) {
  if (!coordinates || coordinates.length < 2) {
    return coordinates;
  }

  // Calculate distance between consecutive points
  const significantPoints = [coordinates[0]];

  for (let i = 1; i < coordinates.length; i++) {
    const prev = coordinates[i - 1];
    const curr = coordinates[i];
    
    const distance = calculateDistance(prev[0], prev[1], curr[0], curr[1]);
    
    if (distance > minDistance) {
      significantPoints.push(curr);
    }
  }

  // Always include the last point
  if (significantPoints[significantPoints.length - 1][0] !== coordinates[coordinates.length - 1][0]) {
    significantPoints.push(coordinates[coordinates.length - 1]);
  }

  // If we have too many points, simplify further (limit to 15 points max)
  if (significantPoints.length > 15) {
    const step = Math.ceil(significantPoints.length / 15);
    const simplified = [];
    for (let i = 0; i < significantPoints.length; i += step) {
      simplified.push(significantPoints[i]);
    }
    if (simplified[simplified.length - 1][0] !== significantPoints[significantPoints.length - 1][0]) {
      simplified.push(significantPoints[significantPoints.length - 1]);
    }
    return await calculateRoute(simplified, profile);
  }

  return await calculateRoute(significantPoints, profile);
}

