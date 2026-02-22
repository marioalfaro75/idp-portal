variable "resource_group_name" {
  description = "Name of the resource group to create"
  type        = string
}

variable "location" {
  description = "Azure region for all resources"
  type        = string
  default     = "eastus2"
}

variable "cluster_name" {
  description = "Name of the AKS cluster"
  type        = string
}

variable "dns_prefix" {
  description = "DNS prefix for the AKS cluster"
  type        = string
}

variable "kubernetes_version" {
  description = "Kubernetes version for the cluster"
  type        = string
  default     = null
}

variable "sku_tier" {
  description = "SKU tier for the AKS cluster (Free or Standard)"
  type        = string
  default     = "Free"

  validation {
    condition     = contains(["Free", "Standard", "Premium"], var.sku_tier)
    error_message = "sku_tier must be Free, Standard, or Premium."
  }
}

variable "default_node_count" {
  description = "Initial number of nodes in the default node pool"
  type        = number
  default     = 3
}

variable "default_node_vm_size" {
  description = "VM size for the default node pool"
  type        = string
  default     = "Standard_D2s_v3"
}

variable "os_disk_size_gb" {
  description = "OS disk size in GB for cluster nodes"
  type        = number
  default     = 50
}

variable "subnet_id" {
  description = "ID of the subnet for the default node pool"
  type        = string
  default     = null
}

variable "enable_auto_scaling" {
  description = "Whether to enable auto-scaling for the default node pool"
  type        = bool
  default     = true
}

variable "min_node_count" {
  description = "Minimum number of nodes when auto-scaling is enabled"
  type        = number
  default     = 1
}

variable "max_node_count" {
  description = "Maximum number of nodes when auto-scaling is enabled"
  type        = number
  default     = 5
}

variable "max_pods" {
  description = "Maximum number of pods per node"
  type        = number
  default     = 110
}

variable "network_plugin" {
  description = "Network plugin for the AKS cluster (azure or kubenet)"
  type        = string
  default     = "azure"

  validation {
    condition     = contains(["azure", "kubenet", "none"], var.network_plugin)
    error_message = "network_plugin must be azure, kubenet, or none."
  }
}

variable "network_policy" {
  description = "Network policy for the AKS cluster (azure or calico)"
  type        = string
  default     = "azure"

  validation {
    condition     = contains(["calico", "azure", "cilium"], var.network_policy)
    error_message = "network_policy must be calico, azure, or cilium."
  }
}

variable "service_cidr" {
  description = "Service CIDR for Kubernetes services"
  type        = string
  default     = "10.0.0.0/16"

  validation {
    condition     = can(cidrhost(var.service_cidr, 0))
    error_message = "service_cidr must be a valid CIDR block."
  }
}

variable "dns_service_ip" {
  description = "DNS service IP within the service CIDR"
  type        = string
  default     = "10.0.0.10"
}

variable "log_analytics_workspace_id" {
  description = "ID of the Log Analytics workspace for monitoring"
  type        = string
  default     = null
}

variable "azure_rbac_enabled" {
  description = "Whether to enable Azure RBAC for Kubernetes authorization"
  type        = bool
  default     = true
}

variable "admin_group_object_ids" {
  description = "List of Azure AD group object IDs for cluster admin access"
  type        = list(string)
  default     = []
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
