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
  tags     = merge(var.tags, { ManagedBy = "terraform" })
}

resource "azurerm_api_management" "this" {
  name                = var.apim_name
  location            = azurerm_resource_group.this.location
  resource_group_name = azurerm_resource_group.this.name
  publisher_name      = var.publisher_name
  publisher_email     = var.publisher_email
  sku_name            = "${var.sku_name}_${var.sku_capacity}"
  tags                = merge(var.tags, { ManagedBy = "terraform" })

  identity {
    type = "SystemAssigned"
  }

  dynamic "virtual_network_configuration" {
    for_each = var.subnet_id != null ? [1] : []
    content {
      subnet_id = var.subnet_id
    }
  }

  virtual_network_type = var.virtual_network_type
}

resource "azurerm_api_management_product" "this" {
  for_each = { for p in var.products : p.product_id => p }

  product_id            = each.value.product_id
  api_management_name   = azurerm_api_management.this.name
  resource_group_name   = azurerm_resource_group.this.name
  display_name          = each.value.display_name
  description           = each.value.description
  subscription_required = each.value.subscription_required
  approval_required     = each.value.approval_required
  published             = each.value.published
}

resource "azurerm_api_management_named_value" "this" {
  for_each = var.named_values

  name                = each.key
  resource_group_name = azurerm_resource_group.this.name
  api_management_name = azurerm_api_management.this.name
  display_name        = each.key
  value               = each.value
}
