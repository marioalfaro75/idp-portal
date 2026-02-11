variable "resource_group_name" {
  description = "Name of the resource group to create"
  type        = string
}

variable "location" {
  description = "Azure region for all resources"
  type        = string
  default     = "eastus2"
}

variable "cdn_profile_name" {
  description = "Name of the CDN profile"
  type        = string
}

variable "cdn_sku" {
  description = "SKU for the CDN profile (Standard_Microsoft, Standard_Akamai, Standard_Verizon, Premium_Verizon)"
  type        = string
  default     = "Standard_Microsoft"
}

variable "cdn_endpoint_name" {
  description = "Name of the CDN endpoint"
  type        = string
}

variable "origin_name" {
  description = "Name of the CDN origin"
  type        = string
  default     = "primary-origin"
}

variable "origin_host_name" {
  description = "Host name of the origin (e.g., storage account blob endpoint)"
  type        = string
}

variable "origin_http_port" {
  description = "HTTP port for the origin"
  type        = number
  default     = 80
}

variable "origin_https_port" {
  description = "HTTPS port for the origin"
  type        = number
  default     = 443
}

variable "is_http_allowed" {
  description = "Whether HTTP is allowed on the CDN endpoint"
  type        = bool
  default     = false
}

variable "is_compression_enabled" {
  description = "Whether to enable compression"
  type        = bool
  default     = true
}

variable "content_types_to_compress" {
  description = "List of content types to compress"
  type        = list(string)
  default = [
    "text/html",
    "text/css",
    "application/javascript",
    "application/json",
    "application/xml",
    "text/plain",
    "image/svg+xml"
  ]
}

variable "querystring_caching" {
  description = "Query string caching behavior (IgnoreQueryString, BypassCaching, UseQueryString, NotSet)"
  type        = string
  default     = "IgnoreQueryString"
}

variable "optimization_type" {
  description = "Optimization type for the CDN endpoint"
  type        = string
  default     = "GeneralWebDelivery"
}

variable "enable_https_redirect" {
  description = "Whether to enable HTTP to HTTPS redirect"
  type        = bool
  default     = true
}

variable "cache_rules" {
  description = "List of custom cache rules"
  type = list(object({
    name           = string
    order          = number
    path_patterns  = list(string)
    cache_duration = string
  }))
  default = []
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}
