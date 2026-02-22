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

  tags = merge(var.tags, {
    ManagedBy = "terraform"
  })
}

resource "azurerm_eventgrid_topic" "this" {
  name                = var.topic_name
  location            = azurerm_resource_group.this.location
  resource_group_name = azurerm_resource_group.this.name

  input_schema = var.input_schema

  tags = merge(var.tags, {
    ManagedBy = "terraform"
  })
}

resource "azurerm_eventgrid_event_subscription" "webhook" {
  count = var.webhook_url != "" ? 1 : 0
  name  = "${var.topic_name}-webhook-sub"
  scope = azurerm_eventgrid_topic.this.id

  webhook_endpoint {
    url = var.webhook_url
  }

  retry_policy {
    max_delivery_attempts = var.max_delivery_attempts
    event_time_to_live    = var.event_ttl_minutes
  }
}
