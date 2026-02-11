output "topic_endpoint" {
  description = "Event Grid topic endpoint"
  value       = azurerm_eventgrid_topic.this.endpoint
}

output "topic_id" {
  description = "Event Grid topic resource ID"
  value       = azurerm_eventgrid_topic.this.id
}

output "primary_access_key" {
  description = "Primary access key"
  value       = azurerm_eventgrid_topic.this.primary_access_key
  sensitive   = true
}
