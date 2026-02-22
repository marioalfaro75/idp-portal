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

resource "azurerm_container_group" "this" {
  name                = var.container_group_name
  location            = azurerm_resource_group.this.location
  resource_group_name = azurerm_resource_group.this.name
  os_type             = "Linux"
  ip_address_type     = var.ip_address_type
  dns_name_label      = var.dns_name_label

  container {
    name   = var.container_name
    image  = var.container_image
    cpu    = var.cpu
    memory = var.memory

    ports {
      port     = var.container_port
      protocol = "TCP"
    }
  }

  tags = merge(var.tags, {
    ManagedBy = "terraform"
  })
}
