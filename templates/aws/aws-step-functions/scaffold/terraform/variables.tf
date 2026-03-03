variable "region" {
  description = "AWS region"
  type        = string
  default     = "{{region}}"
}

variable "state_machine_name" {
  description = "Step Functions state machine name"
  type        = string
  default     = "{{state_machine_name}}"
}
