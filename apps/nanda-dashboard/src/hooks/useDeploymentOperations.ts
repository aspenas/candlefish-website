import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useSubscription } from '@apollo/client'
import { gql } from '@apollo/client'
import {
  Deployment,
  DeploymentFilters,
  CreateDeploymentInput,
  RollbackDeploymentInput,
  RotateSecretInput,
  DeploymentUpdate,
  PaginatedDeployments,
  HealthCheck,
  SecretRotation,
  Environment,
  EnvironmentType
} from '../types/deployment.types'

// GraphQL Queries
const GET_DEPLOYMENTS = gql`
  query GetDeployments(
    $first: Int
    $after: String
    $filters: DeploymentFilters
  ) {
    deployments(first: $first, after: $after, filters: $filters) {
      edges {
        node {
          id
          environment {
            name
            url
            region
            tier
            replicas
            resources {
              cpu
              memory
              storage
            }
          }
          service
          version
          status
          triggeredBy
          triggeredAt
          startedAt
          completedAt
          duration
          commitSha
          commitMessage
          branch
          rollbackTargetId
          healthChecks {
            service
            status
            message
            lastChecked
            responseTime
            endpoint
          }
          metrics {
            deploymentTime
            testExecutionTime
            rollbackTime
            successRate
            errorCount
            warningCount
            performance {
              buildTime
              testTime
              deployTime
              healthCheckTime
            }
          }
        }
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      totalCount
    }
  }
`

const GET_DEPLOYMENT_DETAILS = gql`
  query GetDeploymentDetails($id: ID!) {
    deployment(id: $id) {
      id
      environment {
        name
        url
        region
        tier
        replicas
        resources {
          cpu
          memory
          storage
        }
      }
      service
      version
      status
      triggeredBy
      triggeredAt
      startedAt
      completedAt
      duration
      commitSha
      commitMessage
      branch
      rollbackTargetId
      healthChecks {
        service
        status
        message
        lastChecked
        responseTime
        endpoint
        details
      }
      artifacts {
        id
        name
        type
        size
        checksum
        url
      }
      logs {
        id
        timestamp
        level
        message
        service
        metadata
      }
      metrics {
        deploymentTime
        testExecutionTime
        rollbackTime
        successRate
        errorCount
        warningCount
        performance {
          buildTime
          testTime
          deployTime
          healthCheckTime
        }
      }
    }
  }
`

const GET_HEALTH_STATUS = gql`
  query GetHealthStatus($services: [String!]) {
    healthChecks(services: $services) {
      service
      status
      message
      lastChecked
      responseTime
      endpoint
      details
    }
  }
`

const GET_ENVIRONMENTS = gql`
  query GetEnvironments {
    environments {
      name
      url
      region
      tier
      replicas
      resources {
        cpu
        memory
        storage
      }
    }
  }
`

const GET_SECRET_ROTATIONS = gql`
  query GetSecretRotations {
    secretRotations {
      id
      service
      secretName
      type
      status
      lastRotated
      nextRotation
      rotatedBy
      environments
      validationStatus
    }
  }
`

// GraphQL Mutations
const CREATE_DEPLOYMENT = gql`
  mutation CreateDeployment($input: CreateDeploymentInput!) {
    createDeployment(input: $input) {
      deployment {
        id
        status
        triggeredAt
        environment {
          name
        }
        service
        version
      }
      success
      message
    }
  }
`

const ROLLBACK_DEPLOYMENT = gql`
  mutation RollbackDeployment($input: RollbackDeploymentInput!) {
    rollbackDeployment(input: $input) {
      deployment {
        id
        status
        rollbackTargetId
      }
      success
      message
    }
  }
`

const ROTATE_SECRET = gql`
  mutation RotateSecret($input: RotateSecretInput!) {
    rotateSecret(input: $input) {
      secretRotation {
        id
        status
        lastRotated
      }
      success
      message
    }
  }
`

const CANCEL_DEPLOYMENT = gql`
  mutation CancelDeployment($id: ID!) {
    cancelDeployment(id: $id) {
      deployment {
        id
        status
      }
      success
      message
    }
  }
`

// GraphQL Subscriptions
const DEPLOYMENT_UPDATES = gql`
  subscription DeploymentUpdates($deploymentId: ID) {
    deploymentUpdates(deploymentId: $deploymentId) {
      type
      deploymentId
      data
    }
  }
`

const HEALTH_STATUS_UPDATES = gql`
  subscription HealthStatusUpdates {
    healthStatusUpdates {
      service
      status
      message
      lastChecked
      responseTime
      endpoint
      details
    }
  }
`

