variable "region" {
  type        = string
  description = "AWS region"
  default     = "us-east-1"
}

variable "project_name" {
  type        = string
  description = "CodeBuild project name"
}

variable "description" {
  type        = string
  description = "Project description"
  default     = "CodeBuild project"
}

variable "source_repo_url" {
  type        = string
  description = "Source repository URL"
}

variable "buildspec_path" {
  type        = string
  description = "Path to buildspec.yml"
  default     = "buildspec.yml"
}

variable "build_image" {
  type        = string
  description = "Docker image for build environment"
  default     = "aws/codebuild/amazonlinux2-x86_64-standard:4.0"
}

variable "compute_type" {
  type        = string
  description = "Compute type for build environment"
  default     = "BUILD_GENERAL1_SMALL"
}

variable "build_timeout" {
  type        = number
  description = "Build timeout in minutes"
  default     = 30
}

variable "privileged_mode" {
  type        = bool
  description = "Enable privileged mode for Docker builds"
  default     = false
}

variable "environment" {
  type        = string
  description = "Environment name"
  default     = "dev"
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}
