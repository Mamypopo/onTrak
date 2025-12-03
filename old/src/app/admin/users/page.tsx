'use client'

import { useEffect, useState, useMemo } from 'react'
import { Plus, Edit, Trash2, Search, Filter, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useStaffLocale } from '@/lib/i18n-staff'
import Swal from 'sweetalert2'
import { Badge } from '@/components/ui/badge'

interface User {
  id: number
  name: string
  username: string
  role: 'ADMIN' | 'MANAGER' | 'CASHIER' | 'KITCHEN' | 'RUNNER' | 'STAFF'
  active: boolean
  createdAt: string
  updatedAt: string
}

const roleLabels: Record<User['role'], string> = {
  ADMIN: 'ผู้ดูแลระบบ',
  MANAGER: 'ผู้จัดการ',
  CASHIER: 'แคชเชียร์',
  KITCHEN: 'ครัว',
  RUNNER: 'รันเนอร์',
  STAFF: 'พนักงาน',
}

type SortField = 'name' | 'username' | 'role' | 'createdAt'
type SortDirection = 'asc' | 'desc'

export default function UsersPage() {
  useStaffLocale()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('') // Input value (immediate)
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('') // Debounced value (for API)
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  
  // Debounce search term (500ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 500) // Wait 500ms after user stops typing

    return () => clearTimeout(timer)
  }, [searchTerm])

  // Form states
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<User['role']>('STAFF')
  const [active, setActive] = useState(true)

  useEffect(() => {
    fetchUsers()
  }, [debouncedSearchTerm, roleFilter, activeFilter, sortField, sortDirection])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      
      // Build query params
      const params = new URLSearchParams()
      if (debouncedSearchTerm) params.append('search', debouncedSearchTerm)
      if (roleFilter !== 'all') params.append('role', roleFilter)
      if (activeFilter !== 'all') params.append('active', activeFilter)
      params.append('sortBy', sortField)
      params.append('sortOrder', sortDirection)

      const response = await fetch(`/api/users?${params.toString()}`)
      const data = await response.json()
      setUsers(data.users || [])
    } catch (error) {
      console.error('Error fetching users:', error)
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'ไม่สามารถโหลดข้อมูลได้',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 ml-1 opacity-50" />
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-4 h-4 ml-1" />
    ) : (
      <ArrowDown className="w-4 h-4 ml-1" />
    )
  }

  const resetForm = () => {
    setName('')
    setUsername('')
    setPassword('')
    setRole('STAFF')
    setActive(true)
    setEditingUser(null)
  }

  const handleOpenDialog = (user?: User) => {
    if (user) {
      setEditingUser(user)
      setName(user.name)
      setUsername(user.username)
      setPassword('')
      setRole(user.role)
      setActive(user.active)
    } else {
      resetForm()
    }
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    resetForm()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim() || !username.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณากรอกข้อมูลให้ครบ',
        text: 'กรุณากรอกชื่อและชื่อผู้ใช้',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      })
      return
    }

    if (!editingUser && !password.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณากรอกรหัสผ่าน',
        text: 'กรุณากรอกรหัสผ่านอย่างน้อย 6 ตัวอักษร',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      })
      return
    }

    if (password.trim() && password.length < 6) {
      Swal.fire({
        icon: 'error',
        title: 'รหัสผ่านสั้นเกินไป',
        text: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      })
      return
    }

    if (isSubmitting) return
    setIsSubmitting(true)

    try {
      const url = editingUser
        ? `/api/users/${editingUser.id}`
        : '/api/users'
      const method = editingUser ? 'PATCH' : 'POST'

      const payload: any = {
        name: name.trim(),
        username: username.trim(),
        role,
        active,
      }

      if (!editingUser || password.trim()) {
        payload.password = password
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || `Failed to ${editingUser ? 'update' : 'create'} user`)
      }

      Swal.fire({
        icon: 'success',
        title: editingUser ? 'แก้ไขสำเร็จ' : 'เพิ่มสำเร็จ',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      })

      handleCloseDialog()
      fetchUsers()
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: error.message || 'ไม่สามารถบันทึกข้อมูลได้',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (user: User) => {
    const result = await Swal.fire({
      title: 'ยืนยันการลบ',
      text: `คุณต้องการลบผู้ใช้ "${user.name}" (${user.username}) หรือไม่?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#ef4444',
    })

    if (!result.isConfirmed) return

    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete user')
      }

      Swal.fire({
        icon: 'success',
        title: 'ลบสำเร็จ',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      })

      fetchUsers()
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: error.message || 'ไม่สามารถลบข้อมูลได้',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      })
    }
  }

  // Skeleton component for table rows
  const TableRowSkeleton = () => (
    <tr className="border-b animate-pulse">
      <td className="p-4">
        <div className="h-4 bg-muted rounded w-24"></div>
      </td>
      <td className="p-4">
        <div className="h-4 bg-muted rounded w-20"></div>
      </td>
      <td className="p-4">
        <div className="h-6 bg-muted rounded w-20"></div>
      </td>
      <td className="p-4">
        <div className="h-6 bg-muted rounded w-16"></div>
      </td>
      <td className="p-4">
        <div className="h-4 bg-muted rounded w-24"></div>
      </td>
      <td className="p-4 text-right">
        <div className="flex justify-end gap-2">
          <div className="h-8 bg-muted rounded w-16"></div>
          <div className="h-8 bg-muted rounded w-16"></div>
        </div>
      </td>
    </tr>
  )

  if (loading) {
    return (
      <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="h-7 bg-muted rounded w-32 animate-pulse"></div>
          <div className="h-10 bg-muted rounded w-28 animate-pulse"></div>
        </div>

        {/* Search and Filters Skeleton */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="flex-1">
            <div className="h-10 bg-muted rounded animate-pulse"></div>
          </div>
          <div className="flex gap-2">
            <div className="h-10 bg-muted rounded w-full sm:w-[160px] animate-pulse"></div>
            <div className="h-10 bg-muted rounded w-full sm:w-[140px] animate-pulse"></div>
          </div>
        </div>

        {/* Table Skeleton */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-4">
                      <div className="h-4 bg-muted rounded w-12"></div>
                    </th>
                    <th className="text-left p-4">
                      <div className="h-4 bg-muted rounded w-20"></div>
                    </th>
                    <th className="text-left p-4">
                      <div className="h-4 bg-muted rounded w-16"></div>
                    </th>
                    <th className="text-left p-4">
                      <div className="h-4 bg-muted rounded w-16"></div>
                    </th>
                    <th className="text-left p-4">
                      <div className="h-4 bg-muted rounded w-20"></div>
                    </th>
                    <th className="text-right p-4">
                      <div className="h-4 bg-muted rounded w-16 ml-auto"></div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[...Array(5)].map((_, i) => (
                    <TableRowSkeleton key={i} />
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">จัดการผู้ใช้</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              เพิ่มผู้ใช้
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingUser ? 'แก้ไขผู้ใช้' : 'เพิ่มผู้ใช้'}
              </DialogTitle>
              <DialogDescription>
                {editingUser
                  ? 'แก้ไขข้อมูลผู้ใช้'
                  : 'เพิ่มผู้ใช้ใหม่เข้าสู่ระบบ'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="name">ชื่อ *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="เช่น สมชาย ใจดี"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="username">ชื่อผู้ใช้ *</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="เช่น somchai"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="password">
                  รหัสผ่าน {!editingUser && '*'}
                  {editingUser && <span className="text-muted-foreground">(เว้นว่างไว้ถ้าไม่ต้องการเปลี่ยน)</span>}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={editingUser ? 'เว้นว่างไว้ถ้าไม่ต้องการเปลี่ยน' : 'อย่างน้อย 6 ตัวอักษร'}
                  required={!editingUser}
                  minLength={6}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="role">บทบาท *</Label>
                <Select
                  value={role}
                  onValueChange={(value: User['role']) => setRole(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">ผู้ดูแลระบบ</SelectItem>
                    <SelectItem value="MANAGER">ผู้จัดการ</SelectItem>
                    <SelectItem value="CASHIER">แคชเชียร์</SelectItem>
                    <SelectItem value="KITCHEN">ครัว</SelectItem>
                    <SelectItem value="RUNNER">รันเนอร์</SelectItem>
                    <SelectItem value="STAFF">พนักงาน</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="active"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="w-4 h-4"
                />
                <Label htmlFor="active" className="cursor-pointer">
                  เปิดใช้งาน
                </Label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDialog}
                  disabled={isSubmitting}
                >
                  ยกเลิก
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'กำลังบันทึก...' : editingUser ? 'บันทึก' : 'เพิ่ม'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="ค้นหาชื่อหรือชื่อผู้ใช้..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="บทบาท" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกบทบาท</SelectItem>
              {Object.entries(roleLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={activeFilter} onValueChange={setActiveFilter}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="สถานะ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกสถานะ</SelectItem>
              <SelectItem value="active">เปิดใช้งาน</SelectItem>
              <SelectItem value="inactive">ปิดใช้งาน</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      {users.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {searchTerm || roleFilter !== 'all' || activeFilter !== 'all'
                ? 'ไม่พบข้อมูลที่ค้นหา'
                : 'ยังไม่มีผู้ใช้'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-4 font-medium">
                      <button
                        onClick={() => handleSort('name')}
                        className="flex items-center hover:text-primary transition-colors"
                      >
                        ชื่อ
                        <SortIcon field="name" />
                      </button>
                    </th>
                    <th className="text-left p-4 font-medium">
                      <button
                        onClick={() => handleSort('username')}
                        className="flex items-center hover:text-primary transition-colors"
                      >
                        ชื่อผู้ใช้
                        <SortIcon field="username" />
                      </button>
                    </th>
                    <th className="text-left p-4 font-medium">
                      <button
                        onClick={() => handleSort('role')}
                        className="flex items-center hover:text-primary transition-colors"
                      >
                        บทบาท
                        <SortIcon field="role" />
                      </button>
                    </th>
                    <th className="text-left p-4 font-medium">สถานะ</th>
                    <th className="text-left p-4 font-medium">
                      <button
                        onClick={() => handleSort('createdAt')}
                        className="flex items-center hover:text-primary transition-colors"
                      >
                        สร้างเมื่อ
                        <SortIcon field="createdAt" />
                      </button>
                    </th>
                    <th className="text-right p-4 font-medium">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b hover:bg-muted/50 transition-colors"
                    >
                      <td className="p-4">
                        <div className="font-medium">{user.name}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-muted-foreground">@{user.username}</div>
                      </td>
                      <td className="p-4">
                        <Badge variant="default">
                          {roleLabels[user.role]}
                        </Badge>
                      </td>
                      <td className="p-4">
                        {user.active ? (
                          <Badge variant="success">
                            เปิดใช้งาน
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            ปิดใช้งาน
                          </Badge>
                        )}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDialog(user)}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            แก้ไข
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(user)}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            ลบ
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results count */}
      {users.length > 0 && (
        <div className="mt-4 text-sm text-muted-foreground">
          พบ {users.length} รายการ
        </div>
      )}
    </div>
  )
}
