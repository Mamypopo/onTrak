'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useTranslations } from '@/lib/i18n'
import { useStaffLocale } from '@/lib/i18n-staff'
import Swal from 'sweetalert2'

export default function LoginPage() {
  useStaffLocale() // Force Thai locale for staff
  const router = useRouter()
  const t = useTranslations()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Login failed')
      }

      // Store user data in localStorage
      localStorage.setItem('user', JSON.stringify(data.user))
      localStorage.setItem('token', data.token || 'dummy-token')

      Swal.fire({
        icon: 'success',
        title: 'เข้าสู่ระบบสำเร็จ',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      })

      // Redirect based on role
      if (data.user.role === 'ADMIN' || data.user.role === 'MANAGER') {
        router.push('/admin/menu')
      } else if (data.user.role === 'CASHIER') {
        router.push('/admin/close-table') // Cashier ไปหน้าที่ปิดโต๊ะ
      } else if (data.user.role === 'KITCHEN') {
        router.push('/kitchen')
      } else if (data.user.role === 'RUNNER') {
        router.push('/runner')
      } else {
        router.push('/admin/menu')
      }
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'เข้าสู่ระบบไม่สำเร็จ',
        text: error.message || t('auth.invalid_credentials'),
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 sm:p-6">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            {t('auth.login')}
          </CardTitle>
          <CardDescription className="text-center">
            ระบบจัดการร้านอาหาร
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t('auth.username')}
              </label>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="กรอกชื่อผู้ใช้"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t('auth.password')}
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="กรอกรหัสผ่าน"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? t('common.loading') : t('auth.login')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

