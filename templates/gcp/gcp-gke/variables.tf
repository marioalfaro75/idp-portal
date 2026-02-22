variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "region" {
  description = "The GCP region for the cluster"
  type        = string
  default     = "us-central1"
}

variable "cluster_name" {
  description = "Name of the GKE cluster"
  type        = string
  default     = "primary-cluster"
}

variable "regional_cluster" {
  description = "Whether to create a regional (multi-zone) or zonal cluster"
  type        = bool
  default     = true
}

variable "network" {
  description = "The VPC network for the cluster"
  type        = string
  default     = "default"
}

variable "subnetwork" {
  description = "The subnetwork for the cluster"
  type        = string
  default     = "default"
}

variable "pods_range_name" {
  description = "Name of the secondary range for pods"
  type        = string
  default     = null
}

variable "services_range_name" {
  description = "Name of the secondary range for services"
  type        = string
  default     = null
}

variable "enable_private_nodes" {
  description = "Whether nodes have internal IP addresses only"
  type        = bool
  default     = true
}

variable "enable_private_endpoint" {
  description = "Whether the master endpoint is accessible only from internal IPs"
  type        = bool
  default     = false
}

variable "master_ipv4_cidr_block" {
  description = "CIDR block for the master network (must be /28)"
  type        = string
  default     = "172.16.0.0/28"

  validation {
    condition     = can(cidrhost(var.master_ipv4_cidr_block, 0)) && tonumber(split("/", var.master_ipv4_cidr_block)[1]) == 28
    error_message = "master_ipv4_cidr_block must be a valid /28 CIDR block."
  }
}

variable "release_channel" {
  description = "Release channel for GKE version updates (RAPID, REGULAR, STABLE)"
  type        = string
  default     = "REGULAR"

  validation {
    condition     = contains(["RAPID", "REGULAR", "STABLE"], var.release_channel)
    error_message = "Release channel must be RAPID, REGULAR, or STABLE."
  }
}

variable "enable_http_load_balancing" {
  description = "Whether to enable the HTTP Load Balancing addon"
  type        = bool
  default     = true
}

variable "enable_hpa" {
  description = "Whether to enable Horizontal Pod Autoscaling"
  type        = bool
  default     = true
}

variable "enable_network_policy" {
  description = "Whether to enable network policy enforcement"
  type        = bool
  default     = true
}

variable "enable_managed_prometheus" {
  description = "Whether to enable Google Cloud Managed Prometheus"
  type        = bool
  default     = true
}

variable "node_pool_name" {
  description = "Name of the default node pool"
  type        = string
  default     = "default-pool"
}

variable "node_count" {
  description = "Number of nodes per zone (when autoscaling is disabled)"
  type        = number
  default     = 1
}

variable "enable_node_autoscaling" {
  description = "Whether to enable node autoscaling"
  type        = bool
  default     = true
}

variable "node_min_count" {
  description = "Minimum number of nodes per zone"
  type        = number
  default     = 1
}

variable "node_max_count" {
  description = "Maximum number of nodes per zone"
  type        = number
  default     = 5
}

variable "node_machine_type" {
  description = "Machine type for GKE nodes"
  type        = string
  default     = "e2-standard-4"
}

variable "node_disk_size_gb" {
  description = "Disk size for GKE nodes in GB"
  type        = number
  default     = 50
}

variable "node_disk_type" {
  description = "Disk type for GKE nodes"
  type        = string
  default     = "pd-balanced"

  validation {
    condition     = contains(["pd-standard", "pd-ssd", "pd-balanced"], var.node_disk_type)
    error_message = "node_disk_type must be pd-standard, pd-ssd, or pd-balanced."
  }
}

variable "node_service_account" {
  description = "Service account email for GKE nodes"
  type        = string
  default     = null
}

variable "node_labels" {
  description = "Labels to apply to GKE nodes"
  type        = map(string)
  default     = {}
}

variable "node_tags" {
  description = "Network tags for GKE nodes"
  type        = list(string)
  default     = ["gke-node"]
}

variable "labels" {
  description = "Resource labels for the cluster"
  type        = map(string)
  default     = {}
}
