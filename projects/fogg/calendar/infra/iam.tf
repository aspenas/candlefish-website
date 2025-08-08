terraform {
  required_version = ">= 1.5.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP Region"
  type        = string
  default     = "us-central1"
}

locals {
  services = [
    "calendar-json.googleapis.com",
    "admin.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "iam.googleapis.com",
    "secretmanager.googleapis.com",
    "run.googleapis.com",
    "cloudbuild.googleapis.com",
  ]
}

# Enable required APIs
resource "google_project_service" "apis" {
  for_each = toset(local.services)
  project  = var.project_id
  service  = each.value

  disable_on_destroy = false
}

# Read-only service account
resource "google_service_account" "fogg_calendar_ro" {
  account_id   = "fogg-calendar-ro"
  display_name = "FOGG Calendar Read-Only"
  description  = "Service account for read-only calendar operations"
  project      = var.project_id
}

# Read-write service account
resource "google_service_account" "fogg_calendar_rw" {
  account_id   = "fogg-calendar-rw"
  display_name = "FOGG Calendar Read-Write"
  description  = "Service account for calendar management operations"
  project      = var.project_id
}

# IAM bindings for read-only account
resource "google_project_iam_member" "fogg_ro_viewer" {
  project = var.project_id
  role    = "roles/viewer"
  member  = "serviceAccount:${google_service_account.fogg_calendar_ro.email}"
}

resource "google_project_iam_member" "fogg_ro_calendar_reader" {
  project = var.project_id
  role    = "roles/calendar.reader"
  member  = "serviceAccount:${google_service_account.fogg_calendar_ro.email}"
}

# IAM bindings for read-write account
resource "google_project_iam_member" "fogg_rw_calendar_writer" {
  project = var.project_id
  role    = "roles/calendar.writer"
  member  = "serviceAccount:${google_service_account.fogg_calendar_rw.email}"
}

resource "google_project_iam_member" "fogg_rw_group_member" {
  project = var.project_id
  role    = "roles/admin.directory.group.member"
  member  = "serviceAccount:${google_service_account.fogg_calendar_rw.email}"
}

# Workload Identity Pool for GitHub Actions
resource "google_iam_workload_identity_pool" "github" {
  workload_identity_pool_id = "github-actions-pool"
  display_name              = "GitHub Actions Pool"
  description               = "Identity pool for GitHub Actions OIDC"
  project                   = var.project_id
}

# Workload Identity Provider for GitHub
resource "google_iam_workload_identity_pool_provider" "github" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-provider"
  display_name                       = "GitHub Provider"
  project                            = var.project_id

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.actor"      = "assertion.actor"
    "attribute.repository" = "assertion.repository"
    "attribute.ref"        = "assertion.ref"
  }

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

# Allow GitHub Actions to impersonate the read-write service account
resource "google_service_account_iam_member" "github_impersonation" {
  service_account_id = google_service_account.fogg_calendar_rw.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/patricksmith/fogg-calendar"
}

# Secret for service account key (with 90-day rotation policy)
resource "google_secret_manager_secret" "fogg_calendar_sa_key" {
  secret_id = "fogg-calendar-sa-key"
  project   = var.project_id

  replication {
    auto {}
  }

  # Rotation every 90 days
  rotation {
    next_rotation_time = timeadd(timestamp(), "2160h") # 90 days
    rotation_period    = "2160h"
  }

  lifecycle {
    prevent_destroy = true
  }
}

# Secret version placeholder (actual key will be created by rotation job)
resource "google_secret_manager_secret_version" "fogg_calendar_sa_key_initial" {
  secret      = google_secret_manager_secret.fogg_calendar_sa_key.id
  secret_data = jsonencode({
    note = "Initial placeholder - actual key will be created by rotation job"
  })

  lifecycle {
    ignore_changes = [secret_data]
  }
}

# Grant Cloud Run access to the secret
resource "google_secret_manager_secret_iam_member" "cloud_run_secret_accessor" {
  secret_id = google_secret_manager_secret.fogg_calendar_sa_key.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.fogg_calendar_rw.email}"
  project   = var.project_id
}

# Output important values
output "workload_identity_provider" {
  value = google_iam_workload_identity_pool_provider.github.name
}

output "service_account_email_rw" {
  value = google_service_account.fogg_calendar_rw.email
}

output "service_account_email_ro" {
  value = google_service_account.fogg_calendar_ro.email
}
