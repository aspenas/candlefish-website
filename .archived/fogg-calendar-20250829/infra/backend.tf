# Terraform state backend configuration
# Create the bucket first with: gsutil mb -p $PROJECT_ID gs://${PROJECT_ID}-terraform-state

terraform {
  backend "gcs" {
    # bucket = "${var.project_id}-terraform-state"  # Set via -backend-config
    prefix = "fogg-calendar"
  }
}

# State bucket with versioning and encryption
resource "google_storage_bucket" "terraform_state" {
  name                        = "${var.project_id}-terraform-state"
  location                    = var.region
  force_destroy               = false
  public_access_prevention    = "enforced"
  uniform_bucket_level_access = true
  project                     = var.project_id

  versioning {
    enabled = true
  }

  encryption {
    default_kms_key_name = google_kms_crypto_key.terraform_state_key.id
  }

  lifecycle_rule {
    action {
      type = "Delete"
    }
    condition {
      num_newer_versions = 10
      with_state         = "ARCHIVED"
    }
  }
}

# KMS keyring for state encryption
resource "google_kms_key_ring" "terraform_state" {
  name     = "terraform-state-keyring"
  location = var.region
  project  = var.project_id
}

# KMS key for state encryption
resource "google_kms_crypto_key" "terraform_state_key" {
  name            = "terraform-state-key"
  key_ring        = google_kms_key_ring.terraform_state.id
  rotation_period = "7776000s" # 90 days

  lifecycle {
    prevent_destroy = true
  }
}
