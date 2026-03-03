variable "resource_group_name" {
  description = "Azure resource group name"
  type        = string
  default     = "{{resource_group_name}}"
}

variable "function_app_name" {
  description = "Azure Function App name"
  type        = string
  default     = "{{function_app_name}}"
}

variable "location" {
  description = "Azure region"
  type        = string
  default     = "{{location}}"
}

variable "runtime" {
  description = "Function runtime"
  type        = string
  default     = "{{runtime}}"
}

variable "runtime_version" {
  description = "Function runtime version"
  type        = string
  default     = "{{runtime_version}}"
}
