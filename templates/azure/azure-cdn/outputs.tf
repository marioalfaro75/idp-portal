output "cdn_profile_id" {
  description = "The ID of the CDN profile"
  value       = azurerm_cdn_profile.this.id
}

output "cdn_profile_name" {
  description = "The name of the CDN profile"
  value       = azurerm_cdn_profile.this.name
}

output "cdn_endpoint_id" {
  description = "The ID of the CDN endpoint"
  value       = azurerm_cdn_endpoint.this.id
}

output "cdn_endpoint_hostname" {
  description = "The hostname of the CDN endpoint"
  value       = azurerm_cdn_endpoint.this.fqdn
}

output "cdn_endpoint_url" {
  description = "The full URL of the CDN endpoint"
  value       = "https://${azurerm_cdn_endpoint.this.fqdn}"
}

output "resource_group_name" {
  description = "The name of the resource group"
  value       = azurerm_resource_group.this.name
}
