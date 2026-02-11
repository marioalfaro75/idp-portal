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

data "aws_caller_identity" "current" {}

resource "aws_iam_role" "main" {
  name                 = var.role_name
  path                 = var.role_path
  max_session_duration = var.max_session_duration
  description          = var.role_description

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = var.trusted_services
        }
        Action = "sts:AssumeRole"
        Condition = var.assume_role_condition != null ? var.assume_role_condition : null
      }
    ]
  })

  permissions_boundary = var.permissions_boundary_arn

  tags = merge(var.tags, {
    Name = var.role_name
  })
}

resource "aws_iam_policy" "custom" {
  count       = length(var.custom_policies)
  name        = "${var.role_name}-${var.custom_policies[count.index].name}"
  path        = var.role_path
  description = var.custom_policies[count.index].description

  policy = jsonencode({
    Version   = "2012-10-17"
    Statement = var.custom_policies[count.index].statements
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "custom" {
  count      = length(var.custom_policies)
  role       = aws_iam_role.main.name
  policy_arn = aws_iam_policy.custom[count.index].arn
}

resource "aws_iam_role_policy_attachment" "managed" {
  count      = length(var.managed_policy_arns)
  role       = aws_iam_role.main.name
  policy_arn = var.managed_policy_arns[count.index]
}

resource "aws_iam_instance_profile" "main" {
  count = var.create_instance_profile ? 1 : 0
  name  = "${var.role_name}-instance-profile"
  role  = aws_iam_role.main.name

  tags = var.tags
}
