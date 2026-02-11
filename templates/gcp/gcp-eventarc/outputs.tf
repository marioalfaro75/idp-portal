output "trigger_name" {
  description = "Eventarc trigger name"
  value       = google_eventarc_trigger.this.name
}

output "service_account_email" {
  description = "Trigger service account email"
  value       = google_service_account.eventarc.email
}
