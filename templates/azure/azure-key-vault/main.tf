terraform {
  required_version = ">= 1.5"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy    = var.purge_on_destroy
      recover_soft_deleted_key_vaults = true
    }
  }
}

data "azurerm_client_config" "current" {}

resource "azurerm_resource_group" "this" {
  name     = var.resource_group_name
  location = var.location
  tags     = merge(var.tags, { ManagedBy = "terraform" })
}

resource "azurerm_key_vault" "this" {
  name                        = var.key_vault_name
  location                    = azurerm_resource_group.this.location
  resource_group_name         = azurerm_resource_group.this.name
  tenant_id                   = data.azurerm_client_config.current.tenant_id
  sku_name                    = var.sku_name
  soft_delete_retention_days  = var.soft_delete_retention_days
  purge_protection_enabled    = var.purge_protection_enabled
  rbac_authorization_enabled  = var.enable_rbac_authorization
  enabled_for_deployment      = var.enabled_for_deployment
  enabled_for_disk_encryption = var.enabled_for_disk_encryption
  tags                        = merge(var.tags, { ManagedBy = "terraform" })

  dynamic "network_acls" {
    for_each = var.enable_network_acls ? [1] : []
    content {
      default_action             = var.network_default_action
      bypass                     = var.network_bypass
      ip_rules                   = var.allowed_ip_ranges
      virtual_network_subnet_ids = var.allowed_subnet_ids
    }
  }

  dynamic "access_policy" {
    for_each = var.enable_rbac_authorization ? [] : [1]
    content {
      tenant_id = data.azurerm_client_config.current.tenant_id
      object_id = data.azurerm_client_config.current.object_id

      key_permissions = [
        "Get", "List", "Create", "Delete", "Update", "Recover", "Purge", "GetRotationPolicy"
      ]

      secret_permissions = [
        "Get", "List", "Set", "Delete", "Recover", "Purge"
      ]

      certificate_permissions = [
        "Get", "List", "Create", "Delete", "Update", "Recover", "Purge"
      ]
    }
  }

  dynamic "access_policy" {
    for_each = var.enable_rbac_authorization ? [] : var.access_policies
    content {
      tenant_id               = data.azurerm_client_config.current.tenant_id
      object_id               = access_policy.value.object_id
      key_permissions         = access_policy.value.key_permissions
      secret_permissions      = access_policy.value.secret_permissions
      certificate_permissions = access_policy.value.certificate_permissions
    }
  }
}

resource "azurerm_key_vault_secret" "secrets" {
  for_each = var.secrets

  name         = each.key
  value        = each.value
  key_vault_id = azurerm_key_vault.this.id
}

resource "azurerm_management_lock" "this" {
  count      = var.lock != null ? 1 : 0
  name       = coalesce(var.lock.name, "${var.key_vault_name}-lock")
  scope      = azurerm_key_vault.this.id
  lock_level = var.lock.kind
}
