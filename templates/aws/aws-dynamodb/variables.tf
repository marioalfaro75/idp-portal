variable "region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "us-east-1"
}

variable "table_name" {
  description = "Name of the DynamoDB table"
  type        = string
}

variable "billing_mode" {
  description = "Billing mode for the table (PROVISIONED or PAY_PER_REQUEST)"
  type        = string
  default     = "PAY_PER_REQUEST"
}

variable "hash_key" {
  description = "Name of the hash (partition) key"
  type        = string
}

variable "hash_key_type" {
  description = "Type of the hash key (S, N, or B)"
  type        = string
  default     = "S"
}

variable "range_key" {
  description = "Name of the range (sort) key. Leave empty for no range key."
  type        = string
  default     = ""
}

variable "range_key_type" {
  description = "Type of the range key (S, N, or B)"
  type        = string
  default     = "S"
}

variable "read_capacity" {
  description = "Read capacity units (only for PROVISIONED billing mode)"
  type        = number
  default     = 5
}

variable "write_capacity" {
  description = "Write capacity units (only for PROVISIONED billing mode)"
  type        = number
  default     = 5
}

variable "global_secondary_indexes" {
  description = "List of global secondary indexes"
  type = list(object({
    name            = string
    hash_key        = string
    hash_key_type   = string
    range_key       = string
    range_key_type  = string
    projection_type = string
    read_capacity   = number
    write_capacity  = number
  }))
  default = []
}

variable "enable_point_in_time_recovery" {
  description = "Enable point-in-time recovery"
  type        = bool
  default     = true
}

variable "kms_key_arn" {
  description = "ARN of a KMS key for encryption. Leave empty for AWS-managed key."
  type        = string
  default     = null
}

variable "ttl_attribute" {
  description = "Name of the TTL attribute. Leave empty to disable TTL."
  type        = string
  default     = ""
}

variable "stream_enabled" {
  description = "Enable DynamoDB Streams"
  type        = bool
  default     = false
}

variable "stream_view_type" {
  description = "Stream view type (NEW_IMAGE, OLD_IMAGE, NEW_AND_OLD_IMAGES, KEYS_ONLY)"
  type        = string
  default     = "NEW_AND_OLD_IMAGES"
}

variable "enable_autoscaling" {
  description = "Enable auto scaling for provisioned capacity"
  type        = bool
  default     = false
}

variable "autoscaling_max_read_capacity" {
  description = "Maximum read capacity for auto scaling"
  type        = number
  default     = 50
}

variable "autoscaling_max_write_capacity" {
  description = "Maximum write capacity for auto scaling"
  type        = number
  default     = 50
}

variable "autoscaling_target_utilization" {
  description = "Target utilization percentage for auto scaling"
  type        = number
  default     = 70
}

variable "tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}
