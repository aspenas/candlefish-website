import { createRouter, createRoute, createRootRoute } from '@tanstack/react-router'
import App from '../App'
import { DashboardHome } from '../pages/DashboardHome'

// Root route
const rootRoute = createRootRoute({
  component: App,
})

// Dashboard home route
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: DashboardHome,
})

// Route tree
const routeTree = rootRoute.addChildren([
  indexRoute,
])

// Create router
export const router = createRouter({
  routeTree,
})