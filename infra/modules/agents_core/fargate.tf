resource "aws_ecs_service" "agents_core_service" {

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
    target_group_arn = aws_lb_target_group.agents_core.arn
    container_name   = "web-application"
    container_port   = 3000
  }

  deployment_maximum_percent         = "200"
  deployment_minimum_healthy_percent = "100"
  desired_count                      = var.desired_count
  enable_ecs_managed_tags            = "true"
  enable_execute_command             = "true"
  # Allow the application (especially its database connection) time to
  # establish before ELB health-checks begin.
  health_check_grace_period_seconds  = "60"
  name                               = "agents-core-service"

  network_configuration {
    assign_public_ip = "true"
    security_groups  = [
      aws_security_group.agents_core_sg.id,
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
  task_definition     = aws_ecs_task_definition.agents_core_service_definition.arn
  tags = {
    Name = "agents-core-service"
    Environment = var.environment
  } 
}


resource "aws_iam_role" "execution_role" {
  name = "agents-core-service-execution-role-${var.environment}"

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
  name = "agents-core-service-task-role-${var.environment}"

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
resource "aws_iam_policy" "agents_core_service_policy" {
  name = "agents-core-service-policy-${var.environment}"
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
      }
    ]
  })
}

resource "aws_cloudwatch_log_group" "agents_core_service_log_group" {
  name = "/ecs/agents-core-service/${var.environment}"
}

# Execution role policy attachments
resource "aws_iam_role_policy_attachment" "execution_role_policy" {
  role       = aws_iam_role.execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "execution_role_ssm_policy" {
  name = "agents-core-execution-ssm-policy-${var.environment}"
  role = aws_iam_role.execution_role.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameters",
          "ssm:GetParameter",
          "ssm:GetParametersByPath"
        ]
        Resource = [
          "arn:aws:ssm:*:*:parameter/ecs-cwagent*",
          "arn:aws:ssm:*:*:parameter/agents-core/*"
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy" "execution_role_logs_policy" {
  name = "agents-core-execution-logs-policy-${var.environment}"
  role = aws_iam_role.execution_role.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = [
          "arn:aws:logs:*:*:log-group:${aws_cloudwatch_log_group.agents_core_service_log_group.name}:*"
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy" "execution_role_ecr_policy" {
  name = "agents-core-execution-ecr-policy-${var.environment}"
  role = aws_iam_role.execution_role.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage"
        ]
        Resource = "*"
      }
    ]
  })
}

# Task role policy attachments  
resource "aws_iam_role_policy_attachment" "base_ecs_permissions" {
  role       = aws_iam_role.task_role.name
  // managed policy
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}
resource "aws_iam_role_policy_attachment" "agents_core_service_policy" {
  role       = aws_iam_role.task_role.name
  policy_arn = aws_iam_policy.agents_core_service_policy.arn
}

resource "aws_iam_role_policy_attachment" "cloudwatch_agent_server_policy_attachment" {
  role       = aws_iam_role.task_role.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

resource "aws_iam_role_policy" "agents_core_service_xray_policy" {
  name = "agents-core-service-xray-permissions-${var.environment}"
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

// Adding policy to allow publishing to Kinesis stream
resource "aws_iam_role_policy" "agents_core_service_kinesis_policy" {
  name = "agents-core-service-kinesis-permissions-${var.environment}"
  role = aws_iam_role.task_role.name

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = [
          "kinesis:PutRecord",
          "kinesis:PutRecords"
        ],
        Resource = "arn:aws:kinesis:*:*:stream/clancy-main-${var.environment}"
      }
    ]
  })
}


resource "aws_ecs_task_definition" "agents_core_service_definition" {
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
  family                   = "agents-core-service-${var.environment}"
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
