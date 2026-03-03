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

resource "aws_s3_bucket" "site" {
  bucket        = var.bucket_name
  force_destroy = true

  tags = {
    Project = "{{project_name}}"
    Service = "{{service_name}}"
  }
}
