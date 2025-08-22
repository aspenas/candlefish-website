#!/usr/bin/env python3
import os
import time
import json
import requests
import subprocess
from datetime import datetime
from agent_bridge import AgentBridge

class PaintboxMonitorAgent(AgentBridge):
    def __init__(self):
        super().__init__(agent_id="paintbox-monitor-01", port=7000)
        self.staging_url = "https://paintbox-staging.fly.dev"
        self.memory_threshold = 80
        self.last_optimization = 0
        
    def monitor_loop(self):
        """Continuous monitoring loop"""
        while True:
            try:
                # Check health
                health = requests.get(f"{self.staging_url}/api/health", timeout=5).json()
                
                # Check memory
                if health['memory']['percentage'] > self.memory_threshold:
                    self.trigger_optimization()
                
                # Check status
                if health['status'] == 'unhealthy':
                    self.trigger_healing()
                
                # Log metrics
                self.log_metrics(health)
                
            except Exception as e:
                self.log_error(f"Monitor error: {e}")
                
            time.sleep(60)  # Check every minute
    
    def trigger_optimization(self):
        """Trigger memory optimization"""
        if time.time() - self.last_optimization > 300:  # 5 min cooldown
            print(f"🚨 Memory high, triggering optimization...")
            requests.post(f"{self.staging_url}/api/memory/optimize", 
                         json={"level": "standard"})
            self.last_optimization = time.time()
    
    def trigger_healing(self):
        """Attempt to heal unhealthy service"""
        print(f"🏥 Service unhealthy, attempting healing...")
        subprocess.run(["fly", "machine", "restart", "d89642eae79628", 
                       "--app", "paintbox-staging"])
    
    def log_metrics(self, health):
        """Log metrics to file"""
        with open(f"{os.getenv('LOG_DIR')}/monitor_metrics.json", "a") as f:
            json.dump({
                "timestamp": datetime.now().isoformat(),
                "health": health
            }, f)
            f.write("\n")

if __name__ == "__main__":
    agent = PaintboxMonitorAgent()
    agent.monitor_loop()
