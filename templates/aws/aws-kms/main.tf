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

data "aws_caller_identity" "current" {}

resource "aws_kms_key" "main" {
  description              = var.description
  key_usage                = var.key_usage
  customer_master_key_spec = var.key_spec
  deletion_window_in_days  = var.deletion_window_in_days
  enable_key_rotation      = var.enable_key_rotation
  is_enabled               = true
  multi_region             = var.multi_region

  policy = var.key_policy != "" ? var.key_policy : jsonencode({
    Version = "2012-10-17"
    Id      = "${var.alias_name}-key-policy"
    Statement = concat([
      {
        Sid    = "EnableRootAccountAccess"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "AllowKeyAdministration"
        Effect = "Allow"
        Principal = {
          AWS = var.admin_role_arns
        }
        Action = [
          "kms:Create*",
          "kms:Describe*",
          "kms:Enable*",
          "kms:List*",
          "kms:Put*",
          "kms:Update*",
          "kms:Revoke*",
          "kms:Disable*",
          "kms:Get*",
          "kms:Delete*",
          "kms:TagResource",
          "kms:UntagResource",
          "kms:ScheduleKeyDeletion",
          "kms:CancelKeyDeletion"
        ]
        Resource = "*"
      },
      {
        Sid    = "AllowKeyUsage"
        Effect = "Allow"
        Principal = {
          AWS = var.usage_role_arns
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
      }
    ],
    var.allow_service_usage ? [
      {
        Sid    = "AllowServiceUsage"
        Effect = "Allow"
        Principal = {
          Service = var.allowed_services
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
      }
    ] : [])
  })

  tags = merge(var.tags, {
    Name      = var.alias_name
    ManagedBy = "terraform"
  })

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_kms_alias" "main" {
  name          = "alias/${var.alias_name}"
  target_key_id = aws_kms_key.main.key_id
}

resource "aws_kms_grant" "grants" {
  count             = length(var.grants)
  name              = var.grants[count.index].name
  key_id            = aws_kms_key.main.key_id
  grantee_principal = var.grants[count.index].grantee_principal
  operations        = var.grants[count.index].operations
}
