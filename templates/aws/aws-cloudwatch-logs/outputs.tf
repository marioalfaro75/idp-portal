output "log_group_name" {
  description = "Name of the CloudWatch log group"
  value       = aws_cloudwatch_log_group.main.name
}

output "log_group_arn" {
  description = "ARN of the CloudWatch log group"
  value       = aws_cloudwatch_log_group.main.arn
}

output "writer_policy_arn" {
  description = "ARN of the log writer IAM policy"
  value       = var.create_writer_policy ? aws_iam_policy.log_writer[0].arn : ""
}

output "reader_policy_arn" {
  description = "ARN of the log reader IAM policy"
  value       = var.create_reader_policy ? aws_iam_policy.log_reader[0].arn : ""
}

output "metric_filter_names" {
  description = "Names of the metric filters"
  value       = [for f in aws_cloudwatch_log_metric_filter.filters : f.name]
}
