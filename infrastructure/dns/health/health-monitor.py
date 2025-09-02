#!/usr/bin/env python3
"""
Health monitoring script for candlefish.ai services
Monitors all subdomains and sends alerts on failures
"""

import asyncio
import aiohttp
import json
import time
import logging
from datetime import datetime
from typing import Dict, List, Optional
import smtplib
from email.mime.text import MimeText
from email.mime.multipart import MimeMultipart

# Configuration
SERVICES = {
    'api': {
        'url': 'https://api.candlefish.ai/health',
        'expected_status': 200,
        'timeout': 10,
        'critical': True
    },
    'analytics': {
        'url': 'https://analytics.candlefish.ai/health', 
        'expected_status': 200,
        'timeout': 10,
        'critical': True
    },
    'router': {
        'url': 'https://router.candlefish.ai/health',
        'expected_status': 200, 
        'timeout': 15,
        'critical': True
    },
    'monitor': {
        'url': 'https://monitor.candlefish.ai/health',
        'expected_status': 200,
        'timeout': 10,
        'critical': False
    },
    'config': {
        'url': 'https://config.candlefish.ai/health',
        'expected_status': 200,
        'timeout': 10,
        'critical': False
    }
}

ALERT_CONFIG = {
    'smtp_server': 'smtp.gmail.com',
    'smtp_port': 587,
    'username': 'alerts@candlefish.ai',
    'password': '',  # Set via environment variable
    'recipients': ['admin@candlefish.ai', 'devops@candlefish.ai'],
    'failure_threshold': 3,
    'recovery_notification': True
}

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/health-monitor.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

