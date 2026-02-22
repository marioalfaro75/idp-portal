variable "region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "us-east-1"
}

variable "role_name" {
  description = "Name of the IAM role"
  type        = string
}

variable "role_description" {
  description = "Description of the IAM role"
  type        = string
  default     = ""
}

variable "role_path" {
  description = "Path for the IAM role and policies"
  type        = string
  default     = "/"
}

variable "max_session_duration" {
  description = "Maximum session duration in seconds (1 hour to 12 hours)"
  type        = number
  default     = 3600

  validation {
    condition     = var.max_session_duration >= 3600 && var.max_session_duration <= 43200
    error_message = "max_session_duration must be between 3600 and 43200 seconds."
  }
}

variable "trusted_services" {
  description = "List of AWS services trusted to assume this role"
  type        = list(string)
  default     = ["ec2.amazonaws.com"]
}

variable "assume_role_condition" {
  description = "Optional condition block for the assume role policy"
  type        = any
  default     = null
}

variable "permissions_boundary_arn" {
  description = "ARN of the permissions boundary policy. Leave empty for none."
  type        = string
  default     = null
}

variable "managed_policy_arns" {
  description = "List of AWS managed policy ARNs to attach to the role"
  type        = list(string)
  default     = []
}

variable "custom_policies" {
  description = "List of custom IAM policies to create and attach"
  type = list(object({
    name        = string
    description = string
    statements = list(object({
      Effect   = string
      Action   = list(string)
      Resource = list(string)
    }))
  }))
  default = []
}

variable "create_instance_profile" {
  description = "Whether to create an instance profile for the role"
  type        = bool
  default     = false
}

variable "tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}
