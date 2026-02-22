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

resource "azurerm_kubernetes_cluster" "this" {
  name                = var.cluster_name
  location            = azurerm_resource_group.this.location
  resource_group_name = azurerm_resource_group.this.name
  dns_prefix          = var.dns_prefix
  kubernetes_version  = var.kubernetes_version
  sku_tier            = var.sku_tier
  tags                = merge(var.tags, { ManagedBy = "terraform" })

  default_node_pool {
    name                = "default"
    node_count          = var.default_node_count
    vm_size             = var.default_node_vm_size
    os_disk_size_gb     = var.os_disk_size_gb
    vnet_subnet_id      = var.subnet_id
    auto_scaling_enabled = var.enable_auto_scaling
    min_count            = var.enable_auto_scaling ? var.min_node_count : null
    max_count            = var.enable_auto_scaling ? var.max_node_count : null
    max_pods            = var.max_pods
    tags                = merge(var.tags, { ManagedBy = "terraform" })
  }

  identity {
    type = "SystemAssigned"
  }

  network_profile {
    network_plugin    = var.network_plugin
    network_policy    = var.network_policy
    load_balancer_sku = "standard"
    service_cidr      = var.service_cidr
    dns_service_ip    = var.dns_service_ip
  }

  dynamic "oms_agent" {
    for_each = var.log_analytics_workspace_id != null ? [1] : []
    content {
      log_analytics_workspace_id = var.log_analytics_workspace_id
    }
  }

  azure_active_directory_role_based_access_control {
    managed                = true
    azure_rbac_enabled     = var.azure_rbac_enabled
    admin_group_object_ids = var.admin_group_object_ids
  }
}

resource "azurerm_management_lock" "this" {
  count      = var.lock != null ? 1 : 0
  name       = coalesce(var.lock.name, "${var.cluster_name}-lock")
  scope      = azurerm_kubernetes_cluster.this.id
  lock_level = var.lock.kind
}
