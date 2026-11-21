# Find the existing default VPC.
data "aws_vpc" "default" {
  default = true
}

# Find the subnets in the default VPC.
data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# Find the latest official Ubuntu 24.04 LTS AMI.
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"]
  }

  filter {
    name   = "architecture"
    values = ["x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Register our public SSH key with AWS.
resource "aws_key_pair" "deploy" {
  key_name   = "${var.project_name}-key"
  public_key = var.ssh_public_key

  tags = {
    Project   = var.project_name
    ManagedBy = "Terraform"
  }
}

# Allow SSH and application traffic.
resource "aws_security_group" "app" {
  name        = "${var.project_name}-sg"
  description = "Security group for Focus Session Tracker"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "SSH access for deployment"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.ssh_ingress_cidr]
  }

  ingress {
    description = "Focus Session Tracker API"
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "Allow outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name      = "${var.project_name}-sg"
    Project   = var.project_name
    ManagedBy = "Terraform"
  }
}

# Create the application server.
resource "aws_instance" "app" {
  ami                         = data.aws_ami.ubuntu.id
  instance_type               = var.instance_type
  subnet_id                   = sort(data.aws_subnets.default.ids)[0]
  associate_public_ip_address = true

  vpc_security_group_ids = [
    aws_security_group.app.id
  ]

  key_name = aws_key_pair.deploy.key_name

  user_data                   = file("${path.module}/user_data.sh")
  user_data_replace_on_change = true

  # Avoid surplus CPU-credit charges on a T3 instance.
  credit_specification {
    cpu_credits = "standard"
  }

  # Require IMDSv2.
  metadata_options {
    http_tokens = "required"
  }

  root_block_device {
    volume_size           = 8
    volume_type           = "gp3"
    encrypted             = true
    delete_on_termination = true
  }

  tags = {
    Name      = var.project_name
    Project   = var.project_name
    ManagedBy = "Terraform"
  }
}