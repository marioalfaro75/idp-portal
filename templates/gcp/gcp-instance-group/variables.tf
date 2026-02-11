variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "region" {
  description = "The GCP region for resources"
  type        = string
  default     = "us-central1"
}

variable "group_name" {
  description = "Name of the managed instance group"
  type        = string
  default     = "app-mig"
}

variable "machine_type" {
  description = "Machine type for instances"
  type        = string
  default     = "e2-medium"
}

variable "source_image" {
  description = "Source image for the boot disk"
  type        = string
  default     = "debian-cloud/debian-12"
}

variable "disk_size_gb" {
  description = "Size of the boot disk in GB"
  type        = number
  default     = 20
}

variable "disk_type" {
  description = "Type of boot disk (pd-standard, pd-ssd, pd-balanced)"
  type        = string
  default     = "pd-balanced"
}

variable "network" {
  description = "The VPC network to attach instances to"
  type        = string
  default     = "default"
}

variable "subnetwork" {
  description = "The subnetwork to attach instances to"
  type        = string
  default     = "default"
}

variable "assign_public_ip" {
  description = "Whether to assign public IP addresses to instances"
  type        = bool
  default     = false
}

variable "target_size" {
  description = "The initial number of instances in the group"
  type        = number
  default     = 2
}

variable "named_port_name" {
  description = "Name for the named port"
  type        = string
  default     = "http"
}

variable "named_port" {
  description = "Port number for the named port"
  type        = number
  default     = 80
}

variable "health_check_path" {
  description = "HTTP path for the autohealing health check"
  type        = string
  default     = "/healthz"
}

variable "autohealing_initial_delay" {
  description = "Initial delay before autohealing checks start (seconds)"
  type        = number
  default     = 300
}

variable "update_policy_type" {
  description = "Update policy type: PROACTIVE or OPPORTUNISTIC"
  type        = string
  default     = "PROACTIVE"
}

variable "max_surge" {
  description = "Maximum number of instances that can be created above target during updates"
  type        = number
  default     = 1
}

variable "max_unavailable" {
  description = "Maximum number of instances that can be unavailable during updates"
  type        = number
  default     = 0
}

variable "enable_autoscaling" {
  description = "Whether to enable autoscaling"
  type        = bool
  default     = true
}

variable "min_replicas" {
  description = "Minimum number of replicas for autoscaling"
  type        = number
  default     = 2
}

variable "max_replicas" {
  description = "Maximum number of replicas for autoscaling"
  type        = number
  default     = 10
}

variable "cooldown_period" {
  description = "Cooldown period for autoscaler in seconds"
  type        = number
  default     = 60
}

variable "cpu_utilization_target" {
  description = "Target CPU utilization for autoscaling (0.0 to 1.0)"
  type        = number
  default     = 0.6
}

variable "startup_script" {
  description = "Startup script to run on instance boot"
  type        = string
  default     = null
}

variable "service_account_email" {
  description = "Service account email for instances"
  type        = string
  default     = null
}

variable "service_account_scopes" {
  description = "OAuth scopes for the service account"
  type        = list(string)
  default     = ["cloud-platform"]
}

variable "network_tags" {
  description = "Network tags for the instances"
  type        = list(string)
  default     = ["http-server"]
}

variable "labels" {
  description = "Labels to apply to instances"
  type        = map(string)
  default     = {}
}

variable "metadata" {
  description = "Additional metadata key-value pairs"
  type        = map(string)
  default     = {}
}

variable "enable_oslogin" {
  description = "Whether to enable OS Login on instances"
  type        = bool
  default     = true
}
