#!/usr/bin/env python3
"""
Service integrations for Candlefish Workspace Manager
"""

import os
import json
import boto3
import subprocess
from typing import Dict, Any
import requests
from github import Github
import structlog

logger = structlog.get_logger()


class GitHubIntegration:
    """GitHub Actions and repository management"""

    def __init__(self):
        self.token = os.environ.get("GITHUB_TOKEN")
        self.org = "aspenas"  # Candlefish GitHub org
        self.repo = "candlefish-ai"
        self.client = Github(self.token) if self.token else None

    def trigger_workflow(self, workflow_name: str, branch: str = "main") -> str:
        """Trigger a GitHub Actions workflow"""
        try:
            repo = self.client.get_repo(f"{self.org}/{self.repo}")
            workflow = repo.get_workflow(workflow_name)
            workflow.create_dispatch(branch)
            return f"Workflow {workflow_name} triggered on {branch}"
        except Exception as e:
            logger.error("GitHub workflow trigger failed", error=str(e))
            raise

    def get_workflow_status(self, workflow_name: str) -> Dict[str, Any]:
        """Get workflow run status"""
        try:
            repo = self.client.get_repo(f"{self.org}/{self.repo}")
            workflow = repo.get_workflow(workflow_name)
            runs = workflow.get_runs()

            if runs.totalCount > 0:
                latest_run = runs[0]
                return {
                    "status": latest_run.status,
                    "conclusion": latest_run.conclusion,
                    "created_at": latest_run.created_at.isoformat(),
                    "url": latest_run.html_url,
                }
            return {"status": "no runs found"}
        except Exception as e:
            logger.error("GitHub status check failed", error=str(e))
            raise

    def test_connection(self) -> bool:
        """Test GitHub connection"""
        try:
            if self.client:
                user = self.client.get_user()
                return True
        except:
            return False


class AWSIntegration:
    """AWS resource management"""

    def __init__(self):
        self.region = "us-west-2"
        self.clients = {}

    def _get_client(self, service: str):
        """Get or create AWS client for service"""
        if service not in self.clients:
            self.clients[service] = boto3.client(service, region_name=self.region)
        return self.clients[service]

    def manage_resource(self, resource_type: str, action: str) -> Dict[str, Any]:
        """Manage AWS resources"""
        try:
            if resource_type == "ec2":
                return self._manage_ec2(action)
            elif resource_type == "s3":
                return self._manage_s3(action)
            elif resource_type == "lambda":
                return self._manage_lambda(action)
            elif resource_type == "rds":
                return self._manage_rds(action)
            elif resource_type == "eks":
                return self._manage_eks(action)
            else:
                raise ValueError(f"Unknown resource type: {resource_type}")
        except Exception as e:
            logger.error(
                "AWS operation failed", resource=resource_type, action=action, error=str(e)
            )
            raise

    def _manage_ec2(self, action: str) -> Dict[str, Any]:
        """Manage EC2 instances"""
        ec2 = self._get_client("ec2")

        if action == "list":
            response = ec2.describe_instances()
            instances = []
            for reservation in response["Reservations"]:
                for instance in reservation["Instances"]:
                    instances.append(
                        {
                            "id": instance["InstanceId"],
                            "state": instance["State"]["Name"],
                            "type": instance["InstanceType"],
                        }
                    )
            return {"instances": instances}

        return {"action": action, "status": "completed"}

    def _manage_s3(self, action: str) -> Dict[str, Any]:
        """Manage S3 buckets"""
        s3 = self._get_client("s3")

        if action == "list":
            response = s3.list_buckets()
            buckets = [b["Name"] for b in response["Buckets"]]
            return {"buckets": buckets}

        return {"action": action, "status": "completed"}

    def _manage_lambda(self, action: str) -> Dict[str, Any]:
        """Manage Lambda functions"""
        lambda_client = self._get_client("lambda")

        if action == "list":
            response = lambda_client.list_functions()
            functions = [f["FunctionName"] for f in response["Functions"]]
            return {"functions": functions}

        return {"action": action, "status": "completed"}

    def _manage_rds(self, action: str) -> Dict[str, Any]:
        """Manage RDS databases"""
        rds = self._get_client("rds")

        if action == "list":
            response = rds.describe_db_instances()
            databases = [db["DBInstanceIdentifier"] for db in response["DBInstances"]]
            return {"databases": databases}

        return {"action": action, "status": "completed"}

    def _manage_eks(self, action: str) -> Dict[str, Any]:
        """Manage EKS clusters"""
        eks = self._get_client("eks")

        if action == "list":
            response = eks.list_clusters()
            return {"clusters": response["clusters"]}

        return {"action": action, "status": "completed"}

    def test_connection(self) -> bool:
        """Test AWS connection"""
        try:
            sts = self._get_client("sts")
            sts.get_caller_identity()
            return True
        except:
            return False


