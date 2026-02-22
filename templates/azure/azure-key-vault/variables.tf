variable "resource_group_name" {
  description = "Name of the resource group to create"
  type        = string
}

variable "location" {
  description = "Azure region for all resources"
  type        = string
  default     = "eastus2"
}

variable "key_vault_name" {
  description = "Name of the Key Vault (must be globally unique)"
  type        = string

  validation {
    condition     = can(regex("^[a-zA-Z][a-zA-Z0-9-]{1,22}[a-zA-Z0-9]$", var.key_vault_name))
    error_message = "key_vault_name must be 3-24 characters, start with a letter, and contain only alphanumeric characters and hyphens."
  }
}

variable "sku_name" {
  description = "SKU name for the Key Vault (standard or premium)"
  type        = string
  default     = "standard"

  validation {
    condition     = contains(["standard", "premium"], var.sku_name)
    error_message = "sku_name must be standard or premium."
  }
}

variable "soft_delete_retention_days" {
  description = "Number of days to retain soft-deleted vaults"
  type        = number
  default     = 90

  validation {
    condition     = var.soft_delete_retention_days >= 7 && var.soft_delete_retention_days <= 90
    error_message = "soft_delete_retention_days must be between 7 and 90."
  }
}

variable "purge_protection_enabled" {
  description = "Whether to enable purge protection"
  type        = bool
  default     = true
}

variable "purge_on_destroy" {
  description = "Whether to purge the Key Vault on destroy"
  type        = bool
  default     = false
}

variable "enable_rbac_authorization" {
  description = "Whether to use RBAC authorization instead of access policies"
  type        = bool
  default     = false
}

variable "enabled_for_deployment" {
  description = "Whether Azure VMs can retrieve certificates from the vault"
  type        = bool
  default     = false
}

variable "enabled_for_disk_encryption" {
  description = "Whether Azure Disk Encryption can retrieve secrets from the vault"
  type        = bool
  default     = false
}

variable "enable_network_acls" {
  description = "Whether to enable network ACLs"
  type        = bool
  default     = false
}

variable "network_default_action" {
  description = "Default action for network ACLs (Allow or Deny)"
  type        = string
  default     = "Deny"
}

variable "network_bypass" {
  description = "Services to bypass network ACLs"
  type        = string
  default     = "AzureServices"
}

variable "allowed_ip_ranges" {
  description = "List of IP ranges allowed to access the Key Vault"
  type        = list(string)
  default     = []
}

variable "allowed_subnet_ids" {
  description = "List of subnet IDs allowed to access the Key Vault"
  type        = list(string)
  default     = []
}

variable "access_policies" {
  description = "List of access policies to apply (used when RBAC is disabled)"
  type = list(object({
    object_id               = string
    key_permissions         = list(string)
    secret_permissions      = list(string)
    certificate_permissions = list(string)
  }))
  default = []
}

variable "secrets" {
  description = "Map of secret names to values to store in the Key Vault"
  type        = map(string)
  default     = {}
  sensitive   = true
}

variable "lock" {
  description = "Resource lock configuration (CanNotDelete or ReadOnly)"
  type = object({
    kind = string
    name = optional(string, null)
  })
  default = null

  validation {
    condition     = var.lock == null || contains(["CanNotDelete", "ReadOnly"], var.lock.kind)
    error_message = "lock.kind must be CanNotDelete or ReadOnly."
  }
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}
