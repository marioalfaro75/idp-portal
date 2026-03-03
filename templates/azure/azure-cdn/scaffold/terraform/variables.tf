variable "resource_group_name" {
  description = "Azure resource group name"
  type        = string
  default     = "{{resource_group_name}}"
}

variable "cdn_profile_name" {
  description = "CDN profile name"
  type        = string
  default     = "{{cdn_profile_name}}"
}

variable "cdn_endpoint_name" {
  description = "CDN endpoint name"
  type        = string
  default     = "{{cdn_endpoint_name}}"
}

variable "location" {
  description = "Azure region"
  type        = string
  default     = "{{location}}"
}
