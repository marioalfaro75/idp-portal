terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
    }
  }
}

provider "aws" {
  region = var.region
}

resource "aws_sns_topic" "this" {
  name         = var.topic_name
  display_name = var.display_name

  tags = {
    Name        = var.topic_name
    Environment = var.environment
  }
}

resource "aws_sns_topic_subscription" "email" {
  count     = var.email_endpoint != "" ? 1 : 0
  topic_arn = aws_sns_topic.this.arn
  protocol  = "email"
  endpoint  = var.email_endpoint
}

resource "aws_sns_topic_policy" "this" {
  arn = aws_sns_topic.this.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AllowPublish"
      Effect    = "Allow"
      Principal = { AWS = "*" }
      Action    = "SNS:Publish"
      Resource  = aws_sns_topic.this.arn
      Condition = {
        StringEquals = { "AWS:SourceOwner" = data.aws_caller_identity.current.account_id }
      }
    }]
  })
}

data "aws_caller_identity" "current" {}
