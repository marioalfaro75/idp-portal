variable "region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "us-east-1"
}

variable "state_machine_name" {
  description = "Name of the Step Functions state machine"
  type        = string
}

variable "state_machine_type" {
  description = "Type of state machine (STANDARD or EXPRESS)"
  type        = string
  default     = "STANDARD"
}

variable "definition" {
  description = "JSON definition of the state machine (Amazon States Language)"
  type        = string
}

variable "lambda_function_arns" {
  description = "List of Lambda function ARNs that the state machine can invoke"
  type        = list(string)
  default     = []
}

variable "log_retention_days" {
  description = "Number of days to retain CloudWatch logs"
  type        = number
  default     = 14
}

variable "log_level" {
  description = "Log level for the state machine (OFF, ALL, ERROR, FATAL)"
  type        = string
  default     = "ERROR"
}

variable "include_execution_data" {
  description = "Include execution data in logs"
  type        = bool
  default     = false
}

variable "enable_xray_tracing" {
  description = "Enable X-Ray tracing for the state machine"
  type        = bool
  default     = true
}

variable "schedule_expression" {
  description = "EventBridge schedule expression to trigger the state machine (e.g., rate(1 hour)). Leave empty to disable."
  type        = string
  default     = ""
}

variable "tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}
