"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Swal from "sweetalert2";

export default function SettingsPage() {
  const router = useRouter();
  const [apiUrl, setApiUrl] = useState(
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:3007"
  );
  const [wsUrl, setWsUrl] = useState(
    process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3007"
  );

  const handleSave = () => {
    // Save to localStorage (for demo, in production use proper config)
    localStorage.setItem("apiUrl", apiUrl);
    localStorage.setItem("wsUrl", wsUrl);
    
    Swal.fire({
      icon: "success",
      title: "Settings Saved",
      text: "Settings have been saved successfully",
      timer: 2000,
      showConfirmButton: false,
    });
  };

  return (
    <AppLayout>
      <div className="flex-1 container mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1">ตั้งค่าการเชื่อมต่อ API และ WebSocket</p>
        </div>

        {/* Settings Card */}
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>
              Configure API and WebSocket endpoints
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="apiUrl" className="text-sm font-medium">
                API URL
              </label>
              <Input
                id="apiUrl"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="http://localhost:3007"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="wsUrl" className="text-sm font-medium">
                WebSocket URL
              </label>
              <Input
                id="wsUrl"
                value={wsUrl}
                onChange={(e) => setWsUrl(e.target.value)}
                placeholder="ws://localhost:3007"
              />
            </div>

            <Button onClick={handleSave} className="w-full">
              Save Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

