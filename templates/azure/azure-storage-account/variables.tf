variable "resource_group_name" {
  description = "Name of the resource group to create"
  type        = string
}

variable "location" {
  description = "Azure region for all resources"
  type        = string
  default     = "eastus2"
}

variable "storage_account_name" {
  description = "Name of the storage account (must be globally unique, 3-24 chars, lowercase alphanumeric)"
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9]{3,24}$", var.storage_account_name))
    error_message = "storage_account_name must be 3-24 characters, lowercase letters and numbers only."
  }
}

variable "account_tier" {
  description = "Performance tier (Standard or Premium)"
  type        = string
  default     = "Standard"

  validation {
    condition     = contains(["Standard", "Premium"], var.account_tier)
    error_message = "account_tier must be Standard or Premium."
  }
}

variable "replication_type" {
  description = "Replication type (LRS, GRS, RAGRS, ZRS, GZRS, RAGZRS)"
  type        = string
  default     = "LRS"

  validation {
    condition     = contains(["LRS", "GRS", "RAGRS", "ZRS", "GZRS", "RAGZRS"], var.replication_type)
    error_message = "replication_type must be LRS, GRS, RAGRS, ZRS, GZRS, or RAGZRS."
  }
}

variable "account_kind" {
  description = "Kind of storage account (StorageV2, BlobStorage, Storage)"
  type        = string
  default     = "StorageV2"
}

variable "access_tier" {
  description = "Access tier for blob storage (Hot or Cool)"
  type        = string
  default     = "Hot"

  validation {
    condition     = contains(["Hot", "Cool"], var.access_tier)
    error_message = "access_tier must be Hot or Cool."
  }
}

variable "min_tls_version" {
  description = "Minimum TLS version"
  type        = string
  default     = "TLS1_2"

  validation {
    condition     = contains(["TLS1_0", "TLS1_1", "TLS1_2"], var.min_tls_version)
    error_message = "min_tls_version must be TLS1_0, TLS1_1, or TLS1_2."
  }
}

variable "allow_public_access" {
  description = "Whether to allow public access to blobs"
  type        = bool
  default     = false
}

variable "enable_versioning" {
  description = "Whether to enable blob versioning"
  type        = bool
  default     = true
}

variable "enable_soft_delete" {
  description = "Whether to enable soft delete for blobs and containers"
  type        = bool
  default     = true
}

variable "soft_delete_retention_days" {
  description = "Number of days to retain soft-deleted blobs"
  type        = number
  default     = 7
}

variable "enable_network_rules" {
  description = "Whether to enable network rules"
  type        = bool
  default     = false
}

variable "default_network_action" {
  description = "Default network action (Allow or Deny)"
  type        = string
  default     = "Deny"
}

variable "network_bypass" {
  description = "Services to bypass network rules"
  type        = list(string)
  default     = ["AzureServices"]
}

variable "allowed_ip_ranges" {
  description = "List of IP ranges allowed to access the storage account"
  type        = list(string)
  default     = []
}

variable "allowed_subnet_ids" {
  description = "List of subnet IDs allowed to access the storage account"
  type        = list(string)
  default     = []
}

variable "containers" {
  description = "List of blob containers to create"
  type = list(object({
    name        = string
    access_type = string
  }))
  default = []
}

variable "file_shares" {
  description = "List of file shares to create"
  type = list(object({
    name     = string
    quota_gb = number
  }))
  default = []
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
