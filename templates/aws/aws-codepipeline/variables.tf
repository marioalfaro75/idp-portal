variable "region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "us-east-1"
}

variable "pipeline_name" {
  description = "Name of the CodePipeline"
  type        = string
}

variable "codestar_connection_arn" {
  description = "ARN of the CodeStar connection for the source provider (GitHub, Bitbucket, etc.)"
  type        = string
}

variable "repository_id" {
  description = "Full repository ID (e.g., owner/repo)"
  type        = string
}

variable "branch_name" {
  description = "Branch to trigger the pipeline on"
  type        = string
  default     = "main"
}

variable "codebuild_project_name" {
  description = "Name of the CodeBuild project for the build stage"
  type        = string
}

variable "deploy_provider" {
  description = "Deploy provider (e.g., ECS, S3, CodeDeploy). Leave empty to skip deploy stage."
  type        = string
  default     = ""
}

variable "deploy_configuration" {
  description = "Configuration for the deploy action"
  type        = map(string)
  default     = {}
}

variable "tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}
