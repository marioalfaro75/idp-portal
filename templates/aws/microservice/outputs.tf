output "service_url" {
  description = "URL of the deployed service"
  value       = "https://${var.service_name}.example.com"
}

output "ecr_repository" {
  description = "ECR repository URI for the service"
  value       = aws_ecr_repository.main.repository_url
}
