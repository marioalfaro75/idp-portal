output "instance_group_id" {
  description = "The ID of the managed instance group"
  value       = google_compute_region_instance_group_manager.default.id
}

output "instance_group_self_link" {
  description = "The self link of the managed instance group"
  value       = google_compute_region_instance_group_manager.default.self_link
}

output "instance_group" {
  description = "The instance group URL for use with load balancers"
  value       = google_compute_region_instance_group_manager.default.instance_group
}

output "instance_template_id" {
  description = "The ID of the instance template"
  value       = google_compute_instance_template.default.id
}

output "health_check_id" {
  description = "The ID of the autohealing health check"
  value       = google_compute_health_check.autohealing.id
}

output "autoscaler_id" {
  description = "The ID of the autoscaler (if enabled)"
  value       = var.enable_autoscaling ? google_compute_region_autoscaler.default[0].id : null
}
