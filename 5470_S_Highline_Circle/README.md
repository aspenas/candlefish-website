# 5470 S Highline Circle - Furnishings Inventory System

A modern, full-stack inventory management system for tracking and managing home furnishings.

## Features

- 📊 **Comprehensive Inventory Management**: Track items by room, category, and price
- 🔍 **Advanced Search & Filtering**: Find items quickly with multi-criteria search
- 💰 **Sell/Keep Decision Tracking**: Manage disposition decisions for each item
- 📈 **Real-time Analytics**: Visual dashboards showing inventory value by room and category
- 📄 **Export Capabilities**: Generate PDF reports and Excel exports
- 📱 **Mobile Responsive**: Works seamlessly on all devices
- 🤖 **AI Integration**: NANDA agents for intelligent recommendations
- 🔄 **Workflow Automation**: n8n integration for automated processes

## Tech Stack

- **Backend**: Go (Fiber framework)
- **Frontend**: React + TypeScript + Tailwind CSS
- **Database**: PostgreSQL
- **Cache**: Redis
- **Automation**: n8n workflows
- **AI**: NANDA agent integration
- **Export**: PDF generation, Excel export

## Project Structure

```
5470_S_Highline_Circle/
├── backend/              # Go backend API
├── frontend/            # React frontend
├── database/           # PostgreSQL schemas and migrations
├── workflows/          # n8n workflow definitions
├── agents/             # NANDA agent configurations
├── docker-compose.yml  # Container orchestration
└── README.md
```

## Quick Start

```bash
# Start all services
docker-compose up -d

# Access the application
open http://localhost:3000

# Access n8n workflows
open http://localhost:5678

# Access API documentation
open http://localhost:8080/swagger
```

## Current Status

- Total Items: 239
- Total Value: $400,000+
- Rooms: 40
- Categories: 11

## Decision Process

1. **Sell vs. Keep**: Review each item and mark disposition
2. **Set Asking Prices**: Determine sale prices for items marked "Sell"
3. **Prepare Buyer View**: Generate clean inventory for potential buyers
4. **Negotiate**: Use room bundles and package deals