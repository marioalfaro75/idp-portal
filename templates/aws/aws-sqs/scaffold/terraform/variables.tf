variable "region" {
  description = "AWS region"
  type        = string
  default     = "{{region}}"
}

variable "queue_name" {
  description = "SQS queue name"
  type        = string
  default     = "{{queue_name}}"
}
