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

resource "azurerm_monitor_action_group" "this" {
  name                = var.action_group_name
  resource_group_name = azurerm_resource_group.this.name
  short_name          = var.action_group_short_name
  enabled             = true
  tags                = merge(var.tags, { ManagedBy = "terraform" })

  dynamic "email_receiver" {
    for_each = var.email_receivers
    content {
      name                    = email_receiver.value.name
      email_address           = email_receiver.value.email
      use_common_alert_schema = true
    }
  }

  dynamic "webhook_receiver" {
    for_each = var.webhook_receivers
    content {
      name                    = webhook_receiver.value.name
      service_uri             = webhook_receiver.value.uri
      use_common_alert_schema = true
    }
  }
}

resource "azurerm_monitor_metric_alert" "this" {
  for_each = { for a in var.metric_alerts : a.name => a }

  name                = each.value.name
  resource_group_name = azurerm_resource_group.this.name
  scopes              = each.value.scopes
  description         = each.value.description
  severity            = each.value.severity
  frequency           = each.value.frequency
  window_size         = each.value.window_size
  enabled             = each.value.enabled
  auto_mitigate       = each.value.auto_mitigate
  tags                = merge(var.tags, { ManagedBy = "terraform" })

  criteria {
    metric_namespace = each.value.metric_namespace
    metric_name      = each.value.metric_name
    aggregation      = each.value.aggregation
    operator         = each.value.operator
    threshold        = each.value.threshold
  }

  action {
    action_group_id = azurerm_monitor_action_group.this.id
  }
}

resource "azurerm_monitor_activity_log_alert" "this" {
  for_each = { for a in var.activity_log_alerts : a.name => a }

  name                = each.value.name
  resource_group_name = azurerm_resource_group.this.name
  scopes              = each.value.scopes
  description         = each.value.description
  enabled             = each.value.enabled
  tags                = merge(var.tags, { ManagedBy = "terraform" })

  criteria {
    category       = each.value.category
    operation_name = each.value.operation_name
    level          = each.value.level
  }

  action {
    action_group_id = azurerm_monitor_action_group.this.id
  }
}
