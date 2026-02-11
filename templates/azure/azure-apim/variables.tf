variable "resource_group_name" {
  description = "Name of the resource group to create"
  type        = string
}

variable "location" {
  description = "Azure region for all resources"
  type        = string
  default     = "eastus2"
}

variable "apim_name" {
  description = "Name of the API Management instance"
  type        = string
}

variable "publisher_name" {
  description = "Publisher name for the APIM instance"
  type        = string
}

variable "publisher_email" {
  description = "Publisher email for the APIM instance"
  type        = string
}

variable "sku_name" {
  description = "SKU name for APIM (Consumption, Developer, Basic, Standard, Premium)"
  type        = string
  default     = "Developer"
}

variable "sku_capacity" {
  description = "Number of scale units for the APIM instance"
  type        = number
  default     = 1
}

variable "virtual_network_type" {
  description = "Virtual network type (None, External, Internal)"
  type        = string
  default     = "None"
}

variable "subnet_id" {
  description = "Subnet ID for VNET integration (required when virtual_network_type is not None)"
  type        = string
  default     = null
}

variable "products" {
  description = "List of API Management products to create"
  type = list(object({
    product_id            = string
    display_name          = string
    description           = string
    subscription_required = bool
    approval_required     = bool
    published             = bool
  }))
  default = [
    {
      product_id            = "starter"
      display_name          = "Starter"
      description           = "Starter product with limited access"
      subscription_required = true
      approval_required     = false
      published             = true
    }
  ]
}

variable "named_values" {
  description = "Map of named values (key-value pairs) for the APIM instance"
  type        = map(string)
  default     = {}
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}
