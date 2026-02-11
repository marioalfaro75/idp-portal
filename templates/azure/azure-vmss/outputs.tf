output "vmss_id" {
  description = "The ID of the VM Scale Set"
  value       = azurerm_linux_virtual_machine_scale_set.this.id
}

output "vmss_name" {
  description = "The name of the VM Scale Set"
  value       = azurerm_linux_virtual_machine_scale_set.this.name
}

output "vmss_unique_id" {
  description = "The unique ID of the VM Scale Set"
  value       = azurerm_linux_virtual_machine_scale_set.this.unique_id
}

output "vmss_identity" {
  description = "The identity of the VM Scale Set"
  value       = azurerm_linux_virtual_machine_scale_set.this.identity
}

output "resource_group_name" {
  description = "The name of the resource group"
  value       = azurerm_resource_group.this.name
}

output "autoscale_setting_id" {
  description = "The ID of the autoscale setting"
  value       = var.enable_autoscale ? azurerm_monitor_autoscale_setting.this[0].id : null
}