class HealthMonitor:
    def __init__(self):
        self.failure_counts = {service: 0 for service in SERVICES}
        self.last_alert_sent = {service: 0 for service in SERVICES}
        self.service_status = {service: True for service in SERVICES}
        
    async def check_service(self, session: aiohttp.ClientSession, 
                          service_name: str, config: Dict) -> Dict:
        """Check health of a single service"""
        start_time = time.time()
        
        try:
            async with session.get(
                config['url'], 
                timeout=aiohttp.ClientTimeout(total=config['timeout'])
            ) as response:
                response_time = (time.time() - start_time) * 1000
                content = await response.text()
                
                result = {
                    'service': service_name,
                    'url': config['url'],
                    'status_code': response.status,
                    'response_time': round(response_time, 2),
                    'healthy': response.status == config['expected_status'],
                    'timestamp': datetime.utcnow().isoformat(),
                    'content': content[:500] if len(content) > 500 else content
                }
                
                if result['healthy']:
                    logger.info(f"✓ {service_name}: OK ({response_time:.0f}ms)")
                else:
                    logger.warning(f"✗ {service_name}: Status {response.status} ({response_time:.0f}ms)")
                    
                return result
                
        except asyncio.TimeoutError:
            logger.error(f"✗ {service_name}: Timeout after {config['timeout']}s")
            return {
                'service': service_name,
                'url': config['url'], 
                'status_code': 0,
                'response_time': config['timeout'] * 1000,
                'healthy': False,
                'error': 'Timeout',
                'timestamp': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"✗ {service_name}: {str(e)}")
            return {
                'service': service_name,
                'url': config['url'],
                'status_code': 0, 
                'response_time': (time.time() - start_time) * 1000,
                'healthy': False,
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }
    
    async def check_all_services(self) -> List[Dict]:
        """Check health of all services concurrently"""
        async with aiohttp.ClientSession() as session:
            tasks = [
                self.check_service(session, service, config)
                for service, config in SERVICES.items()
            ]
            return await asyncio.gather(*tasks)
    
    def update_failure_counts(self, results: List[Dict]):
        """Update failure counts and trigger alerts if needed"""
        for result in results:
            service = result['service']
            
            if result['healthy']:
                # Service recovered
                if self.failure_counts[service] > 0:
                    logger.info(f"✓ {service} recovered after {self.failure_counts[service]} failures")
                    if ALERT_CONFIG['recovery_notification'] and not self.service_status[service]:
                        self.send_recovery_alert(service, result)
                
                self.failure_counts[service] = 0
                self.service_status[service] = True
                
            else:
                # Service failed
                self.failure_counts[service] += 1
                current_time = time.time()
                
                # Send alert if threshold reached and enough time passed since last alert
                if (self.failure_counts[service] >= ALERT_CONFIG['failure_threshold'] and 
                    current_time - self.last_alert_sent[service] > 3600):  # 1 hour cooldown
                    
                    self.send_failure_alert(service, result, self.failure_counts[service])
                    self.last_alert_sent[service] = current_time
                    self.service_status[service] = False
    
    def send_failure_alert(self, service: str, result: Dict, failure_count: int):
        """Send failure alert email"""
        if not ALERT_CONFIG['password']:
            logger.warning("SMTP password not configured, skipping email alert")
            return
            
        try:
            subject = f"🚨 Service Alert: {service}.candlefish.ai is DOWN"
            
            body = f"""
Service Health Alert - FAILURE

Service: {service}.candlefish.ai
Status: DOWN
Failure Count: {failure_count}
URL: {result['url']}
Status Code: {result.get('status_code', 'N/A')}
Error: {result.get('error', 'Unknown')}
Response Time: {result.get('response_time', 'N/A')}ms
Timestamp: {result['timestamp']}

Please investigate immediately.

---
Candlefish AI Health Monitor
"""
            
            self.send_email(subject, body)
            logger.error(f"Alert sent for {service} failure")
            
        except Exception as e:
            logger.error(f"Failed to send failure alert: {e}")
    
    def send_recovery_alert(self, service: str, result: Dict):
        """Send recovery alert email"""
        try:
            subject = f"✅ Service Recovery: {service}.candlefish.ai is UP"
            
            body = f"""
Service Health Alert - RECOVERY

Service: {service}.candlefish.ai
Status: UP
URL: {result['url']}
Status Code: {result['status_code']}
Response Time: {result['response_time']}ms
Timestamp: {result['timestamp']}

Service has recovered successfully.

---
Candlefish AI Health Monitor
"""
            
            self.send_email(subject, body)
            logger.info(f"Recovery alert sent for {service}")
            
        except Exception as e:
            logger.error(f"Failed to send recovery alert: {e}")
    
    def send_email(self, subject: str, body: str):
        """Send email notification"""
        msg = MimeMultipart()
        msg['From'] = ALERT_CONFIG['username']
        msg['To'] = ', '.join(ALERT_CONFIG['recipients'])
        msg['Subject'] = subject
        
        msg.attach(MimeText(body, 'plain'))
        
        server = smtplib.SMTP(ALERT_CONFIG['smtp_server'], ALERT_CONFIG['smtp_port'])
        server.starttls()
        server.login(ALERT_CONFIG['username'], ALERT_CONFIG['password'])
        text = msg.as_string()
        server.sendmail(ALERT_CONFIG['username'], ALERT_CONFIG['recipients'], text)
        server.quit()
    
    def generate_status_report(self, results: List[Dict]) -> Dict:
        """Generate comprehensive status report"""
        healthy_count = sum(1 for r in results if r['healthy'])
        total_count = len(results)
        
        return {
            'timestamp': datetime.utcnow().isoformat(),
            'overall_health': healthy_count == total_count,
            'healthy_services': healthy_count,
            'total_services': total_count,
            'services': results,
            'failure_counts': dict(self.failure_counts)
        }
    
    async def run_check(self) -> Dict:
        """Run a single health check cycle"""
        logger.info("Starting health check cycle...")
        
        results = await self.check_all_services()
        self.update_failure_counts(results)
        report = self.generate_status_report(results)
        
        # Log summary
        healthy = report['healthy_services']
        total = report['total_services']
        logger.info(f"Health check complete: {healthy}/{total} services healthy")
        
        return report

async def main():
    """Main monitoring loop"""
    monitor = HealthMonitor()
    
    while True:
        try:
            report = await monitor.run_check()
            
            # Save status report
            with open('/var/log/health-status.json', 'w') as f:
                json.dump(report, f, indent=2)
                
            # Wait before next check (5 minutes)
            await asyncio.sleep(300)
            
        except Exception as e:
            logger.error(f"Error in monitoring loop: {e}")
            await asyncio.sleep(60)  # Wait 1 minute on error

if __name__ == "__main__":
    asyncio.run(main())