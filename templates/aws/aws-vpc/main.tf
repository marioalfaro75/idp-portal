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

data "aws_availability_zones" "available" {
  state = "available"
}

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = merge(var.tags, {
    Name      = "${var.project_name}-vpc"
    ManagedBy = "terraform"
  })
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = merge(var.tags, {
    Name      = "${var.project_name}-igw"
    ManagedBy = "terraform"
  })
}

resource "aws_subnet" "public" {
  count                   = var.az_count
  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = merge(var.tags, {
    Name      = "${var.project_name}-public-${count.index + 1}"
    Tier      = "public"
    ManagedBy = "terraform"
  })
}

resource "aws_subnet" "private" {
  count             = var.az_count
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + var.az_count)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = merge(var.tags, {
    Name      = "${var.project_name}-private-${count.index + 1}"
    Tier      = "private"
    ManagedBy = "terraform"
  })
}

resource "aws_eip" "nat" {
  count  = var.enable_nat_gateway ? var.single_nat_gateway ? 1 : var.az_count : 0
  domain = "vpc"

  tags = merge(var.tags, {
    Name      = "${var.project_name}-nat-eip-${count.index + 1}"
    ManagedBy = "terraform"
  })
}

resource "aws_nat_gateway" "main" {
  count         = var.enable_nat_gateway ? var.single_nat_gateway ? 1 : var.az_count : 0
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = merge(var.tags, {
    Name      = "${var.project_name}-nat-${count.index + 1}"
    ManagedBy = "terraform"
  })

  depends_on = [aws_internet_gateway.main]
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = merge(var.tags, {
    Name      = "${var.project_name}-public-rt"
    ManagedBy = "terraform"
  })
}

resource "aws_route_table" "private" {
  count  = var.enable_nat_gateway ? var.single_nat_gateway ? 1 : var.az_count : 0
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main[var.single_nat_gateway ? 0 : count.index].id
  }

  tags = merge(var.tags, {
    Name      = "${var.project_name}-private-rt-${count.index + 1}"
    ManagedBy = "terraform"
  })
}

resource "aws_route_table_association" "public" {
  count          = var.az_count
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  count          = var.enable_nat_gateway ? var.az_count : 0
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[var.single_nat_gateway ? 0 : count.index].id
}
