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

resource "google_kms_key_ring" "keyring" {
  name     = var.keyring_name
  location = var.keyring_location
}

resource "google_kms_crypto_key" "keys" {
  for_each = { for k in var.crypto_keys : k.name => k }

  name            = each.value.name
  key_ring        = google_kms_key_ring.keyring.id
  rotation_period = lookup(each.value, "rotation_period", var.default_rotation_period)
  purpose         = lookup(each.value, "purpose", "ENCRYPT_DECRYPT")

  version_template {
    algorithm        = lookup(each.value, "algorithm", "GOOGLE_SYMMETRIC_ENCRYPTION")
    protection_level = lookup(each.value, "protection_level", var.default_protection_level)
  }

  labels = merge(var.labels, lookup(each.value, "labels", {}), { managed_by = "terraform" })

  lifecycle {
    prevent_destroy = true
  }
}

resource "google_kms_crypto_key_iam_member" "encrypters" {
  for_each = { for b in var.key_iam_bindings : "${b.key_name}-${b.role}-${b.member}" => b }

  crypto_key_id = google_kms_crypto_key.keys[each.value.key_name].id
  role          = each.value.role
  member        = each.value.member
}

resource "google_project_service" "kms" {
  project = var.project_id
  service = "cloudkms.googleapis.com"

  disable_dependent_services = false
  disable_on_destroy         = false
}
