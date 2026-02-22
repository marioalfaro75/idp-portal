terraform {
  required_version = ">= 1.5"

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

resource "aws_sqs_queue" "dlq" {
  name                        = "${var.queue_name}-dlq"
  message_retention_seconds   = 1209600 # 14 days
  sqs_managed_sse_enabled     = true

  tags = merge(var.tags, {
    Name        = "${var.queue_name}-dlq"
    ManagedBy   = "terraform"
  })
}

resource "aws_sqs_queue" "this" {
  name                        = var.queue_name
  delay_seconds               = var.delay_seconds
  max_message_size            = var.max_message_size
  message_retention_seconds   = var.message_retention_seconds
  visibility_timeout_seconds  = var.visibility_timeout_seconds
  receive_wait_time_seconds   = var.receive_wait_time_seconds
  sqs_managed_sse_enabled     = true

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq.arn
    maxReceiveCount     = var.max_receive_count
  })

  tags = merge(var.tags, {
    Name        = var.queue_name
    ManagedBy   = "terraform"
  })
}
