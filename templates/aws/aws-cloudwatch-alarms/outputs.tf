output "sns_topic_arn" {
  description = "ARN of the alarm notification SNS topic"
  value       = var.create_sns_topic ? aws_sns_topic.alarm_notifications[0].arn : ""
}

output "cpu_alarm_arn" {
  description = "ARN of the CPU utilization alarm"
  value       = var.create_cpu_alarm ? aws_cloudwatch_metric_alarm.cpu_high[0].arn : ""
}

output "memory_alarm_arn" {
  description = "ARN of the memory utilization alarm"
  value       = var.create_memory_alarm ? aws_cloudwatch_metric_alarm.memory_high[0].arn : ""
}

output "error_alarm_arn" {
  description = "ARN of the error rate alarm"
  value       = var.create_error_alarm ? aws_cloudwatch_metric_alarm.error_rate[0].arn : ""
}

output "latency_alarm_arn" {
  description = "ARN of the latency alarm"
  value       = var.create_latency_alarm ? aws_cloudwatch_metric_alarm.latency_high[0].arn : ""
}

output "custom_alarm_arns" {
  description = "Map of custom alarm names to their ARNs"
  value       = { for k, v in aws_cloudwatch_metric_alarm.custom : k => v.arn }
}
