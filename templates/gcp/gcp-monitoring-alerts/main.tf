terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

resource "google_monitoring_notification_channel" "email" {
  for_each     = toset(var.email_addresses)
  display_name = "Email: ${each.value}"
  type         = "email"

  labels = {
    email_address = each.value
  }
}

resource "google_monitoring_notification_channel" "slack" {
  count        = var.slack_channel_name != null ? 1 : 0
  display_name = "Slack: ${var.slack_channel_name}"
  type         = "slack"

  labels = {
    channel_name = var.slack_channel_name
  }

  sensitive_labels {
    auth_token = var.slack_auth_token
  }
}

resource "google_monitoring_alert_policy" "cpu_utilization" {
  count        = var.enable_cpu_alert ? 1 : 0
  display_name = "${var.alert_prefix} - High CPU Utilization"
  combiner     = "OR"

  conditions {
    display_name = "CPU utilization above ${var.cpu_threshold * 100}%"

    condition_threshold {
      filter          = "resource.type = \"gce_instance\" AND metric.type = \"compute.googleapis.com/instance/cpu/utilization\""
      comparison      = "COMPARISON_GT"
      threshold_value = var.cpu_threshold
      duration        = var.cpu_alert_duration

      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_MEAN"
      }

      trigger {
        count = 1
      }
    }
  }

  notification_channels = local.notification_channels

  alert_strategy {
    auto_close = var.auto_close_duration
  }

  user_labels = var.labels
}

resource "google_monitoring_alert_policy" "memory_utilization" {
  count        = var.enable_memory_alert ? 1 : 0
  display_name = "${var.alert_prefix} - High Memory Utilization"
  combiner     = "OR"

  conditions {
    display_name = "Memory utilization above ${var.memory_threshold * 100}%"

    condition_threshold {
      filter          = "resource.type = \"gce_instance\" AND metric.type = \"agent.googleapis.com/memory/percent_used\" AND metric.labels.state = \"used\""
      comparison      = "COMPARISON_GT"
      threshold_value = var.memory_threshold
      duration        = var.memory_alert_duration

      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_MEAN"
      }

      trigger {
        count = 1
      }
    }
  }

  notification_channels = local.notification_channels

  alert_strategy {
    auto_close = var.auto_close_duration
  }

  user_labels = var.labels
}

resource "google_monitoring_alert_policy" "disk_utilization" {
  count        = var.enable_disk_alert ? 1 : 0
  display_name = "${var.alert_prefix} - High Disk Utilization"
  combiner     = "OR"

  conditions {
    display_name = "Disk utilization above ${var.disk_threshold * 100}%"

    condition_threshold {
      filter          = "resource.type = \"gce_instance\" AND metric.type = \"agent.googleapis.com/disk/percent_used\" AND metric.labels.state = \"used\""
      comparison      = "COMPARISON_GT"
      threshold_value = var.disk_threshold
      duration        = "0s"

      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_MEAN"
      }

      trigger {
        count = 1
      }
    }
  }

  notification_channels = local.notification_channels

  alert_strategy {
    auto_close = var.auto_close_duration
  }

  user_labels = var.labels
}

resource "google_monitoring_alert_policy" "uptime_check" {
  count        = var.uptime_check_url != null ? 1 : 0
  display_name = "${var.alert_prefix} - Uptime Check Failed"
  combiner     = "OR"

  conditions {
    display_name = "Uptime check failure"

    condition_threshold {
      filter          = "resource.type = \"uptime_url\" AND metric.type = \"monitoring.googleapis.com/uptime_check/check_passed\" AND metric.labels.check_id = \"${google_monitoring_uptime_check_config.https[0].uptime_check_id}\""
      comparison      = "COMPARISON_GT"
      threshold_value = 1
      duration        = "300s"

      aggregations {
        alignment_period     = "1200s"
        per_series_aligner   = "ALIGN_NEXT_OLDER"
        cross_series_reducer = "REDUCE_COUNT_FALSE"
        group_by_fields      = ["resource.label.project_id", "resource.label.host"]
      }

      trigger {
        count = 1
      }
    }
  }

  notification_channels = local.notification_channels
  user_labels           = var.labels
}

resource "google_monitoring_uptime_check_config" "https" {
  count        = var.uptime_check_url != null ? 1 : 0
  display_name = "${var.alert_prefix} - HTTPS Uptime Check"
  timeout      = "10s"
  period       = var.uptime_check_period

  http_check {
    path         = var.uptime_check_path
    port         = 443
    use_ssl      = true
    validate_ssl = true
  }

  monitored_resource {
    type = "uptime_url"
    labels = {
      project_id = var.project_id
      host       = var.uptime_check_url
    }
  }
}

locals {
  notification_channels = concat(
    [for ch in google_monitoring_notification_channel.email : ch.id],
    var.slack_channel_name != null ? [google_monitoring_notification_channel.slack[0].id] : []
  )
}
