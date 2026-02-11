output "role_id" {
  description = "ID of the IAM role"
  value       = aws_iam_role.main.id
}

output "role_arn" {
  description = "ARN of the IAM role"
  value       = aws_iam_role.main.arn
}

output "role_name" {
  description = "Name of the IAM role"
  value       = aws_iam_role.main.name
}

output "custom_policy_arns" {
  description = "List of ARNs of the custom IAM policies"
  value       = aws_iam_policy.custom[*].arn
}

output "instance_profile_arn" {
  description = "ARN of the instance profile (empty if not created)"
  value       = var.create_instance_profile ? aws_iam_instance_profile.main[0].arn : ""
}

output "instance_profile_name" {
  description = "Name of the instance profile (empty if not created)"
  value       = var.create_instance_profile ? aws_iam_instance_profile.main[0].name : ""
}
