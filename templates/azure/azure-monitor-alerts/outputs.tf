output "action_group_id" {
  description = "The ID of the action group"
  value       = azurerm_monitor_action_group.this.id
}

output "action_group_name" {
  description = "The name of the action group"
  value       = azurerm_monitor_action_group.this.name
}

output "metric_alert_ids" {
  description = "Map of metric alert names to their IDs"
  value       = { for k, v in azurerm_monitor_metric_alert.this : k => v.id }
}

output "activity_log_alert_ids" {
  description = "Map of activity log alert names to their IDs"
  value       = { for k, v in azurerm_monitor_activity_log_alert.this : k => v.id }
}

output "resource_group_name" {
  description = "The name of the resource group"
  value       = azurerm_resource_group.this.name
}
