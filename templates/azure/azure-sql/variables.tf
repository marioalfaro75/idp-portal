variable "resource_group_name" {
  description = "Name of the resource group to create"
  type        = string
}

variable "location" {
  description = "Azure region for all resources"
  type        = string
  default     = "eastus2"
}

variable "server_name" {
  description = "Name of the SQL server"
  type        = string
}

variable "database_name" {
  description = "Name of the SQL database"
  type        = string
}

variable "sql_version" {
  description = "Version of the SQL server"
  type        = string
  default     = "12.0"
}

variable "admin_username" {
  description = "Administrator login for the SQL server"
  type        = string
  default     = "sqladmin"
}

variable "admin_password" {
  description = "Administrator password for the SQL server"
  type        = string
  sensitive   = true
}

variable "azuread_admin_username" {
  description = "Azure AD administrator login name"
  type        = string
}

variable "azuread_admin_object_id" {
  description = "Azure AD administrator object ID"
  type        = string
}

variable "minimum_tls_version" {
  description = "Minimum TLS version for the SQL server"
  type        = string
  default     = "1.2"
}

variable "database_sku" {
  description = "SKU name for the database (e.g., S0, S1, P1, GP_S_Gen5_1)"
  type        = string
  default     = "S0"
}

variable "max_size_gb" {
  description = "Maximum size of the database in GB"
  type        = number
  default     = 10
}

variable "collation" {
  description = "Collation for the database"
  type        = string
  default     = "SQL_Latin1_General_CP1_CI_AS"
}

variable "zone_redundant" {
  description = "Whether the database is zone redundant"
  type        = bool
  default     = false
}

variable "auto_pause_delay" {
  description = "Auto-pause delay in minutes (only for serverless SKU, -1 to disable)"
  type        = number
  default     = -1
}

variable "min_capacity" {
  description = "Minimum vCores capacity (only for serverless SKU)"
  type        = number
  default     = null
}

variable "short_term_retention_days" {
  description = "Number of days for short-term backup retention"
  type        = number
  default     = 7
}

variable "ltr_weekly_retention" {
  description = "Weekly long-term retention policy (ISO 8601 duration)"
  type        = string
  default     = "P1W"
}

variable "ltr_monthly_retention" {
  description = "Monthly long-term retention policy (ISO 8601 duration)"
  type        = string
  default     = "P1M"
}

variable "allow_azure_services" {
  description = "Whether to allow Azure services to access the SQL server"
  type        = bool
  default     = true
}

variable "firewall_rules" {
  description = "List of custom firewall rules"
  type = list(object({
    name     = string
    start_ip = string
    end_ip   = string
  }))
  default = []
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}
