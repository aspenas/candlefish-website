'use client'

import { ApolloProvider } from '@apollo/client'
import { apolloClient } from '@candlefish-ai/shared'

interface ApolloWrapperProps {
  children: React.ReactNode
}

export function ApolloWrapper({ children }: ApolloWrapperProps) {
  return (
    <ApolloProvider client={apolloClient}>
      {children}
    </ApolloProvider>
  )
}