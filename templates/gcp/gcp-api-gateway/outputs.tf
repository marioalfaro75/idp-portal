output "api_id" {
  description = "The ID of the API Gateway API"
  value       = google_api_gateway_api.api.api_id
}

output "gateway_id" {
  description = "The ID of the API Gateway"
  value       = google_api_gateway_gateway.gateway.gateway_id
}

output "gateway_url" {
  description = "The default URL of the API Gateway"
  value       = google_api_gateway_gateway.gateway.default_hostname
}

output "api_config_id" {
  description = "The ID of the active API config"
  value       = google_api_gateway_api_config.config.api_config_id
}

output "managed_service" {
  description = "The managed service name created by API Gateway"
  value       = google_api_gateway_api.api.managed_service
}
