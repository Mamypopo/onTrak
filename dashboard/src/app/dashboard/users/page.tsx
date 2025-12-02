"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, Edit, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Shield, User, Eye } from "lucide-react";
import Swal from "sweetalert2";
import { getSwalConfig } from "@/lib/swal-config";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { cn } from "@/lib/utils";

const userSchema = z.object({
  username: z.string().min(1, "กรุณากรอกชื่อผู้ใช้"),
  password: z.string().min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร").optional(),
  email: z.string().email("รูปแบบอีเมลไม่ถูกต้อง").optional().nullable(),
  fullName: z.string().min(1, "กรุณากรอกชื่อ").optional().nullable(),
  role: z.enum(["ADMIN", "MANAGER", "USER", "VIEWER"]),
  isActive: z.boolean().default(true),
});

interface User {
  id: string;
  username: string;
  email: string | null;
  fullName: string | null;
  role: "ADMIN" | "MANAGER" | "USER" | "VIEWER";
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
}

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(userSchema),
    defaultValues: {
      username: "",
      password: "",
      email: "",
      fullName: "",
      role: "USER" as const,
      isActive: true,
    },
  });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    fetchCurrentUser();
    fetchUsers();
  }, [router]);

  useEffect(() => {
    if (editingUser) {
      reset({
        username: editingUser.username,
        email: editingUser.email || "",
        fullName: editingUser.fullName || "",
        role: editingUser.role,
        isActive: editingUser.isActive,
        password: "",
      });
    } else {
      reset({
        username: "",
        password: "",
        email: "",
        fullName: "",
        role: "USER",
        isActive: true,
      });
    }
  }, [editingUser, reset]);

  useEffect(() => {
    fetchUsers();
  }, [debouncedSearch, roleFilter]);

  const fetchCurrentUser = async () => {
    try {
      const response = await api.get("/api/auth/me");
      if (response.data.success) {
        setCurrentUser(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching current user:", error);
    }
  };

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.get("/api/user");
      if (response.data.success) {
        let filteredUsers = response.data.data;

        // Filter by search
        if (debouncedSearch) {
          filteredUsers = filteredUsers.filter(
            (user: User) =>
              user.username.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
              user.fullName?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
              user.email?.toLowerCase().includes(debouncedSearch.toLowerCase())
          );
        }

        // Filter by role
        if (roleFilter !== "all") {
          filteredUsers = filteredUsers.filter((user: User) => user.role === roleFilter);
        }

        setUsers(filteredUsers);
      }
    } catch (error: any) {
      if (error.response?.status === 403) {
        Swal.fire(
          getSwalConfig({
            icon: "error",
            title: "ไม่มีสิทธิ์เข้าถึง",
            text: "คุณไม่มีสิทธิ์ในการดูรายชื่อผู้ใช้",
          })
        );
        router.push("/dashboard");
      }
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, roleFilter, router]);

  const onSubmit = async (data: any) => {
    try {
      const url = editingUser ? `/api/user/${editingUser.id}` : "/api/user";
      const method = editingUser ? "put" : "post";

      if (editingUser && !data.password) {
        delete data.password;
      }

      await api[method](url, data);
      await Swal.fire(
        getSwalConfig({
          icon: "success",
          title: editingUser ? "อัปเดตผู้ใช้สำเร็จ" : "สร้างผู้ใช้สำเร็จ",
          timer: 1500,
          showConfirmButton: false,
        })
      );
      setIsDialogOpen(false);
      setEditingUser(null);
      reset();
      fetchUsers();
    } catch (error: any) {
      await Swal.fire(
        getSwalConfig({
          icon: "error",
          title: "เกิดข้อผิดพลาด",
          text: error.response?.data?.error || "กรุณาลองใหม่อีกครั้ง",
        })
      );
    }
  };

  const handleDelete = async (id: string, username: string) => {
    const result = await Swal.fire(
      getSwalConfig({
        title: "ยืนยันการลบ",
        text: `คุณต้องการลบผู้ใช้ ${username} หรือไม่?`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "ลบ",
        cancelButtonText: "ยกเลิก",
        confirmButtonColor: "hsl(var(--destructive))",
      })
    );

    if (!result.isConfirmed) return;

    try {
      await api.delete(`/api/user/${id}`);
      await Swal.fire(
        getSwalConfig({
          icon: "success",
          title: "ลบผู้ใช้สำเร็จ",
          timer: 1500,
          showConfirmButton: false,
        })
      );
      fetchUsers();
    } catch (error: any) {
      await Swal.fire(
        getSwalConfig({
          icon: "error",
          title: "เกิดข้อผิดพลาด",
          text: error.response?.data?.error || "กรุณาลองใหม่อีกครั้ง",
        })
      );
    }
  };

  const roleLabels = {
    ADMIN: "ผู้ดูแลระบบ",
    MANAGER: "ผู้จัดการ",
    USER: "ผู้ใช้",
    VIEWER: "ผู้ดู",
  };

  const roleColors = {
    ADMIN: "bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30",
    MANAGER: "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30",
    USER: "bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30",
    VIEWER: "bg-gray-500/20 text-gray-600 dark:text-gray-400 border-gray-500/30",
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "ADMIN":
        return <Shield className="w-4 h-4 text-red-500" />;
      case "MANAGER":
        return <Shield className="w-4 h-4 text-blue-500" />;
      case "VIEWER":
        return <Eye className="w-4 h-4 text-gray-500" />;
      default:
        return <User className="w-4 h-4 text-green-500" />;
    }
  };

  // Check permission
  if (currentUser && currentUser.role !== "ADMIN" && currentUser.role !== "MANAGER") {
    return (
      <AppLayout>
        <div className="flex-1 container mx-auto p-6">
          <Card>
            <CardContent className="p-12 text-center">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
              <p className="text-muted-foreground mb-4">You don&apos;t have permission to view users</p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex-1 container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
              จัดการผู้ใช้
            </h1>
            <p className="text-sm text-muted-foreground mt-1">จัดการข้อมูลผู้ใช้ทั้งหมดในระบบ</p>
          </div>
          {currentUser?.role === "ADMIN" && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingUser(null)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  สร้างผู้ใช้
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingUser ? "แก้ไขผู้ใช้" : "สร้างผู้ใช้"}</DialogTitle>
                  <DialogDescription>
                    {editingUser ? "แก้ไขข้อมูลผู้ใช้ในระบบ" : "เพิ่มผู้ใช้ใหม่เข้าสู่ระบบ"}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
                  <div>
                    <Label htmlFor="username">ชื่อผู้ใช้</Label>
                    <Input
                      id="username"
                      {...register("username")}
                      placeholder="กรอกชื่อผู้ใช้"
                      disabled={!!editingUser}
                    />
                    {errors.username && (
                      <p className="text-sm text-destructive mt-1">{String(errors.username?.message || "")}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="password">
                      รหัสผ่าน {editingUser && "(เว้นว่างไว้ถ้าไม่ต้องการเปลี่ยน)"}
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      {...register("password")}
                      placeholder="กรอกรหัสผ่าน"
                    />
                    {errors.password && (
                      <p className="text-sm text-destructive mt-1">{String(errors.password?.message || "")}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="email">อีเมล (ไม่บังคับ)</Label>
                    <Input
                      id="email"
                      type="email"
                      {...register("email")}
                      placeholder="กรอกอีเมล"
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive mt-1">{String(errors.email?.message || "")}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="fullName">ชื่อ (ไม่บังคับ)</Label>
                    <Input
                      id="fullName"
                      {...register("fullName")}
                      placeholder="กรอกชื่อ"
                    />
                    {errors.fullName && (
                      <p className="text-sm text-destructive mt-1">{String(errors.fullName?.message || "")}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="role">บทบาท</Label>
                    <Controller
                      name="role"
                      control={control}
                      defaultValue="USER"
                      render={({ field }) => (
                        <Select value={field.value || "USER"} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="เลือกบทบาท" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USER">ผู้ใช้</SelectItem>
                            <SelectItem value="MANAGER">ผู้จัดการ</SelectItem>
                            <SelectItem value="ADMIN">ผู้ดูแลระบบ</SelectItem>
                            <SelectItem value="VIEWER">ผู้ดู</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.role && (
                      <p className="text-sm text-destructive mt-1">{String(errors.role?.message || "")}</p>
                    )}
                  </div>

                  {editingUser && (
                    <div>
                      <Label htmlFor="isActive">สถานะ</Label>
                      <Controller
                        name="isActive"
                        control={control}
                        defaultValue={true}
                        render={({ field }) => (
                          <Select
                            value={field.value ? "true" : "false"}
                            onValueChange={(val) => field.onChange(val === "true")}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="เลือกสถานะ" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">Active</SelectItem>
                              <SelectItem value="false">Inactive</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                  )}

                  <Button type="submit" className="w-full">
                    {editingUser ? "อัปเดต" : "สร้าง"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ค้นหาชื่อผู้ใช้ ชื่อ หรืออีเมล..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="บทบาททั้งหมด" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">บทบาททั้งหมด</SelectItem>
                  <SelectItem value="ADMIN">ผู้ดูแลระบบ</SelectItem>
                  <SelectItem value="MANAGER">ผู้จัดการ</SelectItem>
                  <SelectItem value="USER">ผู้ใช้</SelectItem>
                  <SelectItem value="VIEWER">ผู้ดู</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>รายการผู้ใช้</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ชื่อ</TableHead>
                      <TableHead>ชื่อผู้ใช้</TableHead>
                      <TableHead>บทบาท</TableHead>
                      <TableHead>สถานะ</TableHead>
                      <TableHead>วันที่สร้าง</TableHead>
                      <TableHead className="text-right">จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-20" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-5 w-16 rounded-full" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-5 w-16 rounded-full" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Skeleton className="h-8 w-8 rounded" />
                            <Skeleton className="h-8 w-8 rounded" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : users.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">ไม่พบข้อมูลผู้ใช้</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ชื่อ</TableHead>
                      <TableHead>ชื่อผู้ใช้</TableHead>
                      <TableHead>บทบาท</TableHead>
                      <TableHead>สถานะ</TableHead>
                      <TableHead>วันที่สร้าง</TableHead>
                      <TableHead className="text-right">จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {getRoleIcon(user.role)}
                            {user.fullName || user.email || "-"}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{user.username}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("border", roleColors[user.role])}>
                            {roleLabels[user.role]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.isActive ? "success" : "muted"} className="text-xs">
                            {user.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(user.createdAt), "dd MMM yyyy", { locale: th })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {currentUser?.role === "ADMIN" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setEditingUser(user);
                                    setIsDialogOpen(true);
                                  }}
                                  className="h-8 w-8"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                {user.id !== currentUser.id && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDelete(user.id, user.username)}
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
