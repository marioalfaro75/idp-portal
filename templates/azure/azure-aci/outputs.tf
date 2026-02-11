output "ip_address" {
  description = "Container group IP address"
  value       = azurerm_container_group.this.ip_address
}

output "fqdn" {
  description = "Container group FQDN"
  value       = azurerm_container_group.this.fqdn
}

output "container_group_id" {
  description = "Container group resource ID"
  value       = azurerm_container_group.this.id
}
