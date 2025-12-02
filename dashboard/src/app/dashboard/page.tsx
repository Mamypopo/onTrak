"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useWebSocket, WebSocketMessage } from "@/lib/websocket";
import api from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Battery, Wifi, MapPin, Activity, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

interface Device {
  id: string;
  deviceCode: string;
  name: string | null;
  battery: number;
  wifiStatus: boolean;
  latitude: number | null;
  longitude: number | null;
  status: "ONLINE" | "OFFLINE" | "IN_USE" | "AVAILABLE";
  lastSeen: string;
  kioskMode: boolean;
}

export default function DashboardPage() {
  const router = useRouter();
  const [devices, setDevices] = useState<Device[]>([]);
  const [filteredDevices, setFilteredDevices] = useState<Device[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // WebSocket for realtime updates
  const { isConnected } = useWebSocket((message: WebSocketMessage) => {
    if (message.type === "device_status" || message.type === "device_location") {
      setDevices((prev) =>
        prev.map((device) =>
          device.deviceCode === message.deviceCode
            ? { ...device, ...message.data }
            : device
        )
      );
    }
  });

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    // Fetch devices
    fetchDevices();
  }, [router]);

  useEffect(() => {
    // Filter devices based on search
    if (searchQuery) {
      const filtered = devices.filter(
        (device) =>
          device.deviceCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
          device.name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredDevices(filtered);
    } else {
      setFilteredDevices(devices);
    }
  }, [searchQuery, devices]);

  const fetchDevices = async () => {
    try {
      const response = await api.get("/api/device");
      if (response.data.success) {
        setDevices(response.data.data);
        setFilteredDevices(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching devices:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ONLINE":
        return "bg-green-500";
      case "OFFLINE":
        return "bg-muted";
      case "IN_USE":
        return "bg-yellow-500";
      case "AVAILABLE":
        return "bg-blue-500";
      default:
        return "bg-muted";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">OnTrak MDM Dashboard</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full transition-colors ${
                  isConnected ? "bg-green-500" : "bg-destructive"
                }`}
              />
              <span className="text-sm text-muted-foreground">
                {isConnected ? "Connected" : "Disconnected"}
              </span>
            </div>
            <Link href="/dashboard/users">
              <Button variant="ghost">Users</Button>
            </Link>
            <Link href="/dashboard/settings">
              <Button variant="ghost">Settings</Button>
            </Link>
            <ThemeToggle />
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search devices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <Card className="card-hover rounded-lg border-border/50">
            <CardHeader className="pb-2">
              <CardDescription>Total Devices</CardDescription>
              <CardTitle className="text-3xl">{devices.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="card-hover rounded-lg border-border/50">
            <CardHeader className="pb-2">
              <CardDescription>Online</CardDescription>
              <CardTitle className="text-3xl text-green-600 dark:text-green-400">
                {devices.filter((d) => d.status === "ONLINE").length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="card-hover rounded-lg border-border/50">
            <CardHeader className="pb-2">
              <CardDescription>Available</CardDescription>
              <CardTitle className="text-3xl text-blue-600 dark:text-blue-400">
                {devices.filter((d) => d.status === "AVAILABLE").length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="card-hover rounded-lg border-border/50">
            <CardHeader className="pb-2">
              <CardDescription>In Use</CardDescription>
              <CardTitle className="text-3xl text-yellow-600 dark:text-yellow-400">
                {devices.filter((d) => d.status === "IN_USE").length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="card-hover rounded-lg border-border/50">
            <CardHeader className="pb-2">
              <CardDescription>Offline</CardDescription>
              <CardTitle className="text-3xl text-muted-foreground">
                {devices.filter((d) => d.status === "OFFLINE").length}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Device List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDevices.map((device) => (
            <Link key={device.id} href={`/dashboard/device/${device.id}`}>
              <Card className="card-hover rounded-lg border-border/50 cursor-pointer">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold">
                      {device.name || device.deviceCode}
                    </CardTitle>
                    <Badge variant={getStatusVariant(device.status)} className="text-xs">
                      {device.status}
                    </Badge>
                  </div>
                  <CardDescription className="text-muted-foreground">{device.deviceCode}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Battery className="w-4 h-4 text-muted-foreground" />
                    <span>{device.battery}%</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Wifi
                      className={`w-4 h-4 transition-colors ${
                        device.wifiStatus ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                      }`}
                    />
                    <span>{device.wifiStatus ? "Connected" : "Disconnected"}</span>
                  </div>
                  {device.latitude && device.longitude && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {device.latitude.toFixed(4)}, {device.longitude.toFixed(4)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Activity className="w-4 h-4" />
                    <span>
                      Last seen:{" "}
                      {formatDistanceToNow(new Date(device.lastSeen), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  {device.kioskMode && (
                    <Badge variant="outline" className="text-xs border-primary/30">
                      Kiosk Mode
                    </Badge>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {filteredDevices.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            {searchQuery ? "No devices found" : "No devices available"}
          </div>
        )}
      </main>
    </div>
  );
}

