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

resource "google_project_iam_custom_role" "roles" {
  for_each = { for r in var.custom_roles : r.role_id => r }

  role_id     = each.value.role_id
  title       = each.value.title
  description = each.value.description
  permissions = each.value.permissions
  stage       = lookup(each.value, "stage", "GA")
}

resource "google_project_iam_member" "role_bindings" {
  for_each = { for b in var.role_bindings : "${b.role_id}-${b.member}" => b }

  project = var.project_id
  role    = google_project_iam_custom_role.roles[each.value.role_id].id
  member  = each.value.member
}

resource "google_service_account" "service_accounts" {
  for_each = { for sa in var.service_accounts : sa.account_id => sa }

  account_id   = each.value.account_id
  display_name = each.value.display_name
  description  = lookup(each.value, "description", null)
  project      = var.project_id
}

resource "google_project_iam_member" "sa_role_bindings" {
  for_each = { for b in var.sa_role_bindings : "${b.service_account}-${b.role}" => b }

  project = var.project_id
  role    = each.value.role
  member  = "serviceAccount:${google_service_account.service_accounts[each.value.service_account].email}"
}

resource "google_service_account_iam_member" "workload_identity" {
  for_each = { for wi in var.workload_identity_bindings : "${wi.service_account}-${wi.k8s_namespace}-${wi.k8s_service_account}" => wi }

  service_account_id = google_service_account.service_accounts[each.value.service_account].name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[${each.value.k8s_namespace}/${each.value.k8s_service_account}]"
}
