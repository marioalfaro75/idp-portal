variable "region" {
  description = "AWS region"
  type        = string
  default     = "{{region}}"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "{{project_name}}"
}

variable "database_name" {
  description = "Database name"
  type        = string
  default     = "{{database_name}}"
}

variable "master_username" {
  description = "Database master username"
  type        = string
  default     = "{{master_username}}"
}
