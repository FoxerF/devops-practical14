variable "aws_region" {
  description = "AWS region for the project."
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Name used for AWS resources."
  type        = string
  default     = "focus-session-tracker"
}

variable "instance_type" {
  description = "EC2 instance type."
  type        = string
  default     = "t3.micro"
}

variable "ssh_public_key" {
  description = "Public SSH key imported into EC2 by Terraform."
  type        = string
  sensitive   = true
}

variable "ssh_ingress_cidr" {
  description = "CIDR allowed to connect to SSH."
  type        = string
  default     = "0.0.0.0/0"
}