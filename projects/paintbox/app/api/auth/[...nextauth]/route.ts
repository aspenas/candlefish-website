import { NextRequest } from 'next/server'
import NextAuth from 'next-auth'
import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from '@/lib/db/prisma'

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      image?: string
      isFirstLogin?: boolean
      emailVerified?: Date | null
    }
  }

  interface User {
    id: string
    email: string
    name: string
    image?: string
    isFirstLogin?: boolean
    emailVerified?: Date | null
  }
}

const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: '/login',
    error: '/login?error=true',
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // Optional: Restrict to specific email domains
      const allowedDomains = process.env.ALLOWED_EMAIL_DOMAINS?.split(',') || []

      if (allowedDomains.length > 0 && user.email) {
        const userDomain = user.email.split('@')[1]
        if (!allowedDomains.includes(userDomain)) {
          return false
        }
      }

      // Check if this is the user's first login
      if (account?.provider === 'google' && user.email) {
        try {
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email }
          })

          if (!existingUser) {
            user.isFirstLogin = true
          }
        } catch (error) {
          console.error('Error checking user existence:', error)
        }
      }

      return true
    },

    async jwt({ token, user, account }) {
      if (user) {
        token.sub = user.id
        token.isFirstLogin = user.isFirstLogin || false
      }

      if (account?.access_token) {
        token.accessToken = account.access_token
      }

      return token
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!
        session.user.isFirstLogin = token.isFirstLogin as boolean || false
      }

      return session
    },

    async redirect({ url, baseUrl }) {
      // Handle post-login redirects
      if (url.startsWith('/')) return `${baseUrl}${url}`
      if (new URL(url).origin === baseUrl) return url
      return baseUrl
    }
  },
  events: {
    async createUser({ user }) {
      console.log('New user created:', user.email)

      // You can add additional logic here for new user setup
      // e.g., send welcome email, create default settings, etc.
    },

    async signIn({ user, account, isNewUser }) {
      console.log(`User ${user.email} signed in via ${account?.provider}`)

      if (isNewUser) {
        console.log('First-time login detected for:', user.email)
      }
    }
  }
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
