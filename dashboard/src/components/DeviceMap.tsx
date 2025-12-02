"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { calculateSimplifiedRoute } from "@/lib/routing";
import { Maximize2, Minimize2, Navigation } from "lucide-react";

// Fix for default marker icon in Next.js
if (typeof window !== "undefined") {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  });
}

interface LocationHistory {
  latitude: number;
  longitude: number;
  createdAt: string;
}

interface DeviceMapProps {
  latitude: number;
  longitude: number;
  deviceName?: string;
  deviceCode?: string;
  deviceId?: string; // Device ID for backend route API
  locationHistory?: LocationHistory[];
}

export default function DeviceMap({ 
  latitude, 
  longitude, 
  deviceName, 
  deviceCode,
  deviceId,
  locationHistory = []
}: DeviceMapProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [routePositions, setRoutePositions] = useState<Array<[number, number]>>([]);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Ensure component is mounted on client side
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Convert location history to coordinates
  const rawCoordinates = useMemo(() => {
    if (!locationHistory || locationHistory.length === 0) {
      return [];
    }
    return locationHistory.map(loc => [loc.latitude, loc.longitude] as [number, number]);
  }, [locationHistory]);

  // Calculate route using OpenRouteService (road routing)
  useEffect(() => {
    if (!isMounted || rawCoordinates.length < 2) {
      setRoutePositions(rawCoordinates);
      return;
    }

    // Only calculate route if we have enough points
    if (rawCoordinates.length >= 2) {
      setIsCalculatingRoute(true);
      
      calculateSimplifiedRoute(rawCoordinates, 200, 'driving-car', deviceId) // เรียกผ่าน backend API
        .then((routed) => {
          setRoutePositions(routed);
          console.log("Route calculated:", routed.length, "points (from", rawCoordinates.length, "original points)");
        })
        .catch((error) => {
          console.error("Error calculating route, using straight line:", error);
          // Fallback to straight line
          setRoutePositions(rawCoordinates);
        })
        .finally(() => {
          setIsCalculatingRoute(false);
        });
    } else {
      setRoutePositions(rawCoordinates);
    }
  }, [rawCoordinates, isMounted, deviceId]);

  // Debug: Log route positions
  useEffect(() => {
    console.log("DeviceMap - Location history:", locationHistory.length, "points");
    console.log("DeviceMap - Route positions:", routePositions.length, "points");
  }, [locationHistory.length, routePositions.length]);

  // Handle fullscreen toggle
  const toggleFullscreen = () => {
    if (!mapContainerRef.current) return;

    if (!isFullscreen) {
      // Enter fullscreen
      if (mapContainerRef.current.requestFullscreen) {
        mapContainerRef.current.requestFullscreen();
      } else if ((mapContainerRef.current as any).webkitRequestFullscreen) {
        (mapContainerRef.current as any).webkitRequestFullscreen();
      } else if ((mapContainerRef.current as any).msRequestFullscreen) {
        (mapContainerRef.current as any).msRequestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  // Listen for fullscreen changes and invalidate map size
  useEffect(() => {
    const handleFullscreenChange = () => {
      const wasFullscreen = isFullscreen;
      const nowFullscreen = !!(document.fullscreenElement || 
                              (document as any).webkitFullscreenElement || 
                              (document as any).msFullscreenElement);
      setIsFullscreen(nowFullscreen);
      
      // Invalidate map size when entering/exiting fullscreen
      if (wasFullscreen !== nowFullscreen) {
        setTimeout(() => {
          // Trigger map resize by dispatching a resize event
          window.dispatchEvent(new Event('resize'));
        }, 100);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, [isFullscreen]);

  // Helper function to generate Google Maps link
  const getGoogleMapsLink = (lat: number, lng: number, label?: string) => {
    const labelParam = label ? `&q=${encodeURIComponent(label)}` : '';
    return `https://www.google.com/maps?q=${lat},${lng}${labelParam}`;
  };

  // Component to handle map updates
  function MapUpdater({ 
    center, 
    routePositions: positions 
  }: { 
    center: [number, number]; 
    routePositions: Array<[number, number]> 
  }) {
    const map = useMap();
    
    // Update map view when location changes
    useEffect(() => {
      if (map) {
        try {
          map.setView(center, 15);
        } catch (error) {
          console.error("Error setting map view:", error);
        }
      }
    }, [center, map]);
    
    // Auto-fit map bounds to show entire route if history exists
    useEffect(() => {
      if (map && positions.length > 0) {
        try {
          const bounds = L.latLngBounds(positions);
          map.fitBounds(bounds, { padding: [20, 20] });
        } catch (error) {
          console.error("Error fitting bounds:", error);
        }
      }
    }, [positions, map]);
    
    // Invalidate size on mount and when window resizes (for fullscreen)
    useEffect(() => {
      if (map) {
        const invalidateSize = () => {
          setTimeout(() => {
            try {
              map.invalidateSize();
            } catch (error) {
              console.error("Error invalidating map size:", error);
            }
          }, 100);
        };
        
        invalidateSize();
        
        // Listen for resize events (including fullscreen changes)
        window.addEventListener('resize', invalidateSize);
        
        return () => {
          window.removeEventListener('resize', invalidateSize);
        };
      }
    }, [map]);
    
    return null;
  }

  // Don't render until mounted (client-side only)
  if (!isMounted) {
    return (
      <div className="w-full h-64 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show loading while calculating route
  if (isCalculatingRoute && routePositions.length === 0) {
    return (
      <div className="w-full h-64 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">กำลังคำนวณเส้นทาง...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={mapContainerRef}
      className="w-full h-64 rounded-lg overflow-hidden relative" 
      style={{ minHeight: '256px' }}
    >
      {/* Fullscreen Toggle Button */}
      <button
        onClick={toggleFullscreen}
        className="absolute top-2 right-2 z-[1000] bg-white hover:bg-gray-100 rounded-md p-2 shadow-md transition-colors"
        title={isFullscreen ? "ย่อ" : "ขยาย"}
        aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
      >
        {isFullscreen ? (
          <Minimize2 className="h-4 w-4 text-gray-700" />
        ) : (
          <Maximize2 className="h-4 w-4 text-gray-700" />
        )}
      </button>

      <MapContainer
        key={`map-${latitude}-${longitude}`}
        center={[latitude, longitude]}
        zoom={routePositions.length > 0 ? 13 : 15}
        style={{ height: "100%", width: "100%", zIndex: 0, minHeight: '256px' }}
        scrollWheelZoom={true}
      >
        <MapUpdater center={[latitude, longitude]} routePositions={routePositions} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        
        {/* เส้นทาง (Route/Polyline) */}
        {routePositions.length > 1 && (
          <Polyline
            positions={routePositions}
            color="#3b82f6"
            weight={4}
            opacity={0.7}
          />
        )}

        {/* จุดเริ่มต้น (ถ้ามี history) */}
        {routePositions.length > 0 && (
          <Marker position={routePositions[0]}>
            <Popup>
              <div className="text-sm">
                <p className="font-semibold">Start Point</p>
                <p className="text-muted-foreground text-xs">
                  {new Date(locationHistory[0].createdAt).toLocaleString('th-TH')}
                </p>
                <p className="text-muted-foreground text-xs mt-1">
                  {routePositions[0][0].toFixed(6)}, {routePositions[0][1].toFixed(6)}
                </p>
                <a
                  href={getGoogleMapsLink(routePositions[0][0], routePositions[0][1], "Start Point")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs underline"
                >
                  <Navigation className="h-3 w-3" />
                  เปิดใน Google Maps
                </a>
              </div>
            </Popup>
          </Marker>
        )}

        {/* จุดปัจจุบัน */}
        <Marker position={[latitude, longitude]}>
          <Popup>
            <div className="text-sm">
              <p className="font-semibold">{deviceName || deviceCode || "Device"}</p>
              <p className="text-muted-foreground">
                {latitude.toFixed(6)}, {longitude.toFixed(6)}
              </p>
              {locationHistory.length > 0 && (
                <p className="text-muted-foreground text-xs mt-1">
                  Route points: {locationHistory.length}
                </p>
              )}
              <a
                href={getGoogleMapsLink(latitude, longitude, deviceName || deviceCode || "Device")}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs underline"
              >
                <Navigation className="h-3 w-3" />
                เปิดใน Google Maps
              </a>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}

