variable "resource_group_name" {
  description = "Default resource group name (used for reference)"
  type        = string
  default     = ""
}

variable "location" {
  description = "Azure region (used for reference)"
  type        = string
  default     = "eastus2"
}

variable "subscription_role_assignments" {
  description = "List of role assignments at the subscription level"
  type = list(object({
    principal_id         = string
    role_definition_name = string
    description          = optional(string)
    condition            = optional(string)
  }))
  default = []
}

variable "resource_group_role_assignments" {
  description = "List of role assignments at the resource group level"
  type = list(object({
    principal_id         = string
    role_definition_name = string
    resource_group_name  = string
    description          = optional(string)
  }))
  default = []
}

variable "resource_role_assignments" {
  description = "List of role assignments at the resource level"
  type = list(object({
    principal_id         = string
    role_definition_name = string
    resource_id          = string
    description          = optional(string)
  }))
  default = []
}

variable "custom_role_definitions" {
  description = "List of custom role definitions to create"
  type = list(object({
    name              = string
    description       = string
    actions           = list(string)
    not_actions       = optional(list(string), [])
    data_actions      = optional(list(string), [])
    not_data_actions  = optional(list(string), [])
    assignable_scopes = optional(list(string))
  }))
  default = []
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}
