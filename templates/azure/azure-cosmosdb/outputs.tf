output "account_id" {
  description = "The ID of the Cosmos DB account"
  value       = azurerm_cosmosdb_account.this.id
}

output "account_name" {
  description = "The name of the Cosmos DB account"
  value       = azurerm_cosmosdb_account.this.name
}

output "endpoint" {
  description = "The endpoint URL for the Cosmos DB account"
  value       = azurerm_cosmosdb_account.this.endpoint
}

output "primary_key" {
  description = "The primary key for the Cosmos DB account"
  value       = azurerm_cosmosdb_account.this.primary_key
  sensitive   = true
}

output "connection_strings" {
  description = "The connection strings for the Cosmos DB account"
  value       = azurerm_cosmosdb_account.this.connection_strings
  sensitive   = true
}

output "sql_database_id" {
  description = "The ID of the SQL database"
  value       = var.create_sql_database ? azurerm_cosmosdb_sql_database.this[0].id : null
}

output "sql_container_id" {
  description = "The ID of the SQL container"
  value       = var.create_sql_database ? azurerm_cosmosdb_sql_container.this[0].id : null
}

output "resource_group_name" {
  description = "The name of the resource group"
  value       = azurerm_resource_group.this.name
}
