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

resource "azurerm_log_analytics_workspace" "this" {
  name                = var.workspace_name
  location            = azurerm_resource_group.this.location
  resource_group_name = azurerm_resource_group.this.name
  sku                 = var.sku
  retention_in_days   = var.retention_in_days
  daily_quota_gb      = var.daily_quota_gb
  tags                = merge(var.tags, { ManagedBy = "terraform" })
}

resource "azurerm_log_analytics_solution" "solutions" {
  for_each = toset(var.solutions)

  solution_name         = each.value
  location              = azurerm_resource_group.this.location
  resource_group_name   = azurerm_resource_group.this.name
  workspace_resource_id = azurerm_log_analytics_workspace.this.id
  workspace_name        = azurerm_log_analytics_workspace.this.name

  plan {
    publisher = "Microsoft"
    product   = "OMSGallery/${each.value}"
  }
}

resource "azurerm_log_analytics_datasource_windows_event" "windows_events" {
  for_each = { for e in var.windows_event_logs : e.name => e }

  name                = each.value.name
  resource_group_name = azurerm_resource_group.this.name
  workspace_name      = azurerm_log_analytics_workspace.this.name
  event_log_name      = each.value.event_log_name
  event_types         = each.value.event_types
}

resource "azurerm_monitor_diagnostic_setting" "this" {
  for_each = { for d in var.diagnostic_settings : d.name => d }

  name                       = each.value.name
  target_resource_id         = each.value.target_resource_id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.this.id

  dynamic "enabled_log" {
    for_each = each.value.log_categories
    content {
      category = enabled_log.value
    }
  }

  dynamic "metric" {
    for_each = each.value.metric_categories
    content {
      category = metric.value
      enabled  = true
    }
  }
}
