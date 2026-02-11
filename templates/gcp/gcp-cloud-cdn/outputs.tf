output "cdn_ip_address" {
  description = "The external IP address of the CDN endpoint"
  value       = google_compute_global_address.cdn_ip.address
}

output "bucket_name" {
  description = "The name of the backend GCS bucket"
  value       = google_storage_bucket.cdn_bucket.name
}

output "bucket_url" {
  description = "The gs:// URL of the backend bucket"
  value       = google_storage_bucket.cdn_bucket.url
}

output "backend_bucket_id" {
  description = "The ID of the CDN backend bucket"
  value       = google_compute_backend_bucket.cdn_backend.id
}

output "url_map_id" {
  description = "The ID of the URL map"
  value       = google_compute_url_map.cdn_url_map.id
}

output "cdn_url" {
  description = "The URL to access the CDN"
  value       = var.enable_ssl ? "https://${var.ssl_domains[0]}" : "http://${google_compute_global_address.cdn_ip.address}"
}

output "ssl_certificate_id" {
  description = "The ID of the managed SSL certificate (if enabled)"
  value       = var.enable_ssl ? google_compute_managed_ssl_certificate.cdn_ssl[0].id : null
}
