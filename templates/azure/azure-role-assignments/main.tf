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

data "azurerm_subscription" "current" {}

data "azurerm_client_config" "current" {}

resource "azurerm_role_assignment" "subscription_level" {
  for_each = { for ra in var.subscription_role_assignments : "${ra.principal_id}-${ra.role_definition_name}" => ra }

  scope                = data.azurerm_subscription.current.id
  role_definition_name = each.value.role_definition_name
  principal_id         = each.value.principal_id
  description          = each.value.description

  condition         = each.value.condition
  condition_version = each.value.condition != null ? "2.0" : null
}

resource "azurerm_role_assignment" "resource_group_level" {
  for_each = { for ra in var.resource_group_role_assignments : "${ra.principal_id}-${ra.role_definition_name}-${ra.resource_group_name}" => ra }

  scope                = "/subscriptions/${data.azurerm_subscription.current.subscription_id}/resourceGroups/${each.value.resource_group_name}"
  role_definition_name = each.value.role_definition_name
  principal_id         = each.value.principal_id
  description          = each.value.description
}

resource "azurerm_role_assignment" "resource_level" {
  for_each = { for ra in var.resource_role_assignments : "${ra.principal_id}-${ra.role_definition_name}-${ra.resource_id}" => ra }

  scope                = each.value.resource_id
  role_definition_name = each.value.role_definition_name
  principal_id         = each.value.principal_id
  description          = each.value.description
}

resource "azurerm_role_definition" "custom" {
  for_each = { for rd in var.custom_role_definitions : rd.name => rd }

  name        = each.value.name
  scope       = data.azurerm_subscription.current.id
  description = each.value.description

  permissions {
    actions          = each.value.actions
    not_actions      = each.value.not_actions
    data_actions     = each.value.data_actions
    not_data_actions = each.value.not_data_actions
  }

  assignable_scopes = each.value.assignable_scopes != null ? each.value.assignable_scopes : [data.azurerm_subscription.current.id]
}
