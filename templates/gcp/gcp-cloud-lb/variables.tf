variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "region" {
  description = "The GCP region for resources"
  type        = string
  default     = "us-central1"
}

variable "lb_name" {
  description = "Name prefix for the load balancer resources"
  type        = string
  default     = "web-lb"
}

variable "backend_port" {
  description = "Port the backend service listens on"
  type        = number
  default     = 80
}

variable "port_name" {
  description = "Named port for the backend service"
  type        = string
  default     = "http"
}

variable "backend_timeout" {
  description = "Backend service timeout in seconds"
  type        = number
  default     = 30
}

variable "backend_groups" {
  description = "List of backend instance groups"
  type = list(object({
    instance_group  = string
    balancing_mode  = optional(string, "UTILIZATION")
    capacity_scaler = optional(number, 1.0)
    max_utilization = optional(number, 0.8)
  }))
  default = []
}

variable "health_check_interval" {
  description = "Health check interval in seconds"
  type        = number
  default     = 10
}

variable "health_check_timeout" {
  description = "Health check timeout in seconds"
  type        = number
  default     = 5
}

variable "health_check_path" {
  description = "HTTP path for health checks"
  type        = string
  default     = "/healthz"
}

variable "enable_ssl" {
  description = "Whether to enable HTTPS with managed SSL certificate"
  type        = bool
  default     = false
}

variable "ssl_domains" {
  description = "List of domains for managed SSL certificate"
  type        = list(string)
  default     = []
}

variable "enable_logging" {
  description = "Whether to enable access logging"
  type        = bool
  default     = true
}

variable "log_sample_rate" {
  description = "The fraction of requests to log (0.0 to 1.0)"
  type        = number
  default     = 1.0
}
