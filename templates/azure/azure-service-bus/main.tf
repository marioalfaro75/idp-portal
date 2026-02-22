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
  features {}
}

resource "azurerm_resource_group" "this" {
  name     = var.resource_group_name
  location = var.location

  tags = merge(var.tags, {
    ManagedBy = "terraform"
  })
}

resource "azurerm_servicebus_namespace" "this" {
  name                = var.namespace_name
  location            = azurerm_resource_group.this.location
  resource_group_name = azurerm_resource_group.this.name
  sku                 = var.sku

  tags = merge(var.tags, {
    ManagedBy = "terraform"
  })
}

resource "azurerm_servicebus_queue" "this" {
  name         = var.queue_name
  namespace_id = azurerm_servicebus_namespace.this.id

  max_delivery_count                   = var.max_delivery_count
  default_message_ttl                  = var.message_ttl
  lock_duration                        = var.lock_duration
  dead_lettering_on_message_expiration = true
  partitioning_enabled                 = var.enable_partitioning
}
