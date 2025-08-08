# RTPM Secrets Bootstrap (Terraform)

This module seeds AWS Secrets Manager and SSM Parameter Store for runtime configuration.

## Usage

1. Copy `inputs.auto.tfvars.example` to `inputs.auto.tfvars` and set values (or use environment variables/TF Cloud).
2. Initialize and apply:


cd deployment/terraform/rtpm
terraform init
terraform apply -auto-approve


The workflow `deploy-rtpm.yml` reads SSM parameters and sets Fly.io app secrets at deploy time via GitHub OIDC.
