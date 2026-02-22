output "db_instance_id" {
  description = "ID of the RDS instance"
  value       = aws_db_instance.main.id
}

output "db_instance_arn" {
  description = "ARN of the RDS instance"
  value       = aws_db_instance.main.arn
}

output "db_endpoint" {
  description = "Connection endpoint for the database"
  value       = aws_db_instance.main.endpoint
}

output "db_address" {
  description = "Hostname of the database (without port)"
  value       = aws_db_instance.main.address
}

output "db_port" {
  description = "Port of the database"
  value       = aws_db_instance.main.port
}

output "db_name" {
  description = "Name of the default database"
  value       = aws_db_instance.main.db_name
}

output "db_security_group_id" {
  description = "ID of the RDS security group"
  value       = aws_security_group.rds.id
}

output "db_subnet_group_name" {
  description = "Name of the DB subnet group"
  value       = aws_db_subnet_group.main.name
}

output "hosted_zone_id" {
  description = "RDS instance hosted zone ID"
  value       = aws_db_instance.main.hosted_zone_id
}

output "resource_id" {
  description = "RDS instance resource ID"
  value       = aws_db_instance.main.resource_id
}

output "engine_version_actual" {
  description = "Running engine version"
  value       = aws_db_instance.main.engine_version_actual
}

output "status" {
  description = "RDS instance status"
  value       = aws_db_instance.main.status
}

output "parameter_group_id" {
  description = "DB parameter group ID"
  value       = aws_db_parameter_group.main.id
}
