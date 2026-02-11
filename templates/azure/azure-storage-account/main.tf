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

resource "azurerm_storage_account" "this" {
  name                            = var.storage_account_name
  resource_group_name             = azurerm_resource_group.this.name
  location                        = azurerm_resource_group.this.location
  account_tier                    = var.account_tier
  account_replication_type        = var.replication_type
  account_kind                    = var.account_kind
  access_tier                     = var.access_tier
  enable_https_traffic_only       = true
  min_tls_version                 = var.min_tls_version
  allow_nested_items_to_be_public = var.allow_public_access
  tags                            = var.tags

  dynamic "blob_properties" {
    for_each = var.enable_versioning || var.enable_soft_delete ? [1] : []
    content {
      versioning_enabled = var.enable_versioning

      dynamic "delete_retention_policy" {
        for_each = var.enable_soft_delete ? [1] : []
        content {
          days = var.soft_delete_retention_days
        }
      }

      dynamic "container_delete_retention_policy" {
        for_each = var.enable_soft_delete ? [1] : []
        content {
          days = var.soft_delete_retention_days
        }
      }
    }
  }

  dynamic "network_rules" {
    for_each = var.enable_network_rules ? [1] : []
    content {
      default_action             = var.default_network_action
      bypass                     = var.network_bypass
      ip_rules                   = var.allowed_ip_ranges
      virtual_network_subnet_ids = var.allowed_subnet_ids
    }
  }
}

resource "azurerm_storage_container" "containers" {
  for_each = { for c in var.containers : c.name => c }

  name                  = each.value.name
  storage_account_name  = azurerm_storage_account.this.name
  container_access_type = each.value.access_type
}

resource "azurerm_storage_share" "shares" {
  for_each = { for s in var.file_shares : s.name => s }

  name                 = each.value.name
  storage_account_name = azurerm_storage_account.this.name
  quota                = each.value.quota_gb
}
