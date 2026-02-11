variable "project_id" {
  type        = string
  description = "GCP project ID"
}

variable "region" {
  type        = string
  description = "GCP region"
  default     = "us-central1"
}

variable "topic_name" {
  type        = string
  description = "Pub/Sub topic name"
}

variable "message_retention_duration" {
  type        = string
  description = "Message retention duration"
  default     = "86400s"
}

variable "ack_deadline_seconds" {
  type        = number
  description = "Acknowledgement deadline in seconds"
  default     = 20
}

variable "max_delivery_attempts" {
  type        = number
  description = "Max delivery attempts before dead-lettering"
  default     = 5
}

variable "environment" {
  type        = string
  description = "Environment name"
  default     = "dev"
}
