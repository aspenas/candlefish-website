variable "name" {
  description = "Name to be used on all the resources"
  type        = string
}

variable "cidr" {
  description = "The CIDR block for the VPC"
  type        = string
}

variable "availability_zones" {
  description = "A list of availability zones names or ids in the region"
  type        = list(string)
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "tags" {
  description = "A map of tags to assign to the resource"
  type        = map(string)
  default     = {}
}
