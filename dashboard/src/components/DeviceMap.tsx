"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "tippy.js/dist/tippy.css";
import { calculateSimplifiedRoute } from "@/lib/routing";
import { Maximize2, Minimize2, Copy, Share2, MapPin, ExternalLink, Route } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tippy";
import Swal from "sweetalert2";
import { getToastConfig } from "@/lib/swal-config";

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
  const mapInstanceRef = useRef<L.Map | null>(null);
  
  // Generate unique key that changes when deviceId changes to force remount
  // This prevents "Map container is being reused" errors
  const mapKey = useMemo(() => {
    return `map-${deviceId || 'default'}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, [deviceId]);

  /**
   * Cleanup function to properly remove Leaflet map instance
   */
  const cleanupMap = useCallback((map: L.Map | null, container: HTMLDivElement | null) => {
    if (!map) return;
    
    try {
      const mapContainer = map.getContainer();
      
      // Remove all event listeners
      map.off();
      
      // Remove all layers
      map.eachLayer((layer) => {
        map.removeLayer(layer);
      });
      
      // Remove map instance
      map.remove();
      
      // Clean up container
      if (mapContainer) {
        // Remove Leaflet ID to allow re-initialization
        delete (mapContainer as any)._leaflet_id;
        // Clear container content
        mapContainer.innerHTML = '';
      }
    } catch (error) {
      // Ignore cleanup errors - map might already be removed
      console.debug('Map cleanup error (ignored):', error);
    }
    
    // Also clean up container ref if it exists
    if (container) {
      // Remove any Leaflet ID from container
      if ((container as any)._leaflet_id) {
        delete (container as any)._leaflet_id;
      }
    }
  }, []);

  // Ensure component is mounted on client side
  useEffect(() => {
    setIsMounted(true);
    
    // Store ref values for cleanup
    const mapInstance = mapInstanceRef.current;
    const containerRef = mapContainerRef.current;
    
    // Cleanup on unmount
    return () => {
      cleanupMap(mapInstance, containerRef);
      mapInstanceRef.current = null;
    };
  }, [cleanupMap]);

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

  // Helper function to generate Google Maps navigation link
  const getGoogleMapsNavigationLink = (lat: number, lng: number, label?: string) => {
    const labelParam = label ? `&destination=${encodeURIComponent(label)}` : '';
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}${labelParam}`;
  };

  // Helper function to generate Google Street View link
  const getGoogleStreetViewLink = (lat: number, lng: number) => {
    return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`;
  };

  // Copy coordinates to clipboard
  const copyCoordinates = async (lat: number, lng: number) => {
    try {
      await navigator.clipboard.writeText(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      Swal.fire(getToastConfig({
        icon: "success",
        title: "คัดลอกพิกัดแล้ว",
      }));
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // Share location
  const shareLocation = async (lat: number, lng: number, label?: string) => {
    const url = getGoogleMapsLink(lat, lng, label);
    const text = label ? `ตำแหน่ง: ${label}` : 'ตำแหน่ง';
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: text,
          text: `พิกัด: ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
          url: url,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      await copyCoordinates(lat, lng);
    }
  };


  /**
   * Component to handle map updates and store map instance reference
   */
  function MapUpdater({ 
    center, 
    routePositions: positions 
  }: { 
    center: [number, number]; 
    routePositions: Array<[number, number]> 
  }) {
    const map = useMap();
    
    // Store map instance reference when map is ready
    useEffect(() => {
      if (map) {
        mapInstanceRef.current = map;
      }
    }, [map]);
    
    // Update map view when location changes
    useEffect(() => {
      if (!map) return;
      
      try {
        map.setView(center, 15);
      } catch (error) {
        console.error("Error setting map view:", error);
      }
    }, [center, map]);
    
    // Auto-fit map bounds to show entire route if history exists
    useEffect(() => {
      if (!map || positions.length === 0) return;
      
      try {
        const bounds = L.latLngBounds(positions);
        map.fitBounds(bounds, { padding: [20, 20] });
      } catch (error) {
        console.error("Error fitting bounds:", error);
      }
    }, [positions, map]);
    
    // Invalidate size on mount and when window resizes (for fullscreen)
    useEffect(() => {
      if (!map) return;
      
      const invalidateSize = () => {
        setTimeout(() => {
          try {
            // Check if map is still valid
            if (map && mapInstanceRef.current === map) {
              map.invalidateSize();
            }
          } catch (error) {
            // Silently ignore errors - map might be unmounted
            console.debug("Map size invalidation skipped:", error);
          }
        }, 100);
      };
      
      invalidateSize();
      
      // Listen for resize events (including fullscreen changes)
      window.addEventListener('resize', invalidateSize);
      
      return () => {
        window.removeEventListener('resize', invalidateSize);
      };
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
      className="w-full h-72 rounded-lg overflow-hidden relative" 
      style={{ minHeight: '256px' }}
      key={`wrapper-${mapKey}`}
    >
      {/* Fullscreen Toggle Button */}
      <Tooltip content={isFullscreen ? "ย่อ" : "ขยาย"}>
        <button
          onClick={toggleFullscreen}
          className="absolute top-2 right-2 z-10 bg-white hover:bg-gray-100 rounded-md p-2 shadow-md transition-colors"
          aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        >
          {isFullscreen ? (
            <Minimize2 className="h-4 w-4 text-gray-700" />
          ) : (
            <Maximize2 className="h-4 w-4 text-gray-700" />
          )}
        </button>
      </Tooltip>

      <MapContainer
        key={mapKey}
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
            <Popup className="custom-popup">
              <div className="text-sm space-y-2 min-w-[200px]">
                <div>
                  <p className="font-semibold text-base">จุดเริ่มต้น</p>
                  <p className="text-muted-foreground text-xs mt-1">
                    {new Date(locationHistory[0].createdAt).toLocaleString('th-TH')}
                  </p>
                </div>
                
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span className="font-mono">{routePositions[0][0].toFixed(6)}, {routePositions[0][1].toFixed(6)}</span>
                  <Tooltip content="คัดลอกพิกัด">
                    <button
                      onClick={() => copyCoordinates(routePositions[0][0], routePositions[0][1])}
                      className="ml-auto p-1 hover:bg-gray-100 rounded"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </Tooltip>
                </div>

                <div className="pt-2 border-t">
                  <div className="flex gap-1">
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs bg-white text-slate-900 border-slate-200 hover:bg-slate-100 dark:bg-white dark:text-slate-900 dark:border-slate-200 dark:hover:bg-slate-100 shadow-sm"
                    >
                      <a
                        href={getGoogleMapsLink(routePositions[0][0], routePositions[0][1], "Start Point")}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span>ดูใน Maps</span>
                      </a>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs bg-white text-slate-900 border-slate-200 hover:bg-slate-100 dark:bg-white dark:text-slate-900 dark:border-slate-200 dark:hover:bg-slate-100 shadow-sm"
                      onClick={() => shareLocation(routePositions[0][0], routePositions[0][1], "Start Point")}
                    >
                      <Share2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* จุดปัจจุบัน */}
        <Marker position={[latitude, longitude]}>
          <Popup className="custom-popup">
            <div className="text-sm space-y-2 min-w-[200px]">
              <div>
                <p className="font-semibold text-base">{deviceName || deviceCode || "Device"}</p>
                {locationHistory.length > 0 && (
                  <p className="text-muted-foreground text-xs mt-1">
                    <Route className="h-3 w-3 inline mr-1" />
                    {locationHistory.length} จุดในเส้นทาง
                  </p>
                )}
              </div>
              
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span className="font-mono">{latitude.toFixed(6)}, {longitude.toFixed(6)}</span>
                <Tooltip content="คัดลอกพิกัด">
                  <button
                    onClick={() => copyCoordinates(latitude, longitude)}
                    className="ml-auto p-1 hover:bg-gray-100 rounded"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </Tooltip>
              </div>

              <div className="pt-2 border-t">
                <div className="flex gap-1 mb-1.5">
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs bg-white text-slate-900 border-slate-200 hover:bg-slate-100 dark:bg-white dark:text-slate-900 dark:border-slate-200 dark:hover:bg-slate-100 shadow-sm"
                  >
                    <a
                      href={getGoogleMapsLink(latitude, longitude, deviceName || deviceCode || "Device")}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      <span>ดูใน Maps</span>
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs bg-white text-slate-900 border-slate-200 hover:bg-slate-100 dark:bg-white dark:text-slate-900 dark:border-slate-200 dark:hover:bg-slate-100 shadow-sm"
                    onClick={() => shareLocation(latitude, longitude, deviceName || deviceCode || "Device")}
                  >
                    <Share2 className="h-3 w-3" />
                  </Button>
                </div>
                
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="w-full text-xs bg-white text-slate-900 border-slate-200 hover:bg-slate-100 dark:bg-white dark:text-slate-900 dark:border-slate-200 dark:hover:bg-slate-100 shadow-sm"
                >
                  <a
                    href={getGoogleStreetViewLink(latitude, longitude)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1"
                  >
                    <MapPin className="h-3 w-3" />
                    <span>Street View</span>
                  </a>
                </Button>
              </div>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}

