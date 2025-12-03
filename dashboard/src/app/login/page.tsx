"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import api from "@/lib/api";
import Swal from "sweetalert2";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);

    try {
      const response = await api.post("/api/auth/login", data);
      
      if (response.data.success && response.data.token) {
        // แสดง success toast (ใช้ light mode สำหรับ login page)
        Swal.fire({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 2000,
          timerProgressBar: true,
          icon: "success",
          title: "เข้าสู่ระบบสำเร็จ",
          text: `ยินดีต้อนรับ ${response.data.user.fullName || response.data.user.username}`,
          color: '#1f2937',
          background: '#ffffff',
        });
        
        localStorage.setItem("token", response.data.token);
        // Use window.location for full page reload to ensure middleware works
        window.location.href = "/dashboard";
      } else {
        setLoading(false);
        Swal.fire({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          icon: "error",
          title: "เข้าสู่ระบบไม่สำเร็จ",
          text: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
          color: '#1f2937',
          background: '#ffffff',
        });
      }
    } catch (err: any) {
      console.error("Login error:", err);
      
      // แสดง error message ตามประเภท error
      const errorMessage = err.response?.data?.error || "เกิดข้อผิดพลาดในการเข้าสู่ระบบ";
      let title = "เข้าสู่ระบบไม่สำเร็จ";
      let text = errorMessage;
      
      // แปลง error message เป็นภาษาไทย
      if (errorMessage === "Invalid credentials") {
        text = "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง";
      } else if (errorMessage === "Account is disabled") {
        text = "บัญชีของคุณถูกปิดการใช้งาน กรุณาติดต่อผู้ดูแลระบบ";
      } else if (errorMessage === "Username and password are required") {
        text = "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน";
      } else if (errorMessage === "Internal server error") {
        text = "เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง";
      }
      
      setLoading(false);
      Swal.fire({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        icon: "error",
        title: title,
        text: text,
        color: '#1f2937',
        background: '#ffffff',
      });
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            OnTrak MDM
          </CardTitle>
          <CardDescription className="text-center">
            Sign in to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const result = handleSubmit(onSubmit)(e);
              return false;
            }} 
            className="space-y-4"
            noValidate
          >
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium">
                Username
              </label>
              <Input
                id="username"
                placeholder="Enter your username"
                {...register("username")}
              />
              {errors.username && (
                <p className="text-sm text-destructive">
                  {errors.username.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-sm text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

