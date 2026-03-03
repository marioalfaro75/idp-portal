variable "resource_group_name" {
  description = "Azure resource group name"
  type        = string
  default     = "{{resource_group_name}}"
}

variable "location" {
  description = "Azure region"
  type        = string
  default     = "{{location}}"
}
