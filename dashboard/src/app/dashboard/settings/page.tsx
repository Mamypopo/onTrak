"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Swal from "sweetalert2";
import { getSwalConfig } from "@/lib/swal-config";
import {
  Globe,
  Zap,
  Save,
  Settings,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Server,
  Wifi,
  Info,
  Copy,
  Check,
} from "lucide-react";

export default function SettingsPage() {
  const [apiUrl, setApiUrl] = useState("");
  const [wsUrl, setWsUrl] = useState("");
  const [apiStatus, setApiStatus] = useState<"idle" | "checking" | "ok" | "error">("idle");
  const [copiedField, setCopiedField] = useState<"api" | "ws" | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    const savedApi = localStorage.getItem("apiUrl") || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8014";
    const savedWs = localStorage.getItem("wsUrl") || process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8014";
    setApiUrl(savedApi);
    setWsUrl(savedWs);
  }, []);

  const handleApiChange = (val: string) => {
    setApiUrl(val);
    setIsDirty(true);
    setApiStatus("idle");
  };

  const handleWsChange = (val: string) => {
    setWsUrl(val);
    setIsDirty(true);
  };

  const handleSave = () => {
    localStorage.setItem("apiUrl", apiUrl);
    localStorage.setItem("wsUrl", wsUrl);
    setIsDirty(false);
    Swal.fire(getSwalConfig({
      icon: "success",
      title: "บันทึกการตั้งค่า",
      text: "บันทึกการตั้งค่าสำเร็จแล้ว",
      timer: 2000,
      showConfirmButton: false,
    }));
  };

  const handleTestConnection = async () => {
    setApiStatus("checking");
    try {
      const res = await fetch(`${apiUrl}/health`, { signal: AbortSignal.timeout(5000) });
      setApiStatus(res.ok ? "ok" : "error");
    } catch {
      setApiStatus("error");
    }
  };

  const handleReset = () => {
    const defaultApi = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8014";
    const defaultWs = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8014";
    setApiUrl(defaultApi);
    setWsUrl(defaultWs);
    setIsDirty(true);
    setApiStatus("idle");
  };

  const handleCopy = (field: "api" | "ws") => {
    navigator.clipboard.writeText(field === "api" ? apiUrl : wsUrl);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const statusConfig = {
    idle: null,
    checking: { icon: <Loader2 className="h-4 w-4 animate-spin" />, label: "กำลังตรวจสอบ...", variant: "secondary" as const },
    ok: { icon: <CheckCircle2 className="h-4 w-4" />, label: "เชื่อมต่อสำเร็จ", variant: "default" as const },
    error: { icon: <XCircle className="h-4 w-4" />, label: "เชื่อมต่อไม่ได้", variant: "destructive" as const },
  };

  const currentStatus = statusConfig[apiStatus];

  return (
    <AppLayout>
      <div className="flex-1 container mx-auto p-6 max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Settings className="h-5 w-5 text-primary" />
              </div>
              <h1 className="text-3xl font-bold">การตั้งค่า</h1>
            </div>
            <p className="text-muted-foreground ml-13 pl-[52px]">
              จัดการการเชื่อมต่อและการกำหนดค่าระบบ
            </p>
          </div>
          {isDirty && (
            <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/20 gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก
            </Badge>
          )}
        </div>

        <Tabs defaultValue="connection">
          <TabsList className="mb-6">
            <TabsTrigger value="connection" className="gap-2">
              <Server className="h-4 w-4" />
              การเชื่อมต่อ
            </TabsTrigger>
            <TabsTrigger value="about" className="gap-2">
              <Info className="h-4 w-4" />
              เกี่ยวกับระบบ
            </TabsTrigger>
          </TabsList>

          {/* Connection Tab */}
          <TabsContent value="connection" className="space-y-4 mt-0">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Endpoint การเชื่อมต่อ</CardTitle>
                    <CardDescription className="mt-1">
                      กำหนด URL ของ Backend API และ WebSocket
                    </CardDescription>
                  </div>
                  {currentStatus && (
                    <Badge
                      variant={currentStatus.variant}
                      className="gap-1.5 font-normal"
                    >
                      {currentStatus.icon}
                      {currentStatus.label}
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-5">
                {/* API URL */}
                <div className="space-y-2">
                  <Label htmlFor="apiUrl" className="flex items-center gap-2 text-sm font-medium">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    REST API URL
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="apiUrl"
                      value={apiUrl}
                      onChange={(e) => handleApiChange(e.target.value)}
                      placeholder="http://localhost:8014"
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleCopy("api")}
                      title="คัดลอก"
                      className="shrink-0"
                    >
                      {copiedField === "api" ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ใช้สำหรับเรียก REST API ของ backend
                  </p>
                </div>

                {/* WebSocket URL */}
                <div className="space-y-2">
                  <Label htmlFor="wsUrl" className="flex items-center gap-2 text-sm font-medium">
                    <Zap className="h-4 w-4 text-muted-foreground" />
                    WebSocket URL
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="wsUrl"
                      value={wsUrl}
                      onChange={(e) => handleWsChange(e.target.value)}
                      placeholder="ws://localhost:8014"
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleCopy("ws")}
                      title="คัดลอก"
                      className="shrink-0"
                    >
                      {copiedField === "ws" ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ใช้สำหรับรับข้อมูล realtime จาก backend
                  </p>
                </div>

                {/* Info box */}
                <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30 p-4 flex gap-3">
                  <Wifi className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                    การเปลี่ยน URL จะมีผลหลังจาก refresh หน้าเว็บ
                    ค่าที่บันทึกจะถูกเก็บไว้ใน localStorage ของเบราว์เซอร์
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={apiStatus === "checking"}
                  className="gap-2"
                >
                  {apiStatus === "checking" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  ทดสอบการเชื่อมต่อ
                </Button>
                <Button variant="ghost" onClick={handleReset} className="gap-2 text-muted-foreground">
                  รีเซ็ตค่าเริ่มต้น
                </Button>
              </div>
              <Button onClick={handleSave} className="gap-2" disabled={!isDirty}>
                <Save className="h-4 w-4" />
                บันทึกการตั้งค่า
              </Button>
            </div>
          </TabsContent>

          {/* About Tab */}
          <TabsContent value="about" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">เกี่ยวกับระบบ OnTrak MDM</CardTitle>
                <CardDescription>ข้อมูลเวอร์ชันและระบบ</CardDescription>
              </CardHeader>
              <CardContent className="space-y-0">
                {[
                  { label: "ระบบ", value: "OnTrak MDM Dashboard" },
                  { label: "เวอร์ชัน", value: "0.1.0" },
                  { label: "Framework", value: "Next.js 14" },
                  { label: "API Endpoint", value: apiUrl, mono: true },
                  { label: "WebSocket", value: wsUrl, mono: true },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-3 border-b last:border-0"
                  >
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                    <span className={`text-sm font-medium ${item.mono ? "font-mono text-xs bg-muted px-2 py-0.5 rounded" : ""}`}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
