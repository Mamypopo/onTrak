import { NextResponse } from 'next/server'
import { deleteSession, getSession } from '@/lib/auth'

export async function POST() {
  try {
    const session = await getSession()
    
    if (session) {
      await deleteSession()
      console.log(`[AUTH] User ${session.username} (${session.id}) logged out`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[AUTH] Logout error:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    )
  }
}
