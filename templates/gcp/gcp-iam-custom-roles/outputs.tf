output "custom_role_ids" {
  description = "Map of custom role IDs to their full resource IDs"
  value       = { for k, v in google_project_iam_custom_role.roles : k => v.id }
}

output "custom_role_names" {
  description = "Map of custom role IDs to their names"
  value       = { for k, v in google_project_iam_custom_role.roles : k => v.name }
}

output "service_account_emails" {
  description = "Map of service account IDs to their emails"
  value       = { for k, v in google_service_account.service_accounts : k => v.email }
}

output "service_account_ids" {
  description = "Map of service account IDs to their unique IDs"
  value       = { for k, v in google_service_account.service_accounts : k => v.unique_id }
}

output "service_account_names" {
  description = "Map of service account IDs to their fully qualified names"
  value       = { for k, v in google_service_account.service_accounts : k => v.name }
}