class VercelIntegration:
    """Vercel deployment management"""

    def __init__(self):
        self.token = os.environ.get("VERCEL_TOKEN")
        self.api_url = "https://api.vercel.com"

    def deploy(self, project: str, branch: str = "main") -> str:
        """Trigger Vercel deployment"""
        if not self.token:
            raise ValueError("Vercel token not configured")

        headers = {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}

        # Trigger deployment
        url = f"{self.api_url}/v13/deployments"
        data = {"name": project, "gitSource": {"ref": branch, "type": "github"}}

        response = requests.post(url, headers=headers, json=data)
        if response.status_code == 200:
            return f"Deployment triggered for {project}"
        else:
            raise Exception(f"Vercel deployment failed: {response.text}")

    def get_status(self, project: str) -> Dict[str, Any]:
        """Get deployment status"""
        if not self.token:
            return {"status": "token not configured"}

        headers = {"Authorization": f"Bearer {self.token}"}
        url = f"{self.api_url}/v9/projects/{project}/deployments"

        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            deployments = response.json().get("deployments", [])
            if deployments:
                latest = deployments[0]
                return {
                    "state": latest["state"],
                    "url": latest["url"],
                    "created": latest["created"],
                }

        return {"status": "unknown"}

    def test_connection(self) -> bool:
        """Test Vercel connection"""
        if not self.token:
            return False

        headers = {"Authorization": f"Bearer {self.token}"}
        response = requests.get(f"{self.api_url}/v2/user", headers=headers)
        return response.status_code == 200


class NetlifyIntegration:
    """Netlify deployment management"""

    def __init__(self):
        self.token = os.environ.get("NETLIFY_TOKEN")
        self.api_url = "https://api.netlify.com/api/v1"

    def deploy(self, site_id: str, branch: str = "main") -> str:
        """Trigger Netlify deployment"""
        if not self.token:
            raise ValueError("Netlify token not configured")

        headers = {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}

        url = f"{self.api_url}/sites/{site_id}/builds"
        data = {"clear_cache": False}

        response = requests.post(url, headers=headers, json=data)
        if response.status_code in [200, 201]:
            return f"Build triggered for site {site_id}"
        else:
            raise Exception(f"Netlify deployment failed: {response.text}")

    def get_status(self, site_id: str) -> Dict[str, Any]:
        """Get site status"""
        if not self.token:
            return {"status": "token not configured"}

        headers = {"Authorization": f"Bearer {self.token}"}
        url = f"{self.api_url}/sites/{site_id}"

        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            site = response.json()
            return {
                "state": site.get("state", "unknown"),
                "url": site.get("url"),
                "updated": site.get("updated_at"),
            }

        return {"status": "unknown"}

    def test_connection(self) -> bool:
        """Test Netlify connection"""
        if not self.token:
            return False

        headers = {"Authorization": f"Bearer {self.token}"}
        response = requests.get(f"{self.api_url}/user", headers=headers)
        return response.status_code == 200


