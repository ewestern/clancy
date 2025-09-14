
resource "aws_ecs_service" "connect_hub_service" {

  availability_zone_rebalancing = "ENABLED"

  capacity_provider_strategy {
    base              = "0"
    capacity_provider = "FARGATE"
    weight            = "1"
  }

  cluster = var.cluster_arn

  deployment_circuit_breaker {
    enable   = "true"
    rollback = "true"
  }

  deployment_controller {
    type = "ECS"
  }
  load_balancer {
    target_group_arn = aws_lb_target_group.connect_hub.arn
    container_name   = "web-application"
    container_port   = 3000
  }

  deployment_maximum_percent         = "200"
  deployment_minimum_healthy_percent = "100"
  desired_count                      = var.desired_count
  enable_ecs_managed_tags            = "true"
  enable_execute_command             = "true"
  health_check_grace_period_seconds  = "0"
  name                               = "connect-hub-service"

  network_configuration {
    assign_public_ip = "true"
    security_groups  = [
      aws_security_group.connect_hub_sg.id,
      var.lb_security_group_id
    ]
    subnets          = var.subnet_ids
  }
  service_connect_configuration {
    enabled   = true
    namespace = var.service_discovery_namespace_arn
  }

  platform_version    = "LATEST"
  scheduling_strategy = "REPLICA"
  task_definition     = aws_ecs_task_definition.connect_hub_service_definition.arn
  tags = {
    Name = "connect-hub-service"
    Environment = var.environment
  } 
}


resource "aws_iam_role" "execution_role" {
  name = "connect-hub-service-execution-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      },
    ]
  })
}

resource "aws_iam_role" "task_role" {
  name = "connect-hub-service-task-role-${var.environment}"

  # Terraform's "jsonencode" function converts a
  # Terraform expression result to valid JSON syntax.
  assume_role_policy = jsonencode({
    Version = "2008-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Sid    = ""
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      },
    ]
  })
}
resource "aws_iam_policy" "connect_hub_service_policy" {
  name = "connect-hub-service-policy-${var.environment}"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "firehose:PutRecord",
          "firehose:PutRecordBatch"
        ]
        Effect = "Allow"
        Resource = [
          "arn:aws:firehose:*:*:deliverystream/*"
        ]
      },
      {
        Action = [
          "kinesis:PutRecord",
          "kinesis:PutRecords"
        ]
        Effect = "Allow"
        Resource = [
          "arn:aws:kinesis:*:*:stream/clancy-main-${var.environment}"
        ]
      }
    ]
  })
}

resource "aws_cloudwatch_log_group" "connect_hub_service_log_group" {
  name = "/ecs/connect-hub-service/${var.environment}"
}

# Execution role policy attachments
resource "aws_iam_role_policy_attachment" "execution_role_policy" {
  role       = aws_iam_role.execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Task role policy attachments  
resource "aws_iam_role_policy_attachment" "base_ecs_permissions" {
  role       = aws_iam_role.task_role.name
  // managed policy
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}
resource "aws_iam_role_policy_attachment" "connect_hub_service_policy" {
  role       = aws_iam_role.task_role.name
  policy_arn = aws_iam_policy.connect_hub_service_policy.arn
}

resource "aws_iam_role_policy_attachment" "cloudwatch_agent_server_policy_attachment" {
  role       = aws_iam_role.task_role.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

resource "aws_iam_role_policy" "connect_hub_service_xray_policy" {
  name = "connect-hub-service-xray-permissions-${var.environment}"
  role = aws_iam_role.task_role.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow",
        Action = [
          "xray:PutTraceSegments",
          "xray:PutTelemetryRecords"
        ],
        Resource = "*" // Allows sending traces for all services/resources
      }
    ]
  })
}

// Adding policy to allow Secrets Manager GetSecretValue for OAuth provider secrets
resource "aws_iam_role_policy" "connect_hub_service_secrets_policy" {
  name = "connect-hub-service-secrets-permissions-${var.environment}"
  role = aws_iam_role.task_role.name

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ],
        Resource = "arn:aws:secretsmanager:*:*:secret:clancy/oauth/${var.environment}/*"
      }
    ]
  })
}

// Adding policy to allow S3 access for document upload/download presigned URLs
resource "aws_iam_role_policy" "connect_hub_service_s3_policy" {
  name = "connect-hub-service-s3-permissions-${var.environment}"
  role = aws_iam_role.task_role.name

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:GetObjectVersion"
        ],
        Resource = "arn:aws:s3:::clancy-documents-${var.environment}/*"
      },
      {
        Effect = "Allow",
        Action = [
          "s3:ListBucket"
        ],
        Resource = "arn:aws:s3:::clancy-documents-${var.environment}"
      }
    ]
  })
}


resource "aws_ecs_task_definition" "connect_hub_service_definition" {
  container_definitions = local.container_definitions
  cpu                   = var.task_cpu

  #lifecycle {
  #  ignore_changes = [
  #    container_definitions
  #  ]
  #}

  ephemeral_storage {
    size_in_gib = var.ephemeral_storage_size
  }

  volume {
    name = "opentelemetry-auto-instrumentation"
    configure_at_launch = false
  }

  execution_role_arn       = aws_iam_role.execution_role.arn
  task_role_arn            = aws_iam_role.task_role.arn
  family                   = "connect-hub-service-${var.environment}"
  memory                   = var.task_memory
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]

  runtime_platform {
    cpu_architecture        = "ARM64"
    operating_system_family = "LINUX"
  }

  track_latest = "true"
  tags = {
    Name = "agents-core-service"
    Environment = var.environment
  }
}
