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

resource "google_storage_bucket" "cdn_bucket" {
  name                        = var.bucket_name
  location                    = var.bucket_location
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true
  force_destroy               = var.force_destroy

  website {
    main_page_suffix = var.main_page_suffix
    not_found_page   = var.not_found_page
  }

  cors {
    origin          = var.cors_origins
    method          = ["GET", "HEAD", "OPTIONS"]
    response_header = ["Content-Type", "Cache-Control"]
    max_age_seconds = 3600
  }

  labels = merge(var.labels, { managed_by = "terraform" })
}

resource "google_storage_bucket_iam_member" "public_read" {
  count  = var.enable_public_access ? 1 : 0
  bucket = google_storage_bucket.cdn_bucket.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}

resource "google_compute_backend_bucket" "cdn_backend" {
  name        = "${var.cdn_name}-backend"
  bucket_name = google_storage_bucket.cdn_bucket.name
  enable_cdn  = true

  cdn_policy {
    cache_mode                   = var.cache_mode
    default_ttl                  = var.default_ttl
    max_ttl                      = var.max_ttl
    client_ttl                   = var.client_ttl
    negative_caching             = var.enable_negative_caching
    serve_while_stale            = var.serve_while_stale
    signed_url_cache_max_age_sec = var.signed_url_cache_max_age

    cache_key_policy {
      include_http_headers = var.cache_key_headers
    }
  }

  custom_response_headers = var.custom_response_headers
}

resource "google_compute_global_address" "cdn_ip" {
  name = "${var.cdn_name}-ip"
}

resource "google_compute_url_map" "cdn_url_map" {
  name            = "${var.cdn_name}-url-map"
  default_service = google_compute_backend_bucket.cdn_backend.id
}

resource "google_compute_target_http_proxy" "cdn_http_proxy" {
  count   = var.enable_ssl ? 0 : 1
  name    = "${var.cdn_name}-http-proxy"
  url_map = google_compute_url_map.cdn_url_map.id
}

resource "google_compute_global_forwarding_rule" "cdn_http_rule" {
  count      = var.enable_ssl ? 0 : 1
  name       = "${var.cdn_name}-http-rule"
  target     = google_compute_target_http_proxy.cdn_http_proxy[0].id
  port_range = "80"
  ip_address = google_compute_global_address.cdn_ip.address
}

resource "google_compute_managed_ssl_certificate" "cdn_ssl" {
  count = var.enable_ssl ? 1 : 0
  name  = "${var.cdn_name}-ssl-cert"

  managed {
    domains = var.ssl_domains
  }
}

resource "google_compute_target_https_proxy" "cdn_https_proxy" {
  count            = var.enable_ssl ? 1 : 0
  name             = "${var.cdn_name}-https-proxy"
  url_map          = google_compute_url_map.cdn_url_map.id
  ssl_certificates = [google_compute_managed_ssl_certificate.cdn_ssl[0].id]
}

resource "google_compute_global_forwarding_rule" "cdn_https_rule" {
  count      = var.enable_ssl ? 1 : 0
  name       = "${var.cdn_name}-https-rule"
  target     = google_compute_target_https_proxy.cdn_https_proxy[0].id
  port_range = "443"
  ip_address = google_compute_global_address.cdn_ip.address
}
