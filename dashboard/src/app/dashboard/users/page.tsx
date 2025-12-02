"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ArrowLeft, Plus, Edit, Trash2, Shield, User, Eye } from "lucide-react";
import Link from "next/link";
import Swal from "sweetalert2";

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
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    fetchCurrentUser();
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

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

  const fetchUsers = async () => {
    try {
      const response = await api.get("/api/user");
      if (response.data.success) {
        setUsers(response.data.data);
      }
    } catch (error: any) {
      if (error.response?.status === 403) {
        Swal.fire({
          icon: "error",
          title: "Access Denied",
          text: "You don't have permission to view users",
        });
        router.push("/dashboard");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async () => {
    const { value: formValues } = await Swal.fire({
      title: "Add New User",
      html: `
        <input id="swal-username" class="swal2-input" placeholder="Username" required>
        <input id="swal-email" class="swal2-input" placeholder="Email (optional)" type="email">
        <input id="swal-fullName" class="swal2-input" placeholder="Full Name (optional)">
        <input id="swal-password" class="swal2-input" placeholder="Password" type="password" required>
        <select id="swal-role" class="swal2-select">
          <option value="USER">USER</option>
          <option value="MANAGER">MANAGER</option>
          <option value="ADMIN">ADMIN</option>
          <option value="VIEWER">VIEWER</option>
        </select>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Create",
      cancelButtonText: "Cancel",
      preConfirm: () => {
        const username = (document.getElementById('swal-username') as HTMLInputElement)?.value;
        const email = (document.getElementById('swal-email') as HTMLInputElement)?.value;
        const fullName = (document.getElementById('swal-fullName') as HTMLInputElement)?.value;
        const password = (document.getElementById('swal-password') as HTMLInputElement)?.value;
        const role = (document.getElementById('swal-role') as HTMLSelectElement)?.value;

        if (!username || !password) {
          Swal.showValidationMessage('Username and password are required');
          return false;
        }

        return { username, email, fullName, password, role };
      },
    });

    if (formValues) {
      try {
        await api.post("/api/user", formValues);
        Swal.fire({
          icon: "success",
          title: "User Created",
          timer: 2000,
          showConfirmButton: false,
        });
        fetchUsers();
      } catch (error: any) {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: error.response?.data?.error || "Failed to create user",
        });
      }
    }
  };

  const handleEditUser = async (user: User) => {
    const { value: formValues } = await Swal.fire({
      title: "Edit User",
      html: `
        <input id="swal-email" class="swal2-input" placeholder="Email" value="${user.email || ''}" type="email">
        <input id="swal-fullName" class="swal2-input" placeholder="Full Name" value="${user.fullName || ''}">
        <select id="swal-role" class="swal2-select">
          <option value="USER" ${user.role === 'USER' ? 'selected' : ''}>USER</option>
          <option value="MANAGER" ${user.role === 'MANAGER' ? 'selected' : ''}>MANAGER</option>
          <option value="ADMIN" ${user.role === 'ADMIN' ? 'selected' : ''}>ADMIN</option>
          <option value="VIEWER" ${user.role === 'VIEWER' ? 'selected' : ''}>VIEWER</option>
        </select>
        <select id="swal-isActive" class="swal2-select">
          <option value="true" ${user.isActive ? 'selected' : ''}>Active</option>
          <option value="false" ${!user.isActive ? 'selected' : ''}>Inactive</option>
        </select>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Update",
      cancelButtonText: "Cancel",
      preConfirm: () => {
        const email = (document.getElementById('swal-email') as HTMLInputElement)?.value;
        const fullName = (document.getElementById('swal-fullName') as HTMLInputElement)?.value;
        const role = (document.getElementById('swal-role') as HTMLSelectElement)?.value;
        const isActive = (document.getElementById('swal-isActive') as HTMLSelectElement)?.value === 'true';

        return { email, fullName, role, isActive };
      },
    });

    if (formValues) {
      try {
        await api.put(`/api/user/${user.id}`, formValues);
        Swal.fire({
          icon: "success",
          title: "User Updated",
          timer: 2000,
          showConfirmButton: false,
        });
        fetchUsers();
      } catch (error: any) {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: error.response?.data?.error || "Failed to update user",
        });
      }
    }
  };

  const handleDelete = async (userId: string, username: string) => {
    const result = await Swal.fire({
      title: "Delete User?",
      text: `Are you sure you want to delete ${username}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/api/user/${userId}`);
        Swal.fire({
          icon: "success",
          title: "User Deleted",
          timer: 2000,
          showConfirmButton: false,
        });
        fetchUsers();
      } catch (error: any) {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: error.response?.data?.error || "Failed to delete user",
        });
      }
    }
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

  const getRoleColor = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-red-100 text-red-800";
      case "MANAGER":
        return "bg-blue-100 text-blue-800";
      case "VIEWER":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-green-100 text-green-800";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Check if user has permission
  if (currentUser && currentUser.role !== "ADMIN" && currentUser.role !== "MANAGER") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
          <p className="text-muted-foreground mb-4">
            You don&apos;t have permission to view users
          </p>
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <h1 className="text-2xl font-bold">User Management</h1>
            </div>
            <div className="flex items-center gap-4">
              {currentUser?.role === "ADMIN" && (
                <Button onClick={() => handleAddUser()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add User
                </Button>
              )}
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-4">
          {users.map((user) => (
            <Card key={user.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {getRoleIcon(user.role)}
                      <div>
                        <h3 className="font-semibold">{user.username}</h3>
                        <p className="text-sm text-muted-foreground">
                          {user.fullName || user.email || "No name"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 text-xs rounded ${getRoleColor(
                          user.role
                        )}`}
                      >
                        {user.role}
                      </span>
                      {!user.isActive && (
                        <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-800">
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {currentUser?.role === "ADMIN" && (
                      <>
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => handleEditUser(user)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        {user.id !== currentUser.id && (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDelete(user.id, user.username)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
                {user.lastLogin && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Last login: {new Date(user.lastLogin).toLocaleString()}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {users.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No users found
          </div>
        )}
      </main>
    </div>
  );
}

