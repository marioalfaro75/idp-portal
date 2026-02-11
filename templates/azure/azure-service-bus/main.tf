terraform {
  required_providers {
    azurerm = {
      source = "hashicorp/azurerm"
    }
  }
}

provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "this" {
  name     = var.resource_group_name
  location = var.location
}

resource "azurerm_servicebus_namespace" "this" {
  name                = var.namespace_name
  location            = azurerm_resource_group.this.location
  resource_group_name = azurerm_resource_group.this.name
  sku                 = var.sku

  tags = {
    environment = var.environment
  }
}

resource "azurerm_servicebus_queue" "this" {
  name         = var.queue_name
  namespace_id = azurerm_servicebus_namespace.this.id

  max_delivery_count                   = var.max_delivery_count
  default_message_ttl                  = var.message_ttl
  lock_duration                        = var.lock_duration
  dead_lettering_on_message_expiration = true
  enable_partitioning                  = var.enable_partitioning
}
