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

resource "azurerm_storage_account" "this" {
  name                     = var.storage_account_name
  resource_group_name      = azurerm_resource_group.this.name
  location                 = azurerm_resource_group.this.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  tags                     = merge(var.tags, { ManagedBy = "terraform" })
}

resource "azurerm_service_plan" "this" {
  name                = "${var.function_app_name}-plan"
  location            = azurerm_resource_group.this.location
  resource_group_name = azurerm_resource_group.this.name
  os_type             = var.os_type
  sku_name            = var.sku_name
  tags                = merge(var.tags, { ManagedBy = "terraform" })
}

resource "azurerm_application_insights" "this" {
  count               = var.enable_app_insights ? 1 : 0
  name                = "${var.function_app_name}-insights"
  location            = azurerm_resource_group.this.location
  resource_group_name = azurerm_resource_group.this.name
  application_type    = "web"
  tags                = merge(var.tags, { ManagedBy = "terraform" })
}

resource "azurerm_linux_function_app" "this" {
  count               = var.os_type == "Linux" ? 1 : 0
  name                = var.function_app_name
  location            = azurerm_resource_group.this.location
  resource_group_name = azurerm_resource_group.this.name
  service_plan_id     = azurerm_service_plan.this.id
  tags                = merge(var.tags, { ManagedBy = "terraform" })

  storage_account_name       = azurerm_storage_account.this.name
  storage_account_access_key = azurerm_storage_account.this.primary_access_key

  site_config {
    application_stack {
      node_version = var.runtime == "node" ? var.runtime_version : null
      python_version = var.runtime == "python" ? var.runtime_version : null
      dotnet_version = var.runtime == "dotnet" ? var.runtime_version : null
    }

    cors {
      allowed_origins = var.cors_allowed_origins
    }
  }

  app_settings = merge(
    var.app_settings,
    var.enable_app_insights ? {
      "APPINSIGHTS_INSTRUMENTATIONKEY"             = azurerm_application_insights.this[0].instrumentation_key
      "APPLICATIONINSIGHTS_CONNECTION_STRING"       = azurerm_application_insights.this[0].connection_string
    } : {}
  )

  identity {
    type = "SystemAssigned"
  }
}

resource "azurerm_windows_function_app" "this" {
  count               = var.os_type == "Windows" ? 1 : 0
  name                = var.function_app_name
  location            = azurerm_resource_group.this.location
  resource_group_name = azurerm_resource_group.this.name
  service_plan_id     = azurerm_service_plan.this.id
  tags                = merge(var.tags, { ManagedBy = "terraform" })

  storage_account_name       = azurerm_storage_account.this.name
  storage_account_access_key = azurerm_storage_account.this.primary_access_key

  site_config {
    application_stack {
      node_version   = var.runtime == "node" ? var.runtime_version : null
      dotnet_version = var.runtime == "dotnet" ? var.runtime_version : null
    }
  }

  app_settings = merge(
    var.app_settings,
    var.enable_app_insights ? {
      "APPINSIGHTS_INSTRUMENTATIONKEY"             = azurerm_application_insights.this[0].instrumentation_key
      "APPLICATIONINSIGHTS_CONNECTION_STRING"       = azurerm_application_insights.this[0].connection_string
    } : {}
  )

  identity {
    type = "SystemAssigned"
  }
}
