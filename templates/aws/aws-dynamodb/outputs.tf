output "table_id" {
  description = "ID of the DynamoDB table"
  value       = aws_dynamodb_table.main.id
}

output "table_arn" {
  description = "ARN of the DynamoDB table"
  value       = aws_dynamodb_table.main.arn
}

output "table_name" {
  description = "Name of the DynamoDB table"
  value       = aws_dynamodb_table.main.name
}

output "table_hash_key" {
  description = "Hash key of the table"
  value       = aws_dynamodb_table.main.hash_key
}

output "table_range_key" {
  description = "Range key of the table"
  value       = aws_dynamodb_table.main.range_key
}

output "table_stream_arn" {
  description = "ARN of the DynamoDB stream (empty if streams are disabled)"
  value       = var.stream_enabled ? aws_dynamodb_table.main.stream_arn : ""
}

output "table_stream_label" {
  description = "Timestamp label of the DynamoDB stream"
  value       = var.stream_enabled ? aws_dynamodb_table.main.stream_label : ""
}
