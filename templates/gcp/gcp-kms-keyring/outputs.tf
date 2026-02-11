output "keyring_id" {
  description = "The ID of the KMS keyring"
  value       = google_kms_key_ring.keyring.id
}

output "keyring_name" {
  description = "The name of the KMS keyring"
  value       = google_kms_key_ring.keyring.name
}

output "keyring_location" {
  description = "The location of the KMS keyring"
  value       = google_kms_key_ring.keyring.location
}

output "crypto_key_ids" {
  description = "Map of crypto key names to their IDs"
  value       = { for k, v in google_kms_crypto_key.keys : k => v.id }
}

output "crypto_key_names" {
  description = "Map of crypto key names to their full resource names"
  value       = { for k, v in google_kms_crypto_key.keys : k => v.name }
}

output "crypto_key_versions" {
  description = "Map of crypto key names to their primary version IDs"
  value       = { for k, v in google_kms_crypto_key.keys : k => v.primary[0].name }
}
