MIME-Version: 1.0
Content-Type: multipart/mixed; boundary="==BOUNDARY=="

--==BOUNDARY==
Content-Type: text/x-shellscript; charset="us-ascii"

#!/bin/bash
set -ex

# EKS Bootstrap script for Candlefish nodes
# This script configures EC2 instances to join the EKS cluster

# Log all output
exec > >(tee /var/log/user-data.log)
exec 2>&1

echo "Starting EKS node bootstrap at $(date)"

# Update packages
yum update -y

# Configure docker daemon
cat <<EOF > /etc/docker/daemon.json
{
  "bridge": "none",
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "live-restore": true,
  "max-concurrent-downloads": 10
}
EOF

systemctl restart docker

# Set up kubelet extra args for better performance
cat <<EOF > /etc/sysconfig/kubelet-extra-args
KUBELET_EXTRA_ARGS="--max-pods=110 --cluster-dns=169.254.20.10"
EOF

# Install SSM agent for easier management
yum install -y amazon-ssm-agent
systemctl enable amazon-ssm-agent
systemctl start amazon-ssm-agent

# Install CloudWatch agent for monitoring
wget https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm
rpm -U ./amazon-cloudwatch-agent.rpm

# Configure CloudWatch agent
cat <<EOF > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json
{
  "metrics": {
    "namespace": "CandlefishEKS",
    "metrics_collected": {
      "cpu": {
        "measurement": [
          {"name": "cpu_usage_idle", "rename": "CPU_IDLE", "unit": "Percent"},
          {"name": "cpu_usage_iowait", "rename": "CPU_IOWAIT", "unit": "Percent"}
        ],
        "metrics_collection_interval": 60
      },
      "disk": {
        "measurement": [
          {"name": "used_percent", "rename": "DISK_USED", "unit": "Percent"}
        ],
        "metrics_collection_interval": 60,
        "resources": ["/"]
      },
      "mem": {
        "measurement": [
          {"name": "mem_used_percent", "rename": "MEM_USED", "unit": "Percent"}
        ],
        "metrics_collection_interval": 60
      }
    }
  }
}
EOF

# Start CloudWatch agent
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -s \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json

# Set up log rotation
cat <<EOF > /etc/logrotate.d/kubernetes
/var/log/pods/*/*.log {
    daily
    rotate 5
    compress
    delaycompress
    missingok
    notifempty
    maxage 30
}
EOF

echo "Bootstrap complete at $(date)"
--==BOUNDARY==--
