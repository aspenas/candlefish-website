import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/db/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const preferences = await request.json()

    // Update user preferences in the database
    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        preferences: preferences,
        isFirstLogin: false,
      }
    })

    return NextResponse.json({
      success: true,
      preferences: updatedUser.preferences
    })
  } catch (error) {
    console.error('Error updating user preferences:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        preferences: true,
        isFirstLogin: true,
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      preferences: user.preferences,
      isFirstLogin: user.isFirstLogin,
    })
  } catch (error) {
    console.error('Error fetching user preferences:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
