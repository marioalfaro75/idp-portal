output "apim_id" {
  description = "The ID of the API Management instance"
  value       = azurerm_api_management.this.id
}

output "apim_name" {
  description = "The name of the API Management instance"
  value       = azurerm_api_management.this.name
}

output "gateway_url" {
  description = "The gateway URL of the API Management instance"
  value       = azurerm_api_management.this.gateway_url
}

output "management_api_url" {
  description = "The management API URL of the APIM instance"
  value       = azurerm_api_management.this.management_api_url
}

output "portal_url" {
  description = "The developer portal URL"
  value       = azurerm_api_management.this.portal_url
}

output "identity_principal_id" {
  description = "The principal ID of the APIM managed identity"
  value       = azurerm_api_management.this.identity[0].principal_id
}

output "product_ids" {
  description = "Map of product IDs"
  value       = { for k, v in azurerm_api_management_product.this : k => v.id }
}

output "resource_group_name" {
  description = "The name of the resource group"
  value       = azurerm_resource_group.this.name
}
