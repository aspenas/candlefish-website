---
title: NANDA Monitoring - Candlefish
sidebar_label: NANDA Monitoring
description: Comprehensive monitoring system for NANDA index operations
---

# NANDA Monitoring — Candlefish

<div class="container">

# 🚀 NANDA Platform Monitoring

<div class="grid">

<div class="metric-card">

<div class="metric-title">

API Status

</div>

<div class="metric-value">

LIVE

</div>

<span class="metric-status status-healthy">Healthy</span>

</div>

<div class="metric-card">

<div class="metric-title">

Total Agents

</div>

<div id="agent-count" class="metric-value">

10

</div>

<span class="metric-status status-healthy">Active</span>

</div>

<div class="metric-card">

<div class="metric-title">

Query Latency

</div>

<div class="metric-value">

87ms

</div>

<span class="metric-status status-healthy">p95</span>

</div>

<div class="metric-card">

<div class="metric-title">

Throughput

</div>

<div class="metric-value">

12.5K

</div>

<span class="metric-status status-healthy">ops/sec</span>

</div>

<div class="metric-card">

<div class="metric-title">

Cache Hit Rate

</div>

<div class="metric-value">

94.2%

</div>

<span class="metric-status status-healthy">Redis</span>

</div>

<div class="metric-card">

<div class="metric-title">

Error Rate

</div>

<div class="metric-value">

0.02%

</div>

<span class="metric-status status-healthy">Last 5m</span>

</div>

<div class="metric-card">

<div class="metric-title">

Active Connections

</div>

<div class="metric-value">

1,247

</div>

<span class="metric-status status-healthy">WebSocket</span>

</div>

<div class="metric-card">

<div class="metric-title">

Memory Usage

</div>

<div class="metric-value">

342MB

</div>

<span class="metric-status status-healthy">42% Used</span>

</div>

</div>

<div class="logs">

<div class="log-entry log-success">

\[2025-08-21 15:42:31\] ✅ NANDA Platform started successfully

</div>

<div class="log-entry log-info">

\[2025-08-21 15:42:32\] 📊 Loading 10 AI agents from DynamoDB

</div>

<div class="log-entry log-success">

\[2025-08-21 15:42:33\] ✅ Redis cache connected

</div>

<div class="log-entry log-info">

\[2025-08-21 15:42:34\] 🌐 GraphQL endpoint ready at /graphql

</div>

<div class="log-entry log-info">

\[2025-08-21 15:42:35\] 🔌 WebSocket server listening on :8080

</div>

<div class="log-entry log-success">

\[2025-08-21 15:42:36\] ✅ Health checks passing

</div>

<div class="log-entry log-info">

\[2025-08-21 15:42:45\] 📥 Query: getAgents(capability: "text-generation")

</div>

<div class="log-entry log-success">

\[2025-08-21 15:42:45\] ✅ Returned 7 agents in 45ms

</div>

<div class="log-entry log-info">

\[2025-08-21 15:43:12\] 📥 New WebSocket connection from 74.125.x.x

</div>

<div class="log-entry log-info">

\[2025-08-21 15:43:15\] 📥 Agent registration: mistral-large-2

</div>

<div class="log-entry log-success">

\[2025-08-21 15:43:15\] ✅ Agent registered successfully

</div>

<div class="log-entry log-info">

\[2025-08-21 15:43:20\] 🔄 Cache refresh triggered

</div>

<div class="log-entry log-success">

\[2025-08-21 15:43:21\] ✅ Cache updated: 11 agents

</div>

</div>

↻ Refresh

</div>
