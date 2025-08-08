variable "aws_region" {
  type        = string
  description = "AWS region"
  default     = "us-west-2"
}

variable "project" {
  type        = string
  description = "Project name"
  default     = "candlefish-rtpm"
}

variable "domain" {
  type        = string
  description = "Root domain"
  default     = "candlefish.ai"
}
