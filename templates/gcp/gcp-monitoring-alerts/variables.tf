variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "region" {
  description = "The GCP region for resources"
  type        = string
  default     = "us-central1"
}

variable "alert_prefix" {
  description = "Prefix for alert policy display names"
  type        = string
  default     = "Production"
}

variable "email_addresses" {
  description = "Email addresses for alert notifications"
  type        = list(string)
  default     = []
}

variable "slack_channel_name" {
  description = "Slack channel name for notifications"
  type        = string
  default     = null
}

variable "slack_auth_token" {
  description = "Slack authentication token"
  type        = string
  default     = ""
  sensitive   = true
}

variable "enable_cpu_alert" {
  description = "Whether to enable CPU utilization alert"
  type        = bool
  default     = true
}

variable "cpu_threshold" {
  description = "CPU utilization threshold (0.0 to 1.0)"
  type        = number
  default     = 0.8
}

variable "cpu_alert_duration" {
  description = "Duration the condition must be true before alerting"
  type        = string
  default     = "300s"
}

variable "enable_memory_alert" {
  description = "Whether to enable memory utilization alert"
  type        = bool
  default     = true
}

variable "memory_threshold" {
  description = "Memory utilization threshold (0.0 to 1.0)"
  type        = number
  default     = 0.85
}

variable "memory_alert_duration" {
  description = "Duration the condition must be true before alerting"
  type        = string
  default     = "300s"
}

variable "enable_disk_alert" {
  description = "Whether to enable disk utilization alert"
  type        = bool
  default     = true
}

variable "disk_threshold" {
  description = "Disk utilization threshold (0.0 to 1.0)"
  type        = number
  default     = 0.9
}

variable "uptime_check_url" {
  description = "URL hostname for uptime checking (set to null to disable)"
  type        = string
  default     = null
}

variable "uptime_check_path" {
  description = "URL path for the uptime check"
  type        = string
  default     = "/healthz"
}

variable "uptime_check_period" {
  description = "How often to run the uptime check"
  type        = string
  default     = "300s"
}

variable "auto_close_duration" {
  description = "Duration after which incidents auto-close (e.g., 86400s for 24h)"
  type        = string
  default     = "86400s"
}

variable "labels" {
  description = "Labels to apply to alert policies"
  type        = map(string)
  default     = {}
}
