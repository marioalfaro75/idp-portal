variable "region" {
  type        = string
  description = "AWS region"
  default     = "us-east-1"
}

variable "service_name" {
  type        = string
  description = "ECS service name"
}

variable "container_image" {
  type        = string
  description = "Docker image for the container"
}

variable "container_port" {
  type        = number
  description = "Container port"
  default     = 80
}

variable "cpu" {
  type        = string
  description = "Task CPU units"
  default     = "256"
}

variable "memory" {
  type        = string
  description = "Task memory in MB"
  default     = "512"
}

variable "desired_count" {
  type        = number
  description = "Desired number of tasks"
  default     = 2
}

variable "vpc_id" {
  type        = string
  description = "VPC ID"
}

variable "subnet_ids" {
  type        = list(string)
  description = "Subnet IDs for the service"
}

variable "allowed_security_group_ids" {
  type        = list(string)
  description = "Security group IDs allowed to access the ECS service"
  default     = []
}

variable "assign_public_ip" {
  type        = bool
  description = "Assign public IP to ECS tasks"
  default     = false
}

variable "kms_key_id" {
  type        = string
  description = "KMS key ID for ECS cluster managed storage encryption"
  default     = null
}

variable "tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}
