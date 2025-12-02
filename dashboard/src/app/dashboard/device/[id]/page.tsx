"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter, useParams } from "next/navigation";
import { useWebSocket, WebSocketMessage } from "@/lib/websocket";
import api from "@/lib/api";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Battery, Wifi, MapPin, Activity, ArrowLeft, 
  Lock, Power, Radio, Settings,
  Square, Bell, Camera, Zap, Signal
} from "lucide-react";
import Link from "next/link";
import Swal from "sweetalert2";
import { cn } from "@/lib/utils";

// Dynamic import for Map component to avoid SSR issues
const DeviceMap = dynamic(() => import("@/components/DeviceMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 bg-muted rounded-lg flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  ),
});

interface Device {
  id: string;
  deviceCode: string;
  name: string | null;
  battery: number;
  wifiStatus: boolean;
  isCharging?: boolean;
  batteryHealth?: string | null;
  chargingMethod?: string | null;
  mobileDataEnabled?: boolean;
  networkConnected?: boolean;
  screenOn?: boolean;
  volumeLevel?: number;
  bluetoothEnabled?: boolean;
  installedAppsCount?: number;
  bootTime?: string | null;
  latitude: number | null;
  longitude: number | null;
  status: string;
  lastSeen: string;
  kioskMode: boolean;
  metrics: any[];
  actionLogs: any[];
}

