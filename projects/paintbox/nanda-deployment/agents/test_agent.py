#!/usr/bin/env python3
import os
import time
import json
import subprocess
from datetime import datetime
from agent_bridge import AgentBridge

class PaintboxTestAgent(AgentBridge):
    def __init__(self):
        super().__init__(agent_id="paintbox-test-02", port=7002)
        self.test_script = "/Users/patricksmith/candlefish-ai/projects/paintbox/scripts/test-golden-paths-staging.sh"
        self.last_test = 0
        self.test_interval = 3600  # 1 hour
        
    def test_loop(self):
        """Continuous testing loop"""
        while True:
            if time.time() - self.last_test > self.test_interval:
                self.run_golden_paths()
                self.last_test = time.time()
            time.sleep(60)
    
    def run_golden_paths(self):
        """Run Golden Path tests"""
        print(f"🧪 Running Golden Path tests...")
        result = subprocess.run([self.test_script], 
                              capture_output=True, text=True)
        
        # Parse results
        if "Failed: 0" in result.stdout:
            print(f"✅ All Golden Paths passing!")
        else:
            print(f"❌ Golden Path failures detected")
            self.alert_failures(result.stdout)
    
    def alert_failures(self, output):
        """Alert on test failures"""
        with open(f"{os.getenv('LOG_DIR')}/test_failures.log", "a") as f:
            f.write(f"\n{datetime.now().isoformat()}\n")
            f.write(output)

if __name__ == "__main__":
    agent = PaintboxTestAgent()
    agent.test_loop()
