variable "resource_group_name" {
  description = "Name of the resource group to create"
  type        = string
}

variable "location" {
  description = "Azure region for all resources"
  type        = string
  default     = "eastus2"
}

variable "account_name" {
  description = "Name of the Cosmos DB account"
  type        = string
}

variable "kind" {
  description = "Kind of Cosmos DB account (GlobalDocumentDB or MongoDB)"
  type        = string
  default     = "GlobalDocumentDB"
}

variable "consistency_level" {
  description = "Consistency level (Strong, BoundedStaleness, Session, ConsistentPrefix, Eventual)"
  type        = string
  default     = "Session"
}

variable "max_staleness_interval" {
  description = "Max staleness interval in seconds (for BoundedStaleness)"
  type        = number
  default     = 300
}

variable "max_staleness_prefix" {
  description = "Max staleness prefix (for BoundedStaleness)"
  type        = number
  default     = 100000
}

variable "enable_automatic_failover" {
  description = "Whether to enable automatic failover"
  type        = bool
  default     = true
}

variable "enable_free_tier" {
  description = "Whether to enable the free tier"
  type        = bool
  default     = false
}

variable "zone_redundant" {
  description = "Whether the primary region is zone redundant"
  type        = bool
  default     = false
}

variable "secondary_locations" {
  description = "List of secondary geo-locations"
  type = list(object({
    location          = string
    failover_priority = number
    zone_redundant    = bool
  }))
  default = []
}

variable "capabilities" {
  description = "List of Cosmos DB capabilities to enable"
  type        = list(string)
  default     = []
}

variable "backup_type" {
  description = "Backup type (Periodic or Continuous)"
  type        = string
  default     = "Periodic"
}

variable "backup_interval" {
  description = "Backup interval in minutes (for Periodic backups)"
  type        = number
  default     = 240
}

variable "backup_retention" {
  description = "Backup retention in hours (for Periodic backups)"
  type        = number
  default     = 8
}

variable "create_sql_database" {
  description = "Whether to create a SQL database and container"
  type        = bool
  default     = true
}

variable "sql_database_name" {
  description = "Name of the SQL database"
  type        = string
  default     = "appdb"
}

variable "sql_container_name" {
  description = "Name of the SQL container"
  type        = string
  default     = "items"
}

variable "partition_key_path" {
  description = "Partition key path for the container"
  type        = string
  default     = "/id"
}

variable "database_throughput" {
  description = "Throughput (RU/s) for the database"
  type        = number
  default     = 400
}

variable "container_throughput" {
  description = "Throughput (RU/s) for the container"
  type        = number
  default     = 400
}

variable "lock" {
  description = "Resource lock configuration (CanNotDelete or ReadOnly)"
  type = object({
    kind = string
    name = optional(string, null)
  })
  default = null

  validation {
    condition     = var.lock == null || contains(["CanNotDelete", "ReadOnly"], var.lock.kind)
    error_message = "lock.kind must be CanNotDelete or ReadOnly."
  }
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}
