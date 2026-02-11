output "function_app_id" {
  description = "The ID of the Function App"
  value       = var.os_type == "Linux" ? azurerm_linux_function_app.this[0].id : azurerm_windows_function_app.this[0].id
}

output "function_app_name" {
  description = "The name of the Function App"
  value       = var.function_app_name
}

output "default_hostname" {
  description = "The default hostname of the Function App"
  value       = var.os_type == "Linux" ? azurerm_linux_function_app.this[0].default_hostname : azurerm_windows_function_app.this[0].default_hostname
}

output "identity_principal_id" {
  description = "The principal ID of the Function App managed identity"
  value       = var.os_type == "Linux" ? azurerm_linux_function_app.this[0].identity[0].principal_id : azurerm_windows_function_app.this[0].identity[0].principal_id
}

output "app_insights_instrumentation_key" {
  description = "The instrumentation key for Application Insights"
  value       = var.enable_app_insights ? azurerm_application_insights.this[0].instrumentation_key : null
  sensitive   = true
}

output "storage_account_name" {
  description = "The name of the storage account"
  value       = azurerm_storage_account.this.name
}

output "resource_group_name" {
  description = "The name of the resource group"
  value       = azurerm_resource_group.this.name
}
