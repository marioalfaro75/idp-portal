output "subscription_role_assignment_ids" {
  description = "Map of subscription-level role assignment IDs"
  value       = { for k, v in azurerm_role_assignment.subscription_level : k => v.id }
}

output "resource_group_role_assignment_ids" {
  description = "Map of resource-group-level role assignment IDs"
  value       = { for k, v in azurerm_role_assignment.resource_group_level : k => v.id }
}

output "resource_role_assignment_ids" {
  description = "Map of resource-level role assignment IDs"
  value       = { for k, v in azurerm_role_assignment.resource_level : k => v.id }
}

output "custom_role_definition_ids" {
  description = "Map of custom role definition IDs"
  value       = { for k, v in azurerm_role_definition.custom : k => v.role_definition_resource_id }
}

output "current_subscription_id" {
  description = "The current Azure subscription ID"
  value       = data.azurerm_subscription.current.subscription_id
}

output "current_tenant_id" {
  description = "The current Azure tenant ID"
  value       = data.azurerm_client_config.current.tenant_id
}
