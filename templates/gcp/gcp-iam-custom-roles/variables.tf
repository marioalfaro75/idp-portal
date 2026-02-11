variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "region" {
  description = "The GCP region for resources"
  type        = string
  default     = "us-central1"
}

variable "custom_roles" {
  description = "List of custom IAM roles to create"
  type = list(object({
    role_id     = string
    title       = string
    description = string
    permissions = list(string)
    stage       = optional(string, "GA")
  }))
  default = [
    {
      role_id     = "appDeployer"
      title       = "Application Deployer"
      description = "Custom role for deploying applications"
      permissions = [
        "run.services.create",
        "run.services.update",
        "run.services.delete",
        "run.services.get",
        "run.services.list",
        "storage.objects.create",
        "storage.objects.get",
        "storage.objects.list"
      ]
    }
  ]
}

variable "role_bindings" {
  description = "Bindings of custom roles to IAM members"
  type = list(object({
    role_id = string
    member  = string
  }))
  default = []
}

variable "service_accounts" {
  description = "Service accounts to create"
  type = list(object({
    account_id   = string
    display_name = string
    description  = optional(string)
  }))
  default = []
}

variable "sa_role_bindings" {
  description = "Role bindings for service accounts"
  type = list(object({
    service_account = string
    role            = string
  }))
  default = []
}

variable "workload_identity_bindings" {
  description = "Workload Identity bindings for GKE service accounts"
  type = list(object({
    service_account    = string
    k8s_namespace      = string
    k8s_service_account = string
  }))
  default = []
}
