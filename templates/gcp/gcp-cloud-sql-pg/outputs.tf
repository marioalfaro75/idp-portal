output "instance_name" {
  description = "The name of the Cloud SQL instance"
  value       = google_sql_database_instance.postgres.name
}

output "instance_connection_name" {
  description = "The connection name for the instance (project:region:instance)"
  value       = google_sql_database_instance.postgres.connection_name
}

output "instance_self_link" {
  description = "The self link of the Cloud SQL instance"
  value       = google_sql_database_instance.postgres.self_link
}

output "private_ip_address" {
  description = "The private IP address of the instance"
  value       = google_sql_database_instance.postgres.private_ip_address
}

output "public_ip_address" {
  description = "The public IP address of the instance (if enabled)"
  value       = google_sql_database_instance.postgres.public_ip_address
}

output "database_name" {
  description = "The name of the default database"
  value       = google_sql_database.database.name
}

output "db_user" {
  description = "The default database user"
  value       = google_sql_user.default.name
}

output "db_password_secret_id" {
  description = "The Secret Manager secret ID for the database password"
  value       = var.store_password_in_secret_manager ? google_secret_manager_secret.db_password[0].secret_id : null
}

output "server_ca_cert" {
  description = "The CA certificate of the Cloud SQL instance"
  value       = google_sql_database_instance.postgres.server_ca_cert[0].cert
  sensitive   = true
}

output "connection_name" {
  description = "Cloud SQL connection name"
  value       = google_sql_database_instance.postgres.connection_name
}
