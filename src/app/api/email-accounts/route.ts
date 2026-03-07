import { NextRequest, NextResponse } from 'next/server'
import { getUserFromToken } from '@/lib/auth'
import { db, isDatabaseAvailable } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const user = await getUserFromToken(token)
    if (!user || !user.organizationId) {
      return NextResponse.json({ error: 'Invalid token or no organization' }, { status: 401 })
    }

    // Return demo data if database is not available
    if (!isDatabaseAvailable()) {
      return NextResponse.json({
        emailAccounts: [
          { id: '1', provider: 'GMAIL', email: 'demo@gmail.com', protocol: 'IMAP', isConnected: true, lastSyncAt: new Date().toISOString(), syncStatus: 'SYNCED', createdAt: new Date().toISOString() },
        ]
      })
    }

    const emailAccounts = await db!.emailAccount.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ emailAccounts })
  } catch (error) {
    console.error('Get email accounts error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const user = await getUserFromToken(token)
    if (!user || !user.organizationId) {
      return NextResponse.json({ error: 'Invalid token or no organization' }, { status: 401 })
    }

    const body = await request.json()

    // Return demo response if database is not available
    if (!isDatabaseAvailable()) {
      return NextResponse.json({
        emailAccount: {
          id: 'demo-' + Date.now(),
          provider: body.provider,
          email: body.email,
          protocol: body.protocol || 'IMAP',
          isConnected: body.isConnected ?? false,
          syncStatus: body.syncStatus || 'PENDING'
        }
      })
    }

    const emailAccount = await db!.emailAccount.create({
      data: {
        userId: user.id,
        organizationId: user.organizationId,
        provider: body.provider,
        email: body.email,
        protocol: body.protocol || 'IMAP',
        encryptedCredentials: body.encryptedCredentials,
        accessToken: body.accessToken,
        refreshToken: body.refreshToken,
        isConnected: body.isConnected ?? false,
        lastSyncAt: body.lastSyncAt ? new Date(body.lastSyncAt) : null,
        syncStatus: body.syncStatus || 'PENDING'
      }
    })

    return NextResponse.json({ emailAccount })
  } catch (error) {
    console.error('Create email account error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
