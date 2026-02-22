variable "resource_group_name" {
  type        = string
  description = "Resource group name"
}

variable "location" {
  type        = string
  description = "Azure region"
  default     = "eastus"
}

variable "container_group_name" {
  type        = string
  description = "Container group name"
}

variable "container_name" {
  type        = string
  description = "Container name"
}

variable "container_image" {
  type        = string
  description = "Container image to deploy"
}

variable "cpu" {
  type        = number
  description = "CPU cores"
  default     = 1
}

variable "memory" {
  type        = number
  description = "Memory in GB"
  default     = 1.5
}

variable "container_port" {
  type        = number
  description = "Container port to expose"
  default     = 80
}

variable "ip_address_type" {
  type        = string
  description = "IP address type (Public or Private)"
  default     = "Public"
}

variable "dns_name_label" {
  type        = string
  description = "DNS name label for public IP"
  default     = ""
}

variable "environment" {
  type        = string
  description = "Environment name"
  default     = "dev"
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}
