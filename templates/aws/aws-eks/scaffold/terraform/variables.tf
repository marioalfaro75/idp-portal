variable "region" {
  description = "AWS region"
  type        = string
  default     = "{{region}}"
}

variable "cluster_name" {
  description = "EKS cluster name"
  type        = string
  default     = "{{cluster_name}}"
}
