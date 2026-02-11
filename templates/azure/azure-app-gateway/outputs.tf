output "app_gateway_id" {
  description = "The ID of the Application Gateway"
  value       = azurerm_application_gateway.this.id
}

output "app_gateway_name" {
  description = "The name of the Application Gateway"
  value       = azurerm_application_gateway.this.name
}

output "public_ip_address" {
  description = "The public IP address of the Application Gateway"
  value       = azurerm_public_ip.this.ip_address
}

output "public_ip_id" {
  description = "The ID of the public IP resource"
  value       = azurerm_public_ip.this.id
}

output "backend_address_pool_ids" {
  description = "List of backend address pool IDs"
  value       = azurerm_application_gateway.this.backend_address_pool[*].id
}

output "resource_group_name" {
  description = "The name of the resource group"
  value       = azurerm_resource_group.this.name
}
