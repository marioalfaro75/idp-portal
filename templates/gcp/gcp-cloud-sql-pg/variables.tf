variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "region" {
  description = "The GCP region for resources"
  type        = string
  default     = "us-central1"
}

variable "instance_name" {
  description = "Name of the Cloud SQL instance"
  type        = string
  default     = "postgres-main"
}

variable "database_version" {
  description = "PostgreSQL version (POSTGRES_14, POSTGRES_15, POSTGRES_16)"
  type        = string
  default     = "POSTGRES_16"
}

variable "tier" {
  description = "Machine tier for the Cloud SQL instance"
  type        = string
  default     = "db-custom-2-8192"
}

variable "availability_type" {
  description = "Availability type: REGIONAL for HA, ZONAL for single zone"
  type        = string
  default     = "REGIONAL"
}

variable "disk_size_gb" {
  description = "Initial disk size in GB"
  type        = number
  default     = 20
}

variable "disk_type" {
  description = "Disk type: PD_SSD or PD_HDD"
  type        = string
  default     = "PD_SSD"
}

variable "disk_autoresize" {
  description = "Whether the disk should automatically grow"
  type        = bool
  default     = true
}

variable "database_name" {
  description = "Name of the default database to create"
  type        = string
  default     = "app"
}

variable "db_user" {
  description = "Name of the default database user"
  type        = string
  default     = "app_user"
}

variable "deletion_protection" {
  description = "Whether to enable deletion protection"
  type        = bool
  default     = true
}

variable "enable_backups" {
  description = "Whether to enable automated backups"
  type        = bool
  default     = true
}

variable "backup_start_time" {
  description = "Preferred backup start time in HH:MM format (UTC)"
  type        = string
  default     = "03:00"
}

variable "enable_point_in_time_recovery" {
  description = "Whether to enable point-in-time recovery"
  type        = bool
  default     = true
}

variable "transaction_log_retention_days" {
  description = "Number of days to retain transaction logs"
  type        = number
  default     = 7
}

variable "retained_backups" {
  description = "Number of backups to retain"
  type        = number
  default     = 14
}

variable "enable_public_ip" {
  description = "Whether to assign a public IP to the instance"
  type        = bool
  default     = false
}

variable "private_network" {
  description = "VPC network self link for private IP connectivity"
  type        = string
  default     = null
}

variable "require_ssl" {
  description = "Whether to require SSL for connections"
  type        = bool
  default     = true
}

variable "authorized_networks" {
  description = "List of authorized networks for public access"
  type = list(object({
    name = string
    cidr = string
  }))
  default = []
}

variable "maintenance_window_day" {
  description = "Day of week for maintenance window (1=Monday, 7=Sunday)"
  type        = number
  default     = 7
}

variable "maintenance_window_hour" {
  description = "Hour of day for maintenance window (0-23 UTC)"
  type        = number
  default     = 4
}

variable "enable_query_insights" {
  description = "Whether to enable Query Insights"
  type        = bool
  default     = true
}

variable "store_password_in_secret_manager" {
  description = "Whether to store the generated password in Secret Manager"
  type        = bool
  default     = true
}

variable "labels" {
  description = "Labels to apply to resources"
  type        = map(string)
  default     = {}
}
