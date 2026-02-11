output "namespace_id" {
  description = "Service Bus namespace ID"
  value       = azurerm_servicebus_namespace.this.id
}

output "namespace_connection_string" {
  description = "Primary connection string"
  value       = azurerm_servicebus_namespace.this.default_primary_connection_string
  sensitive   = true
}

output "queue_id" {
  description = "Queue resource ID"
  value       = azurerm_servicebus_queue.this.id
}
