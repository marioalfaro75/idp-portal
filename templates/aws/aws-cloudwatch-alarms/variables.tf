variable "region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Name of the project, used as a prefix for alarm names"
  type        = string
}

variable "metric_namespace" {
  description = "CloudWatch namespace for the metrics"
  type        = string
  default     = "AWS/EC2"
}

variable "alarm_dimensions" {
  description = "Dimensions for the CloudWatch alarms"
  type        = map(string)
  default     = {}
}

variable "evaluation_periods" {
  description = "Number of evaluation periods before triggering alarm"
  type        = number
  default     = 3
}

variable "period" {
  description = "Period in seconds for each evaluation"
  type        = number
  default     = 300
}

variable "create_sns_topic" {
  description = "Create a new SNS topic for alarm notifications"
  type        = bool
  default     = true
}

variable "alarm_action_arns" {
  description = "ARNs for alarm actions (used if create_sns_topic is false)"
  type        = list(string)
  default     = []
}

variable "notification_emails" {
  description = "Email addresses to subscribe to the alarm notification topic"
  type        = list(string)
  default     = []
}

variable "create_cpu_alarm" {
  description = "Create a CPU utilization alarm"
  type        = bool
  default     = true
}

variable "cpu_threshold" {
  description = "CPU utilization threshold percentage"
  type        = number
  default     = 80
}

variable "create_memory_alarm" {
  description = "Create a memory utilization alarm"
  type        = bool
  default     = false
}

variable "memory_threshold" {
  description = "Memory utilization threshold percentage"
  type        = number
  default     = 80
}

variable "create_error_alarm" {
  description = "Create an error rate alarm"
  type        = bool
  default     = false
}

variable "error_metric_name" {
  description = "Metric name for errors"
  type        = string
  default     = "5XXError"
}

variable "error_threshold" {
  description = "Error count threshold"
  type        = number
  default     = 10
}

variable "create_latency_alarm" {
  description = "Create a latency alarm"
  type        = bool
  default     = false
}

variable "latency_metric_name" {
  description = "Metric name for latency"
  type        = string
  default     = "TargetResponseTime"
}

variable "latency_threshold" {
  description = "Latency threshold in milliseconds"
  type        = number
  default     = 1000
}

variable "custom_alarms" {
  description = "List of custom CloudWatch alarms"
  type = list(object({
    name                = string
    description         = string
    comparison_operator = string
    evaluation_periods  = number
    metric_name         = string
    namespace           = string
    period              = number
    statistic           = string
    threshold           = number
    treat_missing_data  = string
    dimensions          = map(string)
  }))
  default = []
}

variable "tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}
