variable "resource_group_name" {
  description = "Resource group name (for reference only, not used directly)"
  type        = string
  default     = ""
}

variable "location" {
  description = "Azure region (for reference only, not used directly)"
  type        = string
  default     = "eastus2"
}

variable "org_service_url" {
  description = "Azure DevOps organization URL (e.g., https://dev.azure.com/myorg)"
  type        = string
}

variable "personal_access_token" {
  description = "Personal access token for Azure DevOps authentication"
  type        = string
  sensitive   = true
}

variable "project_name" {
  description = "Name of the existing Azure DevOps project"
  type        = string
}

variable "create_repository" {
  description = "Whether to create a new Git repository"
  type        = bool
  default     = false
}

variable "repository_name" {
  description = "Name of the Git repository"
  type        = string
}

variable "pipeline_name" {
  description = "Name of the build pipeline"
  type        = string
}

variable "pipeline_path" {
  description = "Path (folder) for the pipeline within the project"
  type        = string
  default     = "\\"
}

variable "default_branch" {
  description = "Default branch for the pipeline"
  type        = string
  default     = "refs/heads/main"
}

variable "yaml_path" {
  description = "Path to the YAML pipeline file in the repository"
  type        = string
  default     = "azure-pipelines.yml"
}

variable "pipeline_variables" {
  description = "List of pipeline variables"
  type = list(object({
    name      = string
    value     = string
    is_secret = bool
  }))
  default = []
}

variable "enable_branch_policy" {
  description = "Whether to enable minimum reviewer branch policy"
  type        = bool
  default     = false
}

variable "min_reviewers" {
  description = "Minimum number of reviewers for the branch policy"
  type        = number
  default     = 2
}

variable "enable_build_validation" {
  description = "Whether to enable build validation branch policy"
  type        = bool
  default     = false
}
