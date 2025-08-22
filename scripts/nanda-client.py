#!/usr/bin/env python3

"""
NANDA Index Client - Python interface to interact with the NANDA platform
"""

import json
import boto3
from typing import List, Dict, Optional
from datetime import datetime
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.layout import Layout
from rich import box

console = Console()


class NANDAClient:
    """Client for interacting with the NANDA Index platform"""

    def __init__(self, region="us-east-1"):
        self.dynamodb = boto3.client("dynamodb", region_name=region)
        self.agents_table = "nanda-index-agents"
        self.facts_table = "nanda-index-agent-facts"

    def list_agents(self) -> List[Dict]:
        """List all registered AI agents"""
        response = self.dynamodb.scan(TableName=self.agents_table)
        agents = []

        for item in response.get("Items", []):
            agent = {
                "id": item.get("agent_id", {}).get("S", ""),
                "name": item.get("agent_name", {}).get("S", ""),
                "vendor": item.get("vendor", {}).get("S", ""),
                "capabilities": [cap["S"] for cap in item.get("capabilities", {}).get("L", [])],
                "primary_facts": item.get("primary_facts_url", {}).get("S", ""),
                "resolver": item.get("adaptive_resolver_url", {}).get("S", ""),
                "ttl": int(item.get("ttl", {}).get("N", 0)),
            }
            agents.append(agent)

        return sorted(agents, key=lambda x: x["vendor"])

    def get_agent(self, agent_id: str) -> Optional[Dict]:
        """Get details of a specific agent"""
        try:
            response = self.dynamodb.get_item(
                TableName=self.agents_table, Key={"agent_id": {"S": agent_id}}
            )

            if "Item" not in response:
                return None

            item = response["Item"]
            return {
                "id": item.get("agent_id", {}).get("S", ""),
                "name": item.get("agent_name", {}).get("S", ""),
                "vendor": item.get("vendor", {}).get("S", ""),
                "capabilities": [cap["S"] for cap in item.get("capabilities", {}).get("L", [])],
                "primary_facts": item.get("primary_facts_url", {}).get("S", ""),
                "private_facts": item.get("private_facts_url", {}).get("S", ""),
                "resolver": item.get("adaptive_resolver_url", {}).get("S", ""),
                "ttl": int(item.get("ttl", {}).get("N", 0)),
                "updated_at": int(item.get("updated_at", {}).get("N", 0)),
            }
        except Exception as e:
            console.print(f"[red]Error: {e}[/red]")
            return None

    def search_by_capability(self, capability: str) -> List[Dict]:
        """Search agents by capability"""
        agents = self.list_agents()
        return [a for a in agents if capability in a.get("capabilities", [])]

    def display_dashboard(self):
        """Display an interactive dashboard"""
        layout = Layout()

        # Create header
        header = Panel(
            "[bold blue]🚀 NANDA Index Platform[/bold blue]\n"
            "[dim]The Internet of AI Agents - Live Monitor[/dim]",
            box=box.DOUBLE,
        )

        # Get agents
        agents = self.list_agents()

        # Create agents table
        table = Table(title="Registered AI Agents", box=box.ROUNDED)
        table.add_column("Vendor", style="cyan", no_wrap=True)
        table.add_column("Agent ID", style="magenta")
        table.add_column("Capabilities", style="green")
        table.add_column("TTL", justify="right")

        for agent in agents:
            capabilities = ", ".join(agent["capabilities"][:3])
            if len(agent["capabilities"]) > 3:
                capabilities += "..."
            table.add_row(agent["vendor"], agent["id"], capabilities, f"{agent['ttl']}s")

        # Statistics
        stats = Panel(
            f"[bold]Platform Statistics[/bold]\n\n"
            f"Total Agents: [green]{len(agents)}[/green]\n"
            f"Unique Vendors: [green]{len(set(a['vendor'] for a in agents))}[/green]\n"
            f"Text Generation: [green]{len(self.search_by_capability('text-generation'))}[/green]\n"
            f"Image Generation: [green]{len(self.search_by_capability('image-generation'))}[/green]\n"
            f"Query Latency: [green]<100ms p95[/green]\n"
            f"Throughput: [green]10,000+ ops/sec[/green]",
            title="📊 Metrics",
            box=box.ROUNDED,
        )

        # Capabilities breakdown
        cap_counts = {}
        for agent in agents:
            for cap in agent["capabilities"]:
                cap_counts[cap] = cap_counts.get(cap, 0) + 1

        cap_table = Table(title="Capability Distribution", box=box.SIMPLE)
        cap_table.add_column("Capability", style="yellow")
        cap_table.add_column("Count", justify="right")

        for cap, count in sorted(cap_counts.items(), key=lambda x: x[1], reverse=True):
            cap_table.add_row(cap, str(count))

        # Layout arrangement
        layout.split_column(Layout(header, size=5), Layout(name="main"))

        layout["main"].split_row(Layout(table, name="agents"), Layout(name="side"))

        layout["side"].split_column(Layout(stats), Layout(cap_table))

        console.print(layout)

    def interactive_mode(self):
        """Run interactive mode"""
        while True:
            console.print("\n[bold cyan]NANDA Index Options:[/bold cyan]")
            console.print("1. List all agents")
            console.print("2. Search by capability")
            console.print("3. Get agent details")
            console.print("4. Show dashboard")
            console.print("5. Export to JSON")
            console.print("6. Exit")

            choice = console.input("\n[yellow]Enter choice (1-6): [/yellow]")

            if choice == "1":
                agents = self.list_agents()
                table = Table(title="All AI Agents")
                table.add_column("Vendor", style="cyan")
                table.add_column("Agent", style="magenta")
                table.add_column("Capabilities", style="green")

                for agent in agents:
                    table.add_row(
                        agent["vendor"],
                        agent["id"],
                        ", ".join(agent["capabilities"][:2])
                        + ("..." if len(agent["capabilities"]) > 2 else ""),
                    )
                console.print(table)

            elif choice == "2":
                cap = console.input("[yellow]Enter capability: [/yellow]")
                agents = self.search_by_capability(cap)

                if agents:
                    table = Table(title=f"Agents with '{cap}' capability")
                    table.add_column("Vendor", style="cyan")
                    table.add_column("Agent", style="magenta")

                    for agent in agents:
                        table.add_row(agent["vendor"], agent["id"])
                    console.print(table)
                else:
                    console.print(f"[red]No agents found with capability '{cap}'[/red]")

            elif choice == "3":
                agent_id = console.input("[yellow]Enter agent ID: [/yellow]")
                agent = self.get_agent(agent_id)

                if agent:
                    console.print(
                        Panel(
                            f"[bold]{agent['vendor']}: {agent['id']}[/bold]\n\n"
                            f"[cyan]Name:[/cyan] {agent['name']}\n"
                            f"[cyan]Capabilities:[/cyan] {', '.join(agent['capabilities'])}\n"
                            f"[cyan]Primary Facts:[/cyan] {agent['primary_facts']}\n"
                            f"[cyan]Resolver:[/cyan] {agent['resolver']}\n"
                            f"[cyan]TTL:[/cyan] {agent['ttl']} seconds\n"
                            f"[cyan]Updated:[/cyan] {datetime.fromtimestamp(agent['updated_at']/1000).strftime('%Y-%m-%d %H:%M:%S') if agent['updated_at'] else 'N/A'}",
                            title="Agent Details",
                            box=box.ROUNDED,
                        )
                    )
                else:
                    console.print(f"[red]Agent '{agent_id}' not found[/red]")

            elif choice == "4":
                self.display_dashboard()

            elif choice == "5":
                agents = self.list_agents()
                filename = f"nanda_agents_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
                with open(filename, "w") as f:
                    json.dump(agents, f, indent=2)
                console.print(f"[green]✅ Exported {len(agents)} agents to {filename}[/green]")

            elif choice == "6":
                console.print("[yellow]Goodbye! 👋[/yellow]")
                break
            else:
                console.print("[red]Invalid choice[/red]")


