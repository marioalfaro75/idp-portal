output "notification_channel_ids" {
  description = "The IDs of the notification channels"
  value       = [for ch in google_monitoring_notification_channel.email : ch.id]
}

output "cpu_alert_policy_id" {
  description = "The ID of the CPU utilization alert policy"
  value       = var.enable_cpu_alert ? google_monitoring_alert_policy.cpu_utilization[0].id : null
}

output "memory_alert_policy_id" {
  description = "The ID of the memory utilization alert policy"
  value       = var.enable_memory_alert ? google_monitoring_alert_policy.memory_utilization[0].id : null
}

output "disk_alert_policy_id" {
  description = "The ID of the disk utilization alert policy"
  value       = var.enable_disk_alert ? google_monitoring_alert_policy.disk_utilization[0].id : null
}

output "uptime_check_id" {
  description = "The ID of the uptime check (if enabled)"
  value       = var.uptime_check_url != null ? google_monitoring_uptime_check_config.https[0].uptime_check_id : null
}

output "uptime_alert_policy_id" {
  description = "The ID of the uptime alert policy (if enabled)"
  value       = var.uptime_check_url != null ? google_monitoring_alert_policy.uptime_check[0].id : null
}
