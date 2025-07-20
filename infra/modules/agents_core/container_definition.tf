data "aws_region" "current" {}

locals {
  init_container_definition = {
    name      = "init",
    image     = "public.ecr.aws/aws-observability/adot-autoinstrumentation-node:v0.6.0",
    essential = false,
    command = [
      "cp",
      "-a",
      "/autoinstrumentation/.",
      "/otel-auto-instrumentation"
    ],
    mountPoints = [
      {
        sourceVolume  = "opentelemetry-auto-instrumentation",
        containerPath = "/otel-auto-instrumentation",
        readOnly      = false
      }
    ],
  }

  sidecar_container_definition = {
    name      = "ecs-cwagent",
    image     = "public.ecr.aws/cloudwatch-agent/cloudwatch-agent:latest",
    essential = true,
    secrets = [
      {
        name      = "CW_CONFIG_CONTENT",
        valueFrom = "ecs-cwagent"
      }
    ],
    logConfiguration = {
      logDriver = "awslogs",
        options = {
          "awslogs-create-group"  = "true",
          "awslogs-group"         = aws_cloudwatch_log_group.agents_core_service_log_group.name,
          "awslogs-region"        = data.aws_region.current.name,
          "awslogs-stream-prefix" = "ecs"
        }
    }
  }

  container_definitions = jsonencode([
    //local.init_container_definition,
    //local.sidecar_container_definition,
    {
      name      = "web-application"
      image     = var.image_uri
      essential = true
      //dependsOn = [
      //  {
      //    containerName = "init",
      //    condition     = "SUCCESS"
      //  }
      //],
      environment = [
        {
          name  = "DATABASE_URL"
          value = local.database_url
        },
        {
          name  = "CLERK_PUBLISHABLE_KEY"
          value = var.clerk_publishable_key
        },
        {
          name  = "CLERK_SECRET_KEY"
          value = var.clerk_secret_key
        },
        //{
        //  name  = "OTEL_AWS_APPLICATION_SIGNALS_ENABLED"
        //  value = "true"
        //},
        //{
        //  name  = "OTEL_RESOURCE_ATTRIBUTES"
        //  value = "service.name=agents-core-service-${var.environment},deployment.environment=${var.environment}"
        //},
        //{
        //  name  = "OTEL_EXPORTER_OTLP_PROTOCOL"
        //  value = "http/protobuf"
        //},
        //{
        //  name  = "OTEL_AWS_APPLICATION_SIGNALS_EXPORTER_ENDPOINT"
        //  value = "http://localhost:4316/v1/metrics"
        //},
        //{
        //  name  = "OTEL_EXPORTER_OTLP_TRACES_ENDPOINT"
        //  value = "http://localhost:4316/v1/traces"
        //},
        //{
        //  name  = "OTEL_PROPAGATORS"
        //  value = "xray"
        //},
        //{
        //  name  = "OTEL_TRACES_SAMPLER"
        //  value = "xray"
        //},
        //{
        //  name  = "OTEL_METRICS_EXPORTER"
        //  value = "none"
        //},
        //{
        //  name  = "OTEL_LOGS_EXPORTER"
        //  value = "none"
        //},
        //{
        //  name  = "OTEL_TRACES_SAMPLER_ARG"
        //  value = "endpoint=http://localhost:2000"
        //},
        //{
        //  name  = "NODE_OPTIONS"
        //  value = "--require /otel-auto-instrumentation-node/autoinstrumentation.js"
        //},
        //{
        //  name  = "OTEL_INSTRUMENTATION_HTTP_IGNORE_INCOMING_PATHS"
        //  value = "/health"
        //}
      ]
      environmentFiles = []
      portMappings = [
        {
          containerPort = 3000
          hostPort      = 3000
          protocol      = "tcp"
          name          = "container-port"
          # The application serves regular HTTP/1.1 traffic, so expose the port
          # with the correct protocol. Using "http2" here causes the ALB
          # (and Service Connect) to expect HTTP/2 semantics, which our Fastify
          # server does not support and results in failing Target Group health
          # checks.
          appProtocol   = "http"
        }
      ]
      #healthCheck = {
      #  command = [
      #    "CMD-SHELL",
      #    # Use Node to perform the HTTP request so we don't depend on curl/wget
      #    "node -e \"require('http').get('http://127.0.0.1:3000/live', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))\""
      #  ]
      #  interval    = 30
      #  timeout     = 5
      #  retries     = 3
      #  startPeriod = 60
      #}
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          mode                    = "non-blocking"
          "awslogs-create-group"  = "true"
          "max-buffer-size"       = "25m"
          "awslogs-region"        = data.aws_region.current.name
          "awslogs-stream-prefix" = "ecs"
          "awslogs-group"         = aws_cloudwatch_log_group.agents_core_service_log_group.name
        }
        secretOptions = []
      }
      mountPoints = [
        ##{
        ##  sourceVolume  = "opentelemetry-auto-instrumentation",
        ##  containerPath = "/otel-auto-instrumentation-node",
        ##  readOnly      = false
        ##}
      ]
      volumesFrom    = []
      systemControls = []
      ulimits        = []
    }
  ])
}