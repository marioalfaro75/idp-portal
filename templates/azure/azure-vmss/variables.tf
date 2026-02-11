variable "resource_group_name" {
  description = "Name of the resource group to create"
  type        = string
}

variable "location" {
  description = "Azure region for all resources"
  type        = string
  default     = "eastus2"
}

variable "vmss_name" {
  description = "Name of the VM Scale Set"
  type        = string
}

variable "vm_sku" {
  description = "VM SKU size for instances in the scale set"
  type        = string
  default     = "Standard_B2s"
}

variable "instance_count" {
  description = "Initial number of VM instances"
  type        = number
  default     = 2
}

variable "admin_username" {
  description = "Admin username for the VMs"
  type        = string
  default     = "azureadmin"
}

variable "ssh_public_key" {
  description = "SSH public key for VM authentication"
  type        = string
}

variable "subnet_id" {
  description = "ID of the subnet to deploy the VMSS into"
  type        = string
}

variable "image_publisher" {
  description = "Publisher of the VM image"
  type        = string
  default     = "Canonical"
}

variable "image_offer" {
  description = "Offer of the VM image"
  type        = string
  default     = "0001-com-ubuntu-server-jammy"
}

variable "image_sku" {
  description = "SKU of the VM image"
  type        = string
  default     = "22_04-lts"
}

variable "image_version" {
  description = "Version of the VM image"
  type        = string
  default     = "latest"
}

variable "os_disk_type" {
  description = "Storage account type for the OS disk"
  type        = string
  default     = "Standard_LRS"
}

variable "os_disk_size_gb" {
  description = "Size of the OS disk in GB"
  type        = number
  default     = 30
}

variable "upgrade_mode" {
  description = "Upgrade mode for the VMSS (Manual, Rolling, or Automatic)"
  type        = string
  default     = "Rolling"
}

variable "enable_autoscale" {
  description = "Whether to enable autoscaling"
  type        = bool
  default     = true
}

variable "autoscale_min" {
  description = "Minimum number of instances for autoscale"
  type        = number
  default     = 2
}

variable "autoscale_max" {
  description = "Maximum number of instances for autoscale"
  type        = number
  default     = 10
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}