class FlyIntegration:
    """Fly.io deployment management"""

    def __init__(self):
        self.token = os.environ.get("FLY_API_TOKEN")
        self.api_url = "https://api.fly.io/graphql"

    def deploy(self, app_name: str) -> str:
        """Deploy to Fly.io"""
        try:
            # Use flyctl CLI for deployment
            result = subprocess.run(
                ["flyctl", "deploy", "--app", app_name, "--now"],
                capture_output=True,
                text=True,
                check=True,
            )
            return f"Deployed {app_name} to Fly.io"
        except subprocess.CalledProcessError as e:
            raise Exception(f"Fly.io deployment failed: {e.stderr}")

    def get_status(self, app_name: str) -> Dict[str, Any]:
        """Get app status"""
        try:
            result = subprocess.run(
                ["flyctl", "status", "--app", app_name, "--json"],
                capture_output=True,
                text=True,
                check=True,
            )
            return json.loads(result.stdout)
        except subprocess.CalledProcessError:
            return {"status": "unknown"}

    def scale(self, app_name: str, count: int) -> str:
        """Scale app instances"""
        try:
            result = subprocess.run(
                ["flyctl", "scale", "count", str(count), "--app", app_name],
                capture_output=True,
                text=True,
                check=True,
            )
            return f"Scaled {app_name} to {count} instances"
        except subprocess.CalledProcessError as e:
            raise Exception(f"Scaling failed: {e.stderr}")

    def test_connection(self) -> bool:
        """Test Fly.io connection"""
        try:
            result = subprocess.run(
                ["flyctl", "auth", "whoami"], capture_output=True, text=True, check=True
            )
            return True
        except:
            return False


class CandlefishServices:
    """Candlefish service management"""

    SERVICE_MAP = {
        "paintbox": {
            "repo": "candlefish-paintbox",
            "deploy_cmd": "npm run deploy:prod",
            "health_url": "https://paintbox.candlefish.ai/health",
        },
        "fogg": {
            "repo": "candlefish-fogg-calendar",
            "deploy_cmd": "npm run deploy:prod",
            "health_url": "https://fogg.candlefish.ai/health",
        },
        "promoteros": {
            "repo": "candlefish-promoteros",
            "deploy_cmd": "npm run deploy:prod",
            "health_url": "https://promoteros.candlefish.ai/health",
        },
        "brewkit": {
            "repo": "candlefish-brewkit",
            "deploy_cmd": "npm run deploy:prod",
            "health_url": "https://brewkit.candlefish.ai/health",
        },
        "crown": {
            "repo": "candlefish-crown-trophy",
            "deploy_cmd": "npm run deploy:prod",
            "health_url": "https://crown.candlefish.ai/health",
        },
        "bart": {
            "repo": "candlefish-bart",
            "deploy_cmd": "npm run deploy:prod",
            "health_url": "https://bart.candlefish.ai/health",
        },
        "excel": {
            "repo": "candlefish-excel-tools",
            "deploy_cmd": "npm run deploy:prod",
            "health_url": "https://excel.candlefish.ai/health",
        },
    }

    def deploy(self, service: str, environment: str) -> str:
        """Deploy a Candlefish service"""
        if service not in self.SERVICE_MAP:
            raise ValueError(f"Unknown service: {service}")

        service_config = self.SERVICE_MAP[service]

        # Trigger deployment via GitHub Actions or direct command
        logger.info(f"Deploying {service} to {environment}")

        # Here you would trigger the actual deployment
        # This is a placeholder for the deployment logic
        return f"Deployment initiated for {service} to {environment}"

    def get_status(self, service: str) -> Dict[str, Any]:
        """Get service health status"""
        if service not in self.SERVICE_MAP:
            raise ValueError(f"Unknown service: {service}")

        health_url = self.SERVICE_MAP[service]["health_url"]

        try:
            response = requests.get(health_url, timeout=5)
            if response.status_code == 200:
                return {
                    "status": "healthy",
                    "url": health_url,
                    "response_time": response.elapsed.total_seconds(),
                }
            else:
                return {"status": "unhealthy", "status_code": response.status_code}
        except requests.RequestException as e:
            return {"status": "error", "error": str(e)}

    def list_services(self) -> list:
        """List all available services"""
        return list(self.SERVICE_MAP.keys())
