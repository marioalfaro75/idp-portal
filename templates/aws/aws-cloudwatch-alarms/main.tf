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

resource "aws_sns_topic" "alarm_notifications" {
  count = var.create_sns_topic ? 1 : 0
  name  = "${var.project_name}-alarm-notifications"

  tags = merge(var.tags, {
    Name = "${var.project_name}-alarm-notifications"
  })
}

resource "aws_sns_topic_subscription" "email" {
  count     = var.create_sns_topic ? length(var.notification_emails) : 0
  topic_arn = aws_sns_topic.alarm_notifications[0].arn
  protocol  = "email"
  endpoint  = var.notification_emails[count.index]
}

locals {
  alarm_actions = var.create_sns_topic ? [aws_sns_topic.alarm_notifications[0].arn] : var.alarm_action_arns
}

resource "aws_cloudwatch_metric_alarm" "cpu_high" {
  count               = var.create_cpu_alarm ? 1 : 0
  alarm_name          = "${var.project_name}-cpu-utilization-high"
  alarm_description   = "CPU utilization exceeds ${var.cpu_threshold}%"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.evaluation_periods
  metric_name         = "CPUUtilization"
  namespace           = var.metric_namespace
  period              = var.period
  statistic           = "Average"
  threshold           = var.cpu_threshold
  treat_missing_data  = "missing"

  dimensions = var.alarm_dimensions

  alarm_actions = local.alarm_actions
  ok_actions    = local.alarm_actions

  tags = merge(var.tags, {
    Name = "${var.project_name}-cpu-utilization-high"
  })
}

resource "aws_cloudwatch_metric_alarm" "memory_high" {
  count               = var.create_memory_alarm ? 1 : 0
  alarm_name          = "${var.project_name}-memory-utilization-high"
  alarm_description   = "Memory utilization exceeds ${var.memory_threshold}%"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.evaluation_periods
  metric_name         = "MemoryUtilization"
  namespace           = var.metric_namespace
  period              = var.period
  statistic           = "Average"
  threshold           = var.memory_threshold
  treat_missing_data  = "missing"

  dimensions = var.alarm_dimensions

  alarm_actions = local.alarm_actions
  ok_actions    = local.alarm_actions

  tags = merge(var.tags, {
    Name = "${var.project_name}-memory-utilization-high"
  })
}

resource "aws_cloudwatch_metric_alarm" "error_rate" {
  count               = var.create_error_alarm ? 1 : 0
  alarm_name          = "${var.project_name}-error-rate-high"
  alarm_description   = "Error count exceeds ${var.error_threshold}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.evaluation_periods
  metric_name         = var.error_metric_name
  namespace           = var.metric_namespace
  period              = var.period
  statistic           = "Sum"
  threshold           = var.error_threshold
  treat_missing_data  = "notBreaching"

  dimensions = var.alarm_dimensions

  alarm_actions = local.alarm_actions
  ok_actions    = local.alarm_actions

  tags = merge(var.tags, {
    Name = "${var.project_name}-error-rate-high"
  })
}

resource "aws_cloudwatch_metric_alarm" "latency_high" {
  count               = var.create_latency_alarm ? 1 : 0
  alarm_name          = "${var.project_name}-latency-high"
  alarm_description   = "P99 latency exceeds ${var.latency_threshold}ms"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.evaluation_periods
  metric_name         = var.latency_metric_name
  namespace           = var.metric_namespace
  period              = var.period
  extended_statistic  = "p99"
  threshold           = var.latency_threshold
  treat_missing_data  = "missing"

  dimensions = var.alarm_dimensions

  alarm_actions = local.alarm_actions
  ok_actions    = local.alarm_actions

  tags = merge(var.tags, {
    Name = "${var.project_name}-latency-high"
  })
}

resource "aws_cloudwatch_metric_alarm" "custom" {
  for_each = { for alarm in var.custom_alarms : alarm.name => alarm }

  alarm_name          = "${var.project_name}-${each.value.name}"
  alarm_description   = each.value.description
  comparison_operator = each.value.comparison_operator
  evaluation_periods  = each.value.evaluation_periods
  metric_name         = each.value.metric_name
  namespace           = each.value.namespace
  period              = each.value.period
  statistic           = each.value.statistic
  threshold           = each.value.threshold
  treat_missing_data  = each.value.treat_missing_data

  dimensions = each.value.dimensions

  alarm_actions = local.alarm_actions
  ok_actions    = local.alarm_actions

  tags = merge(var.tags, {
    Name = "${var.project_name}-${each.value.name}"
  })
}
