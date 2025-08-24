'use client'

import { ApolloProvider } from '@apollo/client'
import { useMemo } from 'react'
import { createOfflineApolloClient } from '@/lib/offline-apollo'

interface ApolloWrapperProps {
  children: React.ReactNode
}

export function ApolloWrapper({ children }: ApolloWrapperProps) {
  // Create offline-capable Apollo client
  const client = useMemo(() => createOfflineApolloClient(), [])

  return (
    <ApolloProvider client={client}>
      {children}
    </ApolloProvider>
  )
}