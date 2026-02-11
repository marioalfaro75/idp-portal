variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "region" {
  description = "The GCP region for the API Gateway"
  type        = string
  default     = "us-central1"
}

variable "api_id" {
  description = "Identifier for the API Gateway API resource"
  type        = string
  default     = "my-api"
}

variable "config_version" {
  description = "Version string for the API config (used to trigger config updates)"
  type        = string
  default     = "v1"
}

variable "openapi_spec" {
  description = "The OpenAPI specification YAML content for the API"
  type        = string
  default     = <<-EOT
    swagger: "2.0"
    info:
      title: "My API"
      version: "1.0.0"
    schemes:
      - "https"
    produces:
      - "application/json"
    paths:
      /hello:
        get:
          summary: "Hello endpoint"
          operationId: "hello"
          x-google-backend:
            address: "https://us-central1-my-project.cloudfunctions.net/hello"
          responses:
            "200":
              description: "Successful response"
  EOT
}

variable "backend_service_account" {
  description = "Service account email used by the gateway to invoke backends"
  type        = string
}

variable "labels" {
  description = "Labels to apply to API Gateway resources"
  type        = map(string)
  default     = {}
}
