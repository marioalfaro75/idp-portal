variable "region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "us-east-1"
}

variable "log_group_name" {
  description = "Name of the CloudWatch log group"
  type        = string
}

variable "retention_in_days" {
  description = "Number of days to retain log events (0 = never expire)"
  type        = number
  default     = 30
}

variable "kms_key_id" {
  description = "ARN of the KMS key for log encryption. Leave empty for default encryption."
  type        = string
  default     = null
}

variable "log_group_class" {
  description = "Log group class (STANDARD or INFREQUENT_ACCESS)"
  type        = string
  default     = "STANDARD"
}

variable "metric_filters" {
  description = "List of metric filters to create"
  type = list(object({
    name             = string
    pattern          = string
    metric_name      = string
    metric_namespace = string
    metric_value     = string
    default_value    = string
  }))
  default = []
}

variable "subscription_filter_pattern" {
  description = "Filter pattern for subscription filters"
  type        = string
  default     = ""
}

variable "lambda_subscription_arn" {
  description = "ARN of a Lambda function to subscribe to the log group. Leave empty to skip."
  type        = string
  default     = ""
}

variable "kinesis_subscription_arn" {
  description = "ARN of a Kinesis stream to subscribe to the log group. Leave empty to skip."
  type        = string
  default     = ""
}

variable "kinesis_subscription_role_arn" {
  description = "IAM role ARN for the Kinesis subscription filter"
  type        = string
  default     = ""
}

variable "saved_queries" {
  description = "List of CloudWatch Insights saved queries"
  type = list(object({
    name         = string
    query_string = string
  }))
  default = []
}

variable "create_writer_policy" {
  description = "Create an IAM policy for writing to the log group"
  type        = bool
  default     = true
}

variable "create_reader_policy" {
  description = "Create an IAM policy for reading from the log group"
  type        = bool
  default     = false
}

variable "tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}
