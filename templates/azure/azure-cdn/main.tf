terraform {
  required_version = ">= 1.5"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "this" {
  name     = var.resource_group_name
  location = var.location
  tags     = merge(var.tags, { ManagedBy = "terraform" })
}

resource "azurerm_cdn_profile" "this" {
  name                = var.cdn_profile_name
  location            = azurerm_resource_group.this.location
  resource_group_name = azurerm_resource_group.this.name
  sku                 = var.cdn_sku
  tags                = merge(var.tags, { ManagedBy = "terraform" })
}

resource "azurerm_cdn_endpoint" "this" {
  name                          = var.cdn_endpoint_name
  profile_name                  = azurerm_cdn_profile.this.name
  location                      = azurerm_resource_group.this.location
  resource_group_name           = azurerm_resource_group.this.name
  is_http_allowed               = var.is_http_allowed
  is_https_allowed              = true
  is_compression_enabled        = var.is_compression_enabled
  content_types_to_compress     = var.content_types_to_compress
  querystring_caching_behaviour = var.querystring_caching
  optimization_type             = var.optimization_type
  tags                          = merge(var.tags, { ManagedBy = "terraform" })

  origin {
    name      = var.origin_name
    host_name = var.origin_host_name
    http_port  = var.origin_http_port
    https_port = var.origin_https_port
  }

  dynamic "global_delivery_rule" {
    for_each = var.enable_https_redirect ? [1] : []
    content {
      url_redirect_action {
        redirect_type = "Found"
        protocol      = "Https"
      }
    }
  }

  dynamic "delivery_rule" {
    for_each = var.cache_rules
    content {
      name  = delivery_rule.value.name
      order = delivery_rule.value.order

      url_path_condition {
        operator     = "BeginsWith"
        match_values = delivery_rule.value.path_patterns
      }

      cache_expiration_action {
        behavior = "Override"
        duration = delivery_rule.value.cache_duration
      }
    }
  }
}
