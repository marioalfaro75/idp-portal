output "app_url" {
  description = "Container app URL"
  value       = "https://${azurerm_container_app.this.ingress[0].fqdn}"
}

output "app_name" {
  description = "Container app name"
  value       = azurerm_container_app.this.name
}

output "environment_name" {
  description = "Container app environment name"
  value       = azurerm_container_app_environment.this.name
}
