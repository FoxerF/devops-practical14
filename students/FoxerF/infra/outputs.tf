output "instance_id" {
  description = "ID of the EC2 instance."
  value       = aws_instance.app.id
}

output "public_ip" {
  description = "Public IP of the application server."
  value       = aws_instance.app.public_ip
}

output "application_url" {
  description = "Public application URL."
  value       = "http://${aws_instance.app.public_ip}:3000"
}