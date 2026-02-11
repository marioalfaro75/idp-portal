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

resource "google_compute_global_address" "lb_ip" {
  name = "${var.lb_name}-ip"
}

resource "google_compute_health_check" "http" {
  name               = "${var.lb_name}-health-check"
  check_interval_sec = var.health_check_interval
  timeout_sec        = var.health_check_timeout

  http_health_check {
    port         = var.backend_port
    request_path = var.health_check_path
  }
}

resource "google_compute_backend_service" "default" {
  name                  = "${var.lb_name}-backend"
  protocol              = "HTTP"
  port_name             = var.port_name
  load_balancing_scheme = "EXTERNAL"
  timeout_sec           = var.backend_timeout
  health_checks         = [google_compute_health_check.http.id]

  dynamic "backend" {
    for_each = var.backend_groups
    content {
      group           = backend.value.instance_group
      balancing_mode  = lookup(backend.value, "balancing_mode", "UTILIZATION")
      capacity_scaler = lookup(backend.value, "capacity_scaler", 1.0)
      max_utilization = lookup(backend.value, "max_utilization", 0.8)
    }
  }

  log_config {
    enable      = var.enable_logging
    sample_rate = var.log_sample_rate
  }
}

resource "google_compute_url_map" "default" {
  name            = "${var.lb_name}-url-map"
  default_service = google_compute_backend_service.default.id
}

resource "google_compute_target_http_proxy" "http" {
  count   = var.enable_ssl ? 0 : 1
  name    = "${var.lb_name}-http-proxy"
  url_map = google_compute_url_map.default.id
}

resource "google_compute_global_forwarding_rule" "http" {
  count      = var.enable_ssl ? 0 : 1
  name       = "${var.lb_name}-http-rule"
  target     = google_compute_target_http_proxy.http[0].id
  port_range = "80"
  ip_address = google_compute_global_address.lb_ip.address
}

resource "google_compute_managed_ssl_certificate" "default" {
  count = var.enable_ssl ? 1 : 0
  name  = "${var.lb_name}-ssl-cert"

  managed {
    domains = var.ssl_domains
  }
}

resource "google_compute_target_https_proxy" "https" {
  count            = var.enable_ssl ? 1 : 0
  name             = "${var.lb_name}-https-proxy"
  url_map          = google_compute_url_map.default.id
  ssl_certificates = [google_compute_managed_ssl_certificate.default[0].id]
}

resource "google_compute_global_forwarding_rule" "https" {
  count      = var.enable_ssl ? 1 : 0
  name       = "${var.lb_name}-https-rule"
  target     = google_compute_target_https_proxy.https[0].id
  port_range = "443"
  ip_address = google_compute_global_address.lb_ip.address
}
