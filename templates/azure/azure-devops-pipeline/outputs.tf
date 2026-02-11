output "project_id" {
  description = "The ID of the Azure DevOps project"
  value       = data.azuredevops_project.this.id
}

output "repository_id" {
  description = "The ID of the Git repository"
  value       = var.create_repository ? azuredevops_git_repository.this[0].id : data.azuredevops_git_repository.existing[0].id
}

output "repository_url" {
  description = "The remote URL of the Git repository"
  value       = var.create_repository ? azuredevops_git_repository.this[0].remote_url : data.azuredevops_git_repository.existing[0].remote_url
}

output "pipeline_id" {
  description = "The ID of the build pipeline"
  value       = azuredevops_build_definition.this.id
}

output "pipeline_name" {
  description = "The name of the build pipeline"
  value       = azuredevops_build_definition.this.name
}
