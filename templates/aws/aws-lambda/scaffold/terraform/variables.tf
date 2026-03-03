variable "region" {
  description = "AWS region"
  type        = string
  default     = "{{region}}"
}

variable "function_name" {
  description = "Lambda function name"
  type        = string
  default     = "{{function_name}}"
}

variable "runtime" {
  description = "Lambda runtime"
  type        = string
  default     = "{{runtime}}"
}

variable "handler" {
  description = "Lambda handler"
  type        = string
  default     = "{{handler}}"
}
