variable "resource_group_name" {
  description = "Name of the resource group to create"
  type        = string
}

variable "location" {
  description = "Azure region for all resources"
  type        = string
  default     = "eastus2"
}

variable "app_gateway_name" {
  description = "Name of the Application Gateway"
  type        = string
}

variable "subnet_id" {
  description = "ID of the subnet to deploy the Application Gateway into"
  type        = string
}

variable "sku_name" {
  description = "SKU name for the Application Gateway"
  type        = string
  default     = "Standard_v2"
}

variable "sku_tier" {
  description = "SKU tier for the Application Gateway"
  type        = string
  default     = "Standard_v2"
}

variable "capacity" {
  description = "Number of instances for the Application Gateway"
  type        = number
  default     = 2
}

variable "backend_pool_name" {
  description = "Name of the backend address pool"
  type        = string
  default     = "default-backend-pool"
}

variable "backend_port" {
  description = "Port for the backend HTTP settings"
  type        = number
  default     = 80
}

variable "cookie_based_affinity" {
  description = "Whether to enable cookie-based affinity"
  type        = string
  default     = "Disabled"
}

variable "request_timeout" {
  description = "Request timeout in seconds"
  type        = number
  default     = 30
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}