// Custom Hooks
export function useDeployments(filters?: DeploymentFilters) {
  const [deployments, setDeployments] = useState<Deployment[]>([])
  const [loading, setLoading] = useState(false)
  const [hasNextPage, setHasNextPage] = useState(false)

  const { data, loading: queryLoading, refetch, fetchMore } = useQuery(GET_DEPLOYMENTS, {
    variables: {
      first: 20,
      filters
    },
    onCompleted: (data) => {
      if (data?.deployments?.edges) {
        setDeployments(data.deployments.edges.map((edge: any) => edge.node))
        setHasNextPage(data.deployments.pageInfo.hasNextPage)
      }
    }
  })

  const loadMore = async () => {
    if (!hasNextPage) return

    setLoading(true)
    try {
      const result = await fetchMore({
        variables: {
          first: 20,
          after: data?.deployments?.pageInfo?.endCursor
        }
      })

      if (result.data?.deployments?.edges) {
        setDeployments(prev => [
          ...prev,
          ...result.data.deployments.edges.map((edge: any) => edge.node)
        ])
        setHasNextPage(result.data.deployments.pageInfo.hasNextPage)
      }
    } finally {
      setLoading(false)
    }
  }

  return {
    deployments,
    loading: queryLoading || loading,
    hasNextPage,
    refetch,
    loadMore
  }
}

export function useDeploymentDetails(deploymentId: string | null) {
  const { data, loading, error } = useQuery(GET_DEPLOYMENT_DETAILS, {
    variables: { id: deploymentId },
    skip: !deploymentId
  })

  return {
    deployment: data?.deployment,
    loading,
    error
  }
}

export function useHealthStatus(services?: string[]) {
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([])

  const { data, loading, refetch } = useQuery(GET_HEALTH_STATUS, {
    variables: { services },
    pollInterval: 30000 // Poll every 30 seconds
  })

  useSubscription(HEALTH_STATUS_UPDATES, {
    onData: ({ data }) => {
      if (data.data?.healthStatusUpdates) {
        setHealthChecks(prev => {
          const updated = [...prev]
          const index = updated.findIndex(hc => hc.service === data.data.healthStatusUpdates.service)
          if (index >= 0) {
            updated[index] = data.data.healthStatusUpdates
          } else {
            updated.push(data.data.healthStatusUpdates)
          }
          return updated
        })
      }
    }
  })

  useEffect(() => {
    if (data?.healthChecks) {
      setHealthChecks(data.healthChecks)
    }
  }, [data])

  return {
    healthChecks,
    loading,
    refetch
  }
}

export function useEnvironments() {
  const { data, loading, error } = useQuery(GET_ENVIRONMENTS)

  return {
    environments: data?.environments || [],
    loading,
    error
  }
}

export function useSecretRotations() {
  const { data, loading, error, refetch } = useQuery(GET_SECRET_ROTATIONS)

  return {
    secretRotations: data?.secretRotations || [],
    loading,
    error,
    refetch
  }
}

export function useDeploymentOperations() {
  const [createDeploymentMutation] = useMutation(CREATE_DEPLOYMENT)
  const [rollbackDeploymentMutation] = useMutation(ROLLBACK_DEPLOYMENT)
  const [rotateSecretMutation] = useMutation(ROTATE_SECRET)
  const [cancelDeploymentMutation] = useMutation(CANCEL_DEPLOYMENT)

  const createDeployment = async (input: CreateDeploymentInput) => {
    try {
      const result = await createDeploymentMutation({
        variables: { input }
      })
      return result.data?.createDeployment
    } catch (error) {
      console.error('Failed to create deployment:', error)
      throw error
    }
  }

  const rollbackDeployment = async (input: RollbackDeploymentInput) => {
    try {
      const result = await rollbackDeploymentMutation({
        variables: { input }
      })
      return result.data?.rollbackDeployment
    } catch (error) {
      console.error('Failed to rollback deployment:', error)
      throw error
    }
  }

  const rotateSecret = async (input: RotateSecretInput) => {
    try {
      const result = await rotateSecretMutation({
        variables: { input }
      })
      return result.data?.rotateSecret
    } catch (error) {
      console.error('Failed to rotate secret:', error)
      throw error
    }
  }

  const cancelDeployment = async (deploymentId: string) => {
    try {
      const result = await cancelDeploymentMutation({
        variables: { id: deploymentId }
      })
      return result.data?.cancelDeployment
    } catch (error) {
      console.error('Failed to cancel deployment:', error)
      throw error
    }
  }

  return {
    createDeployment,
    rollbackDeployment,
    rotateSecret,
    cancelDeployment
  }
}

export function useRealtimeDeploymentUpdates(deploymentId?: string) {
  const [updates, setUpdates] = useState<DeploymentUpdate[]>([])
  const updatesRef = useRef<DeploymentUpdate[]>([])

  useSubscription(DEPLOYMENT_UPDATES, {
    variables: { deploymentId },
    onData: ({ data }) => {
      if (data.data?.deploymentUpdates) {
        const update = data.data.deploymentUpdates
        updatesRef.current = [...updatesRef.current, update].slice(-50) // Keep last 50 updates
        setUpdates([...updatesRef.current])
      }
    }
  })

  const clearUpdates = () => {
    updatesRef.current = []
    setUpdates([])
  }

  return {
    updates,
    clearUpdates
  }
}
