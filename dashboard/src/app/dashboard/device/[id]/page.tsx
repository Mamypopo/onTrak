"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter, useParams } from "next/navigation";
import { useWebSocket, WebSocketMessage } from "@/lib/websocket";
import api from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Battery, Wifi, MapPin, Activity, ArrowLeft, 
  Lock, Power, Radio, MessageSquare, Settings,
  Play, Square, Bell
} from "lucide-react";
import Link from "next/link";
import Swal from "sweetalert2";

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

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    fetchDevice();
  }, [deviceId, router, fetchDevice]);

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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!device) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Device not found</h2>
          <Link href="/dashboard">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">
                {device.name || device.deviceCode}
              </h1>
              <p className="text-sm text-muted-foreground">{device.deviceCode}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Device Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Card */}
            <Card>
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
                    <Wifi
                      className={`w-5 h-5 ${
                        device.wifiStatus ? "text-green-500" : "text-gray-500"
                      }`}
                    />
                    <span>WiFi: {device.wifiStatus ? "On" : "Off"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    <span>Status: {device.status}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    <span>Kiosk: {device.kioskMode ? "On" : "Off"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Location Card */}
            {device.latitude && device.longitude ? (
              <Card>
                <CardHeader>
                  <CardTitle>Location</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-4">
                    <MapPin className="w-5 h-5" />
                    <span>
                      {device.latitude.toFixed(6)}, {device.longitude.toFixed(6)}
                    </span>
                  </div>
                  <DeviceMap
                    latitude={device.latitude}
                    longitude={device.longitude}
                    deviceName={device.name || undefined}
                    deviceCode={device.deviceCode}
                  />
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Location</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="w-full h-64 bg-muted rounded-lg flex items-center justify-center">
                    <p className="text-muted-foreground">No GPS location available</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Control Panel */}
            <Card>
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

            {/* History */}
            <Card>
              <CardHeader>
                <CardTitle>Action History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {device.actionLogs && device.actionLogs.length > 0 ? (
                    device.actionLogs.map((log: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 border rounded"
                      >
                        <div>
                          <p className="font-medium">{log.action}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(log.createdAt).toLocaleString()}
                          </p>
                        </div>
                        {log.user && (
                          <span className="text-sm text-muted-foreground">
                            {log.user}
                          </span>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center py-4">
                      No action history
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Actions */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
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
              <Card>
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
      </main>
    </div>
  );
}

