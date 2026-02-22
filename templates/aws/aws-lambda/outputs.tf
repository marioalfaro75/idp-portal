output "function_name" {
  description = "Name of the Lambda function"
  value       = aws_lambda_function.main.function_name
}

output "function_arn" {
  description = "ARN of the Lambda function"
  value       = aws_lambda_function.main.arn
}

output "function_invoke_arn" {
  description = "Invoke ARN of the Lambda function"
  value       = aws_lambda_function.main.invoke_arn
}

output "role_arn" {
  description = "ARN of the Lambda execution role"
  value       = aws_iam_role.lambda.arn
}

output "log_group_name" {
  description = "Name of the CloudWatch log group"
  value       = aws_cloudwatch_log_group.lambda.name
}

output "api_gateway_url" {
  description = "URL of the API Gateway endpoint"
  value       = var.create_api_gateway ? aws_apigatewayv2_stage.main[0].invoke_url : ""
}

output "api_gateway_id" {
  description = "ID of the API Gateway"
  value       = var.create_api_gateway ? aws_apigatewayv2_api.main[0].id : ""
}

output "function_version" {
  description = "Latest published version"
  value       = aws_lambda_function.main.version
}

output "qualified_arn" {
  description = "Qualified ARN with version"
  value       = aws_lambda_function.main.qualified_arn
}
