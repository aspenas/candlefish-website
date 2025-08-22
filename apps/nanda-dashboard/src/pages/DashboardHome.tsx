import React from 'react'

export function DashboardHome() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-card text-card-foreground p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-2">Total Agents</h3>
          <p className="text-3xl font-bold text-primary">1,247</p>
          <p className="text-sm text-muted-foreground">+12% from last month</p>
        </div>
        
        <div className="bg-card text-card-foreground p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-2">Active Platforms</h3>
          <p className="text-3xl font-bold text-primary">15</p>
          <p className="text-sm text-muted-foreground">OpenAI, Anthropic, Google...</p>
        </div>
        
        <div className="bg-card text-card-foreground p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-2">Discoveries Today</h3>
          <p className="text-3xl font-bold text-primary">89</p>
          <p className="text-sm text-muted-foreground">+5% from yesterday</p>
        </div>
        
        <div className="bg-card text-card-foreground p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-2">Network Health</h3>
          <p className="text-3xl font-bold text-green-600">98.7%</p>
          <p className="text-sm text-muted-foreground">All systems operational</p>
        </div>
      </div>

      <div className="bg-card text-card-foreground p-6 rounded-lg border">
        <h2 className="text-2xl font-bold mb-4">Welcome to NANDA Index</h2>
        <p className="text-muted-foreground mb-4">
          The revolutionary AI agent discovery and authentication platform is now live! 
          Explore the network of AI agents, discover new capabilities, and manage your agent ecosystem.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-secondary rounded-lg">
            <h3 className="font-semibold mb-2">🔍 Discover Agents</h3>
            <p className="text-sm text-muted-foreground">
              Browse through thousands of AI agents across different platforms and capabilities.
            </p>
          </div>
          
          <div className="p-4 bg-secondary rounded-lg">
            <h3 className="font-semibold mb-2">🔐 Secure Authentication</h3>
            <p className="text-sm text-muted-foreground">
              Advanced cryptographic authentication ensures agent identity and trustworthiness.
            </p>
          </div>
          
          <div className="p-4 bg-secondary rounded-lg">
            <h3 className="font-semibold mb-2">🌐 Enterprise Integration</h3>
            <p className="text-sm text-muted-foreground">
              Seamlessly connect with existing enterprise agent registries and systems.
            </p>
          </div>
          
          <div className="p-4 bg-secondary rounded-lg">
            <h3 className="font-semibold mb-2">📊 Real-time Analytics</h3>
            <p className="text-sm text-muted-foreground">
              Monitor agent performance, usage patterns, and network health in real-time.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}