export default function DeviceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const deviceId = params.id as string;
  
  const [device, setDevice] = useState<Device | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingCommand, setSendingCommand] = useState(false);
  const [locationHistory, setLocationHistory] = useState<any[]>([]);

  // WebSocket for realtime updates
  const { isConnected } = useWebSocket((message: WebSocketMessage) => {
    if (
      message.deviceId === deviceId &&
      (message.type === "device_status" ||
        message.type === "device_location" ||
        message.type === "device_metrics")
    ) {
      setDevice((prev) => (prev ? { ...prev, ...message.data } : null));
    }
  });

  const fetchDevice = useCallback(async () => {
    try {
      const response = await api.get(`/api/device/${deviceId}`);
      if (response.data.success) {
        setDevice(response.data.data);
      } else {
        console.error("Failed to fetch device:", response.data);
        setDevice(null);
      }
    } catch (error: any) {
      console.error("Error fetching device:", error);
      if (error.response?.status === 404) {
        setDevice(null);
      } else {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: error.response?.data?.error || "Failed to load device",
        });
      }
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  const fetchLocationHistory = useCallback(async () => {
    try {
      // ดึง location history 7 วันล่าสุด
      const response = await api.get(`/api/device/${deviceId}/location-history?days=7`);
      if (response.data.success) {
        const history = response.data.data || [];
        setLocationHistory(history);
        console.log("Location history loaded:", history.length, "points");
      }
    } catch (error: any) {
      console.error("Error fetching location history:", error);
      // ไม่แสดง error ถ้าไม่มีข้อมูล (อาจจะยังไม่มี history)
      setLocationHistory([]);
    }
  }, [deviceId]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    fetchDevice();
    fetchLocationHistory();
  }, [deviceId, router, fetchDevice, fetchLocationHistory]);

  const sendCommand = async (action: string, params?: any) => {
    setSendingCommand(true);
    try {
      const response = await api.post(`/api/device/${deviceId}/command`, {
        action,
        params: params || {},
      });

      if (response.data.success) {
        // Custom messages for better UX
        const messages: Record<string, { title: string; text: string }> = {
          PLAY_SOUND: {
            title: "Alert Sent",
            text: "Alert sound and vibration sent to device",
          },
          LOCK_DEVICE: {
            title: "Device Locked",
            text: "Lock command sent successfully",
          },
          RESTART_DEVICE: {
            title: "Restart Command Sent",
            text: "Device will restart shortly",
          },
          WIFI_ON: {
            title: "WiFi Enabled",
            text: "WiFi will be turned on",
          },
          WIFI_OFF: {
            title: "WiFi Disabled",
            text: "WiFi will be turned off",
          },
          ENABLE_KIOSK: {
            title: "Kiosk Mode Enabled",
            text: "Device will enter kiosk mode",
          },
          DISABLE_KIOSK: {
            title: "Kiosk Mode Disabled",
            text: "Device will exit kiosk mode",
          },
          OPEN_CAMERA: {
            title: "Camera Command Sent",
            text: "Camera app will open on device",
          },
          TAKE_PHOTO: {
            title: "Photo Capture Sent",
            text: "Camera will open for photo capture on device",
          },
        };

        const message = messages[action] || {
          title: "Command Sent",
          text: `Command "${action}" sent successfully`,
        };

        Swal.fire({
          icon: "success",
          title: message.title,
          text: message.text,
          timer: 2000,
          showConfirmButton: false,
        });
      }
    } catch (error: any) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.response?.data?.error || "Failed to send command",
      });
    } finally {
      setSendingCommand(false);
    }
  };

  const handleBorrow = async () => {
    const { value: reason } = await Swal.fire({
      title: "Borrow Device",
      input: "text",
      inputLabel: "Reason (optional)",
      inputPlaceholder: "Enter reason for borrowing...",
      showCancelButton: true,
      confirmButtonText: "Borrow",
    });

    if (reason !== undefined) {
      try {
        const response = await api.post(`/api/device/${deviceId}/borrow`, {
          reason: reason || null,
        });

        if (response.data.success) {
          Swal.fire({
            icon: "success",
            title: "Device Borrowed",
            timer: 2000,
            showConfirmButton: false,
          });
          fetchDevice();
        }
      } catch (error: any) {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: error.response?.data?.error || "Failed to borrow device",
        });
      }
    }
  };

  const handleReturn = async () => {
    try {
      const response = await api.post(`/api/device/${deviceId}/return`);

      if (response.data.success) {
        Swal.fire({
          icon: "success",
          title: "Device Returned",
          timer: 2000,
          showConfirmButton: false,
        });
        fetchDevice();
      }
    } catch (error: any) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.response?.data?.error || "Failed to return device",
      });
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex-1 container mx-auto p-6 space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-md" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <Skeleton key={i} className="h-6 w-full" />
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-64 w-full" />
                </CardContent>
              </Card>
            </div>
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-10 w-full mb-2" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!device) {
    return (
      <AppLayout>
        <div className="flex-1 container mx-auto p-6">
          <Card>
            <CardContent className="p-12 text-center">
              <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-2xl font-bold mb-4">ไม่พบอุปกรณ์</h2>
              <p className="text-muted-foreground mb-4">
                อุปกรณ์ที่คุณกำลังมองหาไม่มีอยู่ในระบบ
              </p>
              <Link href="/dashboard">
                <Button>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  กลับไป Dashboard
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const getStatusVariant = (status: string): "success" | "muted" | "warning" | "info" => {
    switch (status) {
      case "ONLINE":
        return "success";
      case "OFFLINE":
        return "muted";
      case "IN_USE":
        return "warning";
      case "AVAILABLE":
        return "info";
      default:
        return "muted";
    }
  };

  return (
    <AppLayout>
      <div className="flex-1 container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">
                {device.name || device.deviceCode}
              </h1>
              <Badge variant={getStatusVariant(device.status)}>
                {device.status}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">{device.deviceCode}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Device Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Card */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle>Device Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Battery className="w-5 h-5" />
                    <span>Battery: {device.battery}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {device.isCharging ? (
                      <>
                        <Zap className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                        <span className="text-yellow-600 dark:text-yellow-400">
                          Charging ({device.chargingMethod || "Unknown"})
                        </span>
                      </>
                    ) : (
                      <>
                        <Battery className="w-5 h-5 text-muted-foreground" />
                        <span className="text-muted-foreground">Not Charging</span>
                      </>
                    )}
                  </div>
                  {device.batteryHealth && (
                    <div className="flex items-center gap-2">
                      <Activity className="w-5 h-5" />
                      <span>Health: {device.batteryHealth}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Wifi
                      className={`w-5 h-5 transition-colors ${
                        device.wifiStatus ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                      }`}
                    />
                    <span>WiFi: {device.wifiStatus ? "On" : "Off"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Signal
                      className={`w-5 h-5 transition-colors ${
                        device.networkConnected ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                      }`}
                    />
                    <span>Network: {device.networkConnected ? "Connected" : "Disconnected"}</span>
                  </div>
                  {device.mobileDataEnabled && (
                    <div className="flex items-center gap-2">
                      <Radio className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <span className="text-blue-600 dark:text-blue-400">Mobile Data: On</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    {device.screenOn ? (
                      <>
                        <Activity className="w-5 h-5 text-green-600 dark:text-green-400" />
                        <span className="text-green-600 dark:text-green-400">Screen: On</span>
                      </>
                    ) : (
                      <>
                        <Activity className="w-5 h-5 text-muted-foreground" />
                        <span className="text-muted-foreground">Screen: Off</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-muted-foreground" />
                    <span>Volume: {device.volumeLevel || 0}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {device.bluetoothEnabled ? (
                      <>
                        <Radio className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <span className="text-blue-600 dark:text-blue-400">Bluetooth: On</span>
                      </>
                    ) : (
                      <>
                        <Radio className="w-5 h-5 text-muted-foreground" />
                        <span className="text-muted-foreground">Bluetooth: Off</span>
                      </>
                    )}
                  </div>
                  {device.installedAppsCount && (
                    <div className="flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      <span>Apps: {device.installedAppsCount}</span>
                    </div>
                  )}
                  {device.bootTime && (
                    <div className="flex items-center gap-2">
                      <Activity className="w-5 h-5" />
                      <span>
                        Boot: {new Date(Number(device.bootTime)).toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-muted-foreground" />
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant={getStatusVariant(device.status)} className="ml-1">
                      {device.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-muted-foreground" />
                    <span className="text-muted-foreground">Kiosk Mode:</span>
                    {device.kioskMode ? (
                      <Badge variant="outline" className="ml-1 border-primary/30">On</Badge>
                    ) : (
                      <Badge variant="muted" className="ml-1">Off</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Location Card */}
            {device.latitude && device.longitude ? (
              <Card className="card-hover">
                <CardHeader>
                  <CardTitle>Location</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-4">
                    <MapPin className="w-5 h-5 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {device.latitude.toFixed(6)}, {device.longitude.toFixed(6)}
                    </span>
                  </div>
                  <DeviceMap
                    latitude={device.latitude}
                    longitude={device.longitude}
                    deviceName={device.name || undefined}
                    deviceCode={device.deviceCode}
                    deviceId={device.id}
                    locationHistory={locationHistory}
                  />
                </CardContent>
              </Card>
            ) : (
              <Card className="card-hover">
                <CardHeader>
                  <CardTitle>Location</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="w-full h-64 bg-muted rounded-lg flex flex-col items-center justify-center">
                    <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">ไม่มีข้อมูล GPS</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Control Panel */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle>Control Panel</CardTitle>
                <CardDescription>
                  Send commands to control the device remotely
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Alert Section */}
                  <div>
                    <h4 className="text-sm font-medium mb-2 text-muted-foreground">Alerts & Notifications</h4>
                    <div className="grid grid-cols-1 gap-2">
                      <Button
                        onClick={() => sendCommand("PLAY_SOUND")}
                        disabled={sendingCommand}
                        variant="default"
                        className="w-full"
                      >
                        <Bell className="w-4 h-4 mr-2" />
                        Send Alert Sound
                      </Button>
                    </div>
                  </div>

                  {/* Device Control Section */}
                  <div>
                    <h4 className="text-sm font-medium mb-2 text-muted-foreground">Device Control</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        onClick={() => sendCommand("LOCK_DEVICE")}
                        disabled={sendingCommand}
                        variant="outline"
                      >
                        <Lock className="w-4 h-4 mr-2" />
                        Lock
                      </Button>
                      <Button
                        onClick={() => sendCommand("RESTART_DEVICE")}
                        disabled={sendingCommand}
                        variant="outline"
                      >
                        <Power className="w-4 h-4 mr-2" />
                        Restart
                      </Button>
                    </div>
                  </div>

                  {/* Network Control Section */}
                  <div>
                    <h4 className="text-sm font-medium mb-2 text-muted-foreground">Network</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        onClick={() => sendCommand("WIFI_ON")}
                        disabled={sendingCommand}
                        variant="outline"
                      >
                        <Radio className="w-4 h-4 mr-2" />
                        WiFi On
                      </Button>
                      <Button
                        onClick={() => sendCommand("WIFI_OFF")}
                        disabled={sendingCommand}
                        variant="outline"
                      >
                        <Radio className="w-4 h-4 mr-2" />
                        WiFi Off
                      </Button>
                    </div>
                  </div>

                  {/* Kiosk Mode Section */}
                  <div>
                    <h4 className="text-sm font-medium mb-2 text-muted-foreground">Kiosk Mode</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        onClick={() => sendCommand("ENABLE_KIOSK")}
                        disabled={sendingCommand}
                        variant="outline"
                      >
                        <Square className="w-4 h-4 mr-2" />
                        Enable Kiosk
                      </Button>
                  <Button
                    onClick={() => sendCommand("DISABLE_KIOSK")}
                    disabled={sendingCommand}
                    variant="outline"
                  >
                    <Square className="w-4 h-4 mr-2" />
                    Disable Kiosk
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

            {/* Camera Control */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle>Camera</CardTitle>
                <CardDescription>
                  Control camera on device
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  onClick={() => sendCommand("OPEN_CAMERA")}
                  disabled={sendingCommand}
                  variant="outline"
                  className="w-full"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Open Camera
                </Button>
                <Button
                  onClick={() => sendCommand("TAKE_PHOTO")}
                  disabled={sendingCommand}
                  variant="default"
                  className="w-full"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Take Photo
                </Button>
              </CardContent>
            </Card>

            {/* History */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle>Action History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {device.actionLogs && device.actionLogs.length > 0 ? (
                    device.actionLogs.map((log: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 border rounded-lg transition-all duration-200 hover:border-primary/30 hover:bg-accent/50"
                      >
                        <div>
                          <p className="font-medium text-sm">{log.action}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(log.createdAt).toLocaleString()}
                          </p>
                        </div>
                        {log.user && (
                          <Badge variant="outline" className="text-xs">
                            {log.user}
                          </Badge>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Activity className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        ยังไม่มีประวัติการทำงาน
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Actions */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={handleBorrow}
                  className="w-full"
                  variant="outline"
                >
                  Borrow Device
                </Button>
                <Button
                  onClick={handleReturn}
                  className="w-full"
                  variant="outline"
                >
                  Return Device
                </Button>
              </CardContent>
            </Card>

            {/* Metrics */}
            {device.metrics && device.metrics.length > 0 && (
              <Card className="card-hover">
                <CardHeader>
                  <CardTitle>Latest Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-muted-foreground">CPU</p>
                      <p className="text-lg font-bold">
                        {device.metrics[0]?.cpu?.toFixed(1) || 0}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Memory</p>
                      <p className="text-lg font-bold">
                        {device.metrics[0]?.memoryUsed
                          ? (
                              (Number(device.metrics[0].memoryUsed) /
                                Number(device.metrics[0].memoryTotal)) *
                              100
                            ).toFixed(1)
                          : 0}
                        %
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Storage</p>
                      <p className="text-lg font-bold">
                        {device.metrics[0]?.storageUsed
                          ? (
                              (Number(device.metrics[0].storageUsed) /
                                Number(device.metrics[0].storageTotal)) *
                              100
                            ).toFixed(1)
                          : 0}
                        %
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

