output "network_id" {
  description = "The ID of the VPC network"
  value       = google_compute_network.vpc.id
}

output "network_name" {
  description = "The name of the VPC network"
  value       = google_compute_network.vpc.name
}

output "network_self_link" {
  description = "The self link of the VPC network"
  value       = google_compute_network.vpc.self_link
}

output "subnet_ids" {
  description = "Map of subnet names to their IDs"
  value       = { for k, v in google_compute_subnetwork.subnets : k => v.id }
}

output "subnet_self_links" {
  description = "Map of subnet names to their self links"
  value       = { for k, v in google_compute_subnetwork.subnets : k => v.self_link }
}

output "nat_ip" {
  description = "The external IP of the Cloud NAT gateway"
  value       = var.create_nat_gateway ? google_compute_router_nat.nat[0].name : null
}

output "router_name" {
  description = "The name of the Cloud Router"
  value       = var.create_nat_gateway ? google_compute_router.router[0].name : null
}
