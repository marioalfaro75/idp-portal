variable "region" {
  type        = string
  description = "AWS region"
  default     = "us-east-1"
}

variable "queue_name" {
  type        = string
  description = "SQS queue name"
}

variable "delay_seconds" {
  type        = number
  description = "Delivery delay in seconds"
  default     = 0
}

variable "max_message_size" {
  type        = number
  description = "Maximum message size in bytes"
  default     = 262144
}

variable "message_retention_seconds" {
  type        = number
  description = "Message retention period in seconds"
  default     = 345600
}

variable "visibility_timeout_seconds" {
  type        = number
  description = "Visibility timeout in seconds"
  default     = 30
}

variable "receive_wait_time_seconds" {
  type        = number
  description = "Long polling wait time in seconds"
  default     = 10
}

variable "max_receive_count" {
  type        = number
  description = "Max receives before sending to DLQ"
  default     = 3
}

variable "environment" {
  type        = string
  description = "Environment name"
  default     = "dev"
}
