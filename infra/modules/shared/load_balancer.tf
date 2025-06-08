resource "aws_lb" "shared_lb" {
  name               = "lb-${var.environment}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.shared_sg.id]
  subnets            = values(local.all_public_subnets)

  enable_deletion_protection = true

  access_logs {
    bucket  = aws_s3_bucket.lb_logs.id
    prefix  = "access-logs"
    enabled = true
  }
}
resource "aws_lb_listener" "shared_lb_listener" {
  load_balancer_arn = aws_lb.shared_lb.arn
  port              = 443
  protocol          = "HTTPS"
  certificate_arn   = var.certificate_arn

  default_action {
    type = "fixed-response"

    fixed_response {
      content_type = "application/json"
      message_body = "[]"
      status_code  = "200"
    }
  }
}
resource "aws_s3_bucket" "lb_logs" {
  bucket = "clancy-lb-logs-${var.environment}"
  region = "us-east-1"
}

resource "aws_s3_bucket_policy" "lb_logs_policy" {
  bucket = aws_s3_bucket.lb_logs.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::127311923021:root"
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.lb_logs.arn}/*"
      },
      {
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::127311923021:root"
        }
        Action   = "s3:GetBucketAcl"
        Resource = aws_s3_bucket.lb_logs.arn
      }
    ]
  })
}

resource "aws_s3_bucket_public_access_block" "lb_logs_pab" {
  bucket = aws_s3_bucket.lb_logs.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

data "aws_caller_identity" "current" {}