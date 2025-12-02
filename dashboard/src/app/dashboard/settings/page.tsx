"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <h1 className="text-2xl font-bold">Settings</h1>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
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
      </main>
    </div>
  );
}

