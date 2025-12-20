"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Swal from "sweetalert2";
import { getSwalConfig } from "@/lib/swal-config";
import { Globe, Zap, Save } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const [apiUrl, setApiUrl] = useState(
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:3007"
  );
  const [wsUrl, setWsUrl] = useState(
    process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3007"
  );

  useEffect(() => {
    setApiUrl(localStorage.getItem("apiUrl") || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3007");
    setWsUrl(localStorage.getItem("wsUrl") || process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3007");
  }, []);

  const handleSave = () => {
    // Save to localStorage (for demo, in production use proper config)
    localStorage.setItem("apiUrl", apiUrl);
    localStorage.setItem("wsUrl", wsUrl);
    
    Swal.fire(getSwalConfig({
      icon: "success",
      title: "บันทึกการตั้งค่า",
      text: "บันทึกการตั้งค่าสำเร็จแล้ว",
      timer: 2000,
      showConfirmButton: false,
    }));
  };

  return (
    <AppLayout>
      <div className="flex-1 container mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
            การตั้งค่า
          </h1>
          <p className="text-muted-foreground mt-1">ตั้งค่าการเชื่อมต่อ API และ WebSocket</p>
        </div>

        {/* Settings Card */}
        <Card className="max-w-4xl">
          <CardHeader>
            <CardTitle>การเชื่อมต่อเซิร์ฟเวอร์</CardTitle>
            <CardDescription>
              กำหนดค่า Endpoint สำหรับ API และ WebSocket
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apiUrl" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                API URL
              </Label>
              <Input
                id="apiUrl"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="http://localhost:3007"
                className="font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="wsUrl" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                WebSocket URL
              </Label>
              <Input
                id="wsUrl"
                value={wsUrl}
                onChange={(e) => setWsUrl(e.target.value)}
                placeholder="ws://localhost:3007"
                className="font-mono"
              />
            </div>
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Button onClick={handleSave} className="ml-auto gap-2">
              <Save className="h-4 w-4" />
              บันทึกการตั้งค่า
            </Button>
          </CardFooter>
        </Card>
      </div>
    </AppLayout>
  );
}
