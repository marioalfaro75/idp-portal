variable "resource_group_name" {
  description = "Name of the resource group to create"
  type        = string
}

variable "location" {
  description = "Azure region for all resources"
  type        = string
  default     = "eastus2"
}

variable "vnet_name" {
  description = "Name of the virtual network"
  type        = string
}

variable "address_space" {
  description = "Address space for the virtual network"
  type        = list(string)
  default     = ["10.0.0.0/16"]

  validation {
    condition     = alltrue([for cidr in var.address_space : can(cidrhost(cidr, 0))])
    error_message = "All address_space entries must be valid CIDR blocks."
  }
}

variable "dns_servers" {
  description = "Custom DNS servers for the virtual network"
  type        = list(string)
  default     = []
}

variable "subnets" {
  description = "List of subnet configurations"
  type = list(object({
    name             = string
    address_prefixes = list(string)
    delegation = optional(object({
      name         = string
      service_name = string
      actions      = list(string)
    }))
  }))
  default = [
    {
      name             = "default"
      address_prefixes = ["10.0.1.0/24"]
      delegation       = null
    },
    {
      name             = "application"
      address_prefixes = ["10.0.2.0/24"]
      delegation       = null
    }
  ]
}

variable "create_default_nsg" {
  description = "Whether to create a default network security group"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}
