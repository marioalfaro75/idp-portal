variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "region" {
  description = "The GCP region for resources"
  type        = string
  default     = "us-central1"
}

variable "network_name" {
  description = "Name of the VPC network"
  type        = string
  default     = "main-vpc"
}

variable "network_description" {
  description = "Description of the VPC network"
  type        = string
  default     = "Managed VPC network"
}

variable "routing_mode" {
  description = "The network routing mode (REGIONAL or GLOBAL)"
  type        = string
  default     = "GLOBAL"

  validation {
    condition     = contains(["REGIONAL", "GLOBAL"], var.routing_mode)
    error_message = "Routing mode must be REGIONAL or GLOBAL."
  }
}

variable "subnets" {
  description = "List of subnets to create"
  type = list(object({
    name                     = string
    cidr                     = string
    region                   = optional(string)
    private_ip_google_access = optional(bool, true)
    secondary_ranges = optional(list(object({
      range_name    = string
      ip_cidr_range = string
    })), [])
  }))
  default = [
    {
      name = "subnet-01"
      cidr = "10.0.1.0/24"
    },
    {
      name = "subnet-02"
      cidr = "10.0.2.0/24"
    }
  ]
}

variable "create_nat_gateway" {
  description = "Whether to create a Cloud NAT gateway"
  type        = bool
  default     = true
}

variable "labels" {
  description = "Labels to apply to all resources"
  type        = map(string)
  default     = {}
}
