terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "this" {
  name     = var.resource_group_name
  location = var.location
  tags     = var.tags
}

resource "azurerm_cosmosdb_account" "this" {
  name                      = var.account_name
  location                  = azurerm_resource_group.this.location
  resource_group_name       = azurerm_resource_group.this.name
  offer_type                = "Standard"
  kind                      = var.kind
  automatic_failover_enabled = var.enable_automatic_failover
  free_tier_enabled          = var.enable_free_tier
  tags                      = var.tags

  consistency_policy {
    consistency_level       = var.consistency_level
    max_interval_in_seconds = var.consistency_level == "BoundedStaleness" ? var.max_staleness_interval : null
    max_staleness_prefix    = var.consistency_level == "BoundedStaleness" ? var.max_staleness_prefix : null
  }

  geo_location {
    location          = azurerm_resource_group.this.location
    failover_priority = 0
    zone_redundant    = var.zone_redundant
  }

  dynamic "geo_location" {
    for_each = var.secondary_locations
    content {
      location          = geo_location.value.location
      failover_priority = geo_location.value.failover_priority
      zone_redundant    = geo_location.value.zone_redundant
    }
  }

  dynamic "capabilities" {
    for_each = var.capabilities
    content {
      name = capabilities.value
    }
  }

  backup {
    type                = var.backup_type
    interval_in_minutes = var.backup_type == "Periodic" ? var.backup_interval : null
    retention_in_hours  = var.backup_type == "Periodic" ? var.backup_retention : null
  }
}

resource "azurerm_cosmosdb_sql_database" "this" {
  count               = var.kind == "GlobalDocumentDB" && var.create_sql_database ? 1 : 0
  name                = var.sql_database_name
  resource_group_name = azurerm_resource_group.this.name
  account_name        = azurerm_cosmosdb_account.this.name
  throughput          = var.database_throughput
}

resource "azurerm_cosmosdb_sql_container" "this" {
  count                 = var.kind == "GlobalDocumentDB" && var.create_sql_database ? 1 : 0
  name                  = var.sql_container_name
  resource_group_name   = azurerm_resource_group.this.name
  account_name          = azurerm_cosmosdb_account.this.name
  database_name         = azurerm_cosmosdb_sql_database.this[0].name
  partition_key_path    = var.partition_key_path
  partition_key_version = 2
  throughput            = var.container_throughput

  indexing_policy {
    indexing_mode = "consistent"

    included_path {
      path = "/*"
    }

    excluded_path {
      path = "/\"_etag\"/?"
    }
  }
}
