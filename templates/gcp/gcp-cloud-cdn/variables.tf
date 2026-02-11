variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "region" {
  description = "The GCP region for resources"
  type        = string
  default     = "us-central1"
}

variable "cdn_name" {
  description = "Name prefix for CDN resources"
  type        = string
  default     = "static-cdn"
}

variable "bucket_name" {
  description = "Globally unique name for the backend GCS bucket"
  type        = string
}

variable "bucket_location" {
  description = "Location for the backend bucket"
  type        = string
  default     = "US"
}

variable "force_destroy" {
  description = "Whether to allow deletion of bucket with objects"
  type        = bool
  default     = false
}

variable "main_page_suffix" {
  description = "Index page for website serving"
  type        = string
  default     = "index.html"
}

variable "not_found_page" {
  description = "Custom 404 page for website serving"
  type        = string
  default     = "404.html"
}

variable "cors_origins" {
  description = "Allowed CORS origins"
  type        = list(string)
  default     = ["*"]
}

variable "enable_public_access" {
  description = "Whether to make bucket objects publicly readable"
  type        = bool
  default     = true
}

variable "cache_mode" {
  description = "CDN cache mode (CACHE_ALL_STATIC, USE_ORIGIN_HEADERS, FORCE_CACHE_ALL)"
  type        = string
  default     = "CACHE_ALL_STATIC"
}

variable "default_ttl" {
  description = "Default TTL for cached content in seconds"
  type        = number
  default     = 3600
}

variable "max_ttl" {
  description = "Maximum TTL for cached content in seconds"
  type        = number
  default     = 86400
}

variable "client_ttl" {
  description = "Client TTL for cached content in seconds"
  type        = number
  default     = 3600
}

variable "enable_negative_caching" {
  description = "Whether to cache negative responses (4xx, 5xx)"
  type        = bool
  default     = true
}

variable "serve_while_stale" {
  description = "Time in seconds to serve stale content while revalidating"
  type        = number
  default     = 86400
}

variable "signed_url_cache_max_age" {
  description = "Maximum age of signed URL cache entries in seconds"
  type        = number
  default     = 3600
}

variable "cache_key_headers" {
  description = "HTTP headers to include in cache key"
  type        = list(string)
  default     = []
}

variable "custom_response_headers" {
  description = "Custom response headers to add"
  type        = list(string)
  default     = ["X-Cache-Status: {cdn_cache_status}"]
}

variable "enable_ssl" {
  description = "Whether to enable HTTPS with managed SSL certificate"
  type        = bool
  default     = false
}

variable "ssl_domains" {
  description = "Domains for the managed SSL certificate"
  type        = list(string)
  default     = []
}

variable "labels" {
  description = "Labels to apply to resources"
  type        = map(string)
  default     = {}
}