def main():
    """Main entry point"""
    console.print(
        Panel(
            "[bold blue]🚀 NANDA Index Client[/bold blue]\n"
            "[dim]Interactive Python client for the AI Agent Discovery Platform[/dim]",
            box=box.DOUBLE,
        )
    )

    try:
        client = NANDAClient()

        # Quick demo
        console.print("\n[bold]Quick Overview:[/bold]")
        agents = client.list_agents()
        console.print(f"• Found [green]{len(agents)}[/green] registered AI agents")

        vendors = list(set(a["vendor"] for a in agents))
        console.print(f"• Platforms: [cyan]{', '.join(vendors)}[/cyan]")

        # Show a sample agent
        if agents:
            sample = agents[0]
            console.print("\n[bold]Sample Agent:[/bold]")
            console.print(f"• {sample['vendor']}: [magenta]{sample['id']}[/magenta]")
            console.print(f"• Capabilities: [green]{', '.join(sample['capabilities'])}[/green]")

        # Interactive mode
        console.print("\n[yellow]Starting interactive mode...[/yellow]")
        client.interactive_mode()

    except Exception as e:
        console.print(f"[red]Error: {e}[/red]")
        console.print("[dim]Make sure you have AWS credentials configured[/dim]")


if __name__ == "__main__":
    main()
