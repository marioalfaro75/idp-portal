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

resource "azurerm_linux_virtual_machine_scale_set" "this" {
  name                            = var.vmss_name
  location                        = azurerm_resource_group.this.location
  resource_group_name             = azurerm_resource_group.this.name
  sku                             = var.vm_sku
  instances                       = var.instance_count
  admin_username                  = var.admin_username
  disable_password_authentication = true
  upgrade_mode                    = var.upgrade_mode
  tags                            = merge(var.tags, { ManagedBy = "terraform" })

  admin_ssh_key {
    username   = var.admin_username
    public_key = var.ssh_public_key
  }

  source_image_reference {
    publisher = var.image_publisher
    offer     = var.image_offer
    sku       = var.image_sku
    version   = var.image_version
  }

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = var.os_disk_type
    disk_size_gb         = var.os_disk_size_gb
  }

  network_interface {
    name    = "${var.vmss_name}-nic"
    primary = true

    ip_configuration {
      name      = "internal"
      primary   = true
      subnet_id = var.subnet_id
    }
  }

  dynamic "automatic_os_upgrade_policy" {
    for_each = var.upgrade_mode == "Automatic" ? [1] : []
    content {
      disable_automatic_rollback  = false
      enable_automatic_os_upgrade = true
    }
  }

  dynamic "rolling_upgrade_policy" {
    for_each = var.upgrade_mode != "Manual" ? [1] : []
    content {
      max_batch_instance_percent              = 20
      max_unhealthy_instance_percent          = 20
      max_unhealthy_upgraded_instance_percent = 5
      pause_time_between_batches              = "PT0S"
    }
  }
}

resource "azurerm_monitor_autoscale_setting" "this" {
  count               = var.enable_autoscale ? 1 : 0
  name                = "${var.vmss_name}-autoscale"
  location            = azurerm_resource_group.this.location
  resource_group_name = azurerm_resource_group.this.name
  target_resource_id  = azurerm_linux_virtual_machine_scale_set.this.id

  profile {
    name = "default"

    capacity {
      default = var.instance_count
      minimum = var.autoscale_min
      maximum = var.autoscale_max
    }

    rule {
      metric_trigger {
        metric_name        = "Percentage CPU"
        metric_resource_id = azurerm_linux_virtual_machine_scale_set.this.id
        time_grain         = "PT1M"
        statistic          = "Average"
        time_window        = "PT5M"
        time_aggregation   = "Average"
        operator           = "GreaterThan"
        threshold          = 75
      }
      scale_action {
        direction = "Increase"
        type      = "ChangeCount"
        value     = "1"
        cooldown  = "PT5M"
      }
    }

    rule {
      metric_trigger {
        metric_name        = "Percentage CPU"
        metric_resource_id = azurerm_linux_virtual_machine_scale_set.this.id
        time_grain         = "PT1M"
        statistic          = "Average"
        time_window        = "PT5M"
        time_aggregation   = "Average"
        operator           = "LessThan"
        threshold          = 25
      }
      scale_action {
        direction = "Decrease"
        type      = "ChangeCount"
        value     = "1"
        cooldown  = "PT5M"
      }
    }
  }
}
