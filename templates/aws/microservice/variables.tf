variable "service_name" {
  description = "Name of the microservice"
  type        = string
}

variable "owner" {
  description = "Owner or team responsible for this service"
  type        = string
}

variable "region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "us-east-1"
}
