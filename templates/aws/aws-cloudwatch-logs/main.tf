terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.region
}

resource "aws_cloudwatch_log_group" "main" {
  name              = var.log_group_name
  retention_in_days = var.retention_in_days
  kms_key_id        = var.kms_key_id
  log_group_class   = var.log_group_class

  tags = merge(var.tags, {
    Name = var.log_group_name
  })
}

resource "aws_cloudwatch_log_metric_filter" "filters" {
  for_each = { for filter in var.metric_filters : filter.name => filter }

  name           = each.value.name
  pattern        = each.value.pattern
  log_group_name = aws_cloudwatch_log_group.main.name

  metric_transformation {
    name          = each.value.metric_name
    namespace     = each.value.metric_namespace
    value         = each.value.metric_value
    default_value = each.value.default_value
  }
}

resource "aws_cloudwatch_log_subscription_filter" "lambda" {
  count           = var.lambda_subscription_arn != "" ? 1 : 0
  name            = "${var.log_group_name}-lambda-subscription"
  log_group_name  = aws_cloudwatch_log_group.main.name
  filter_pattern  = var.subscription_filter_pattern
  destination_arn = var.lambda_subscription_arn
}

resource "aws_cloudwatch_log_subscription_filter" "kinesis" {
  count           = var.kinesis_subscription_arn != "" ? 1 : 0
  name            = "${var.log_group_name}-kinesis-subscription"
  log_group_name  = aws_cloudwatch_log_group.main.name
  filter_pattern  = var.subscription_filter_pattern
  destination_arn = var.kinesis_subscription_arn
  role_arn        = var.kinesis_subscription_role_arn
}

resource "aws_cloudwatch_query_definition" "queries" {
  for_each = { for query in var.saved_queries : query.name => query }

  name            = each.value.name
  log_group_names = [aws_cloudwatch_log_group.main.name]
  query_string    = each.value.query_string
}

resource "aws_iam_policy" "log_writer" {
  count       = var.create_writer_policy ? 1 : 0
  name        = "${replace(var.log_group_name, "/", "-")}-writer-policy"
  description = "Policy allowing write access to ${var.log_group_name}"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogStreams"
        ]
        Resource = [
          aws_cloudwatch_log_group.main.arn,
          "${aws_cloudwatch_log_group.main.arn}:*"
        ]
      }
    ]
  })

  tags = var.tags
}

resource "aws_iam_policy" "log_reader" {
  count       = var.create_reader_policy ? 1 : 0
  name        = "${replace(var.log_group_name, "/", "-")}-reader-policy"
  description = "Policy allowing read access to ${var.log_group_name}"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:GetLogEvents",
          "logs:GetLogRecord",
          "logs:GetQueryResults",
          "logs:StartQuery",
          "logs:StopQuery",
          "logs:DescribeLogStreams",
          "logs:FilterLogEvents"
        ]
        Resource = [
          aws_cloudwatch_log_group.main.arn,
          "${aws_cloudwatch_log_group.main.arn}:*"
        ]
      }
    ]
  })

  tags = var.tags
}
