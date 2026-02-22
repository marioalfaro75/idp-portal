terraform {
  required_version = ">= 1.5"

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

resource "google_compute_instance_template" "default" {
  name_prefix  = "${var.group_name}-template-"
  machine_type = var.machine_type
  region       = var.region

  disk {
    source_image = var.source_image
    auto_delete  = true
    boot         = true
    disk_size_gb = var.disk_size_gb
    disk_type    = var.disk_type
  }

  network_interface {
    network    = var.network
    subnetwork = var.subnetwork

    dynamic "access_config" {
      for_each = var.assign_public_ip ? [1] : []
      content {}
    }
  }

  metadata = merge(var.metadata, {
    enable-oslogin = var.enable_oslogin ? "TRUE" : "FALSE"
  })

  metadata_startup_script = var.startup_script

  service_account {
    email  = var.service_account_email
    scopes = var.service_account_scopes
  }

  tags = var.network_tags

  labels = merge(var.labels, { managed_by = "terraform" })

  lifecycle {
    create_before_destroy = true
  }
}

resource "google_compute_region_instance_group_manager" "default" {
  name               = var.group_name
  base_instance_name = var.group_name
  region             = var.region
  target_size        = var.target_size

  version {
    instance_template = google_compute_instance_template.default.id
  }

  named_port {
    name = var.named_port_name
    port = var.named_port
  }

  auto_healing_policies {
    health_check      = google_compute_health_check.autohealing.id
    initial_delay_sec = var.autohealing_initial_delay
  }

  update_policy {
    type                         = var.update_policy_type
    minimal_action               = "REPLACE"
    most_disruptive_allowed_action = "REPLACE"
    max_surge_fixed              = var.max_surge
    max_unavailable_fixed        = var.max_unavailable
  }
}

resource "google_compute_health_check" "autohealing" {
  name                = "${var.group_name}-autohealing-hc"
  check_interval_sec  = 15
  timeout_sec         = 5
  healthy_threshold   = 2
  unhealthy_threshold = 3

  http_health_check {
    request_path = var.health_check_path
    port         = var.named_port
  }
}

resource "google_compute_region_autoscaler" "default" {
  count  = var.enable_autoscaling ? 1 : 0
  name   = "${var.group_name}-autoscaler"
  region = var.region
  target = google_compute_region_instance_group_manager.default.id

  autoscaling_policy {
    max_replicas    = var.max_replicas
    min_replicas    = var.min_replicas
    cooldown_period = var.cooldown_period

    cpu_utilization {
      target = var.cpu_utilization_target
    }
  }
}
