output "lb_ip_address" {
  description = "The external IP address of the load balancer"
  value       = google_compute_global_address.lb_ip.address
}

output "backend_service_id" {
  description = "The ID of the backend service"
  value       = google_compute_backend_service.default.id
}

output "url_map_id" {
  description = "The ID of the URL map"
  value       = google_compute_url_map.default.id
}

output "health_check_id" {
  description = "The ID of the health check"
  value       = google_compute_health_check.http.id
}

output "ssl_certificate_id" {
  description = "The ID of the managed SSL certificate (if enabled)"
  value       = var.enable_ssl ? google_compute_managed_ssl_certificate.default[0].id : null
}

output "http_proxy_id" {
  description = "The ID of the HTTP(S) target proxy"
  value       = var.enable_ssl ? google_compute_target_https_proxy.https[0].id : google_compute_target_http_proxy.http[0].id
}
