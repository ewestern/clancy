data "aws_region" "current" {}

locals {

  container_definitions = jsonencode([
    #local.init_container_definition,
    #local.sidecar_container_definition,
    {
      name      = "web-application"
      image     = var.image_uri
      essential = true
      #dependsOn = [
      #  {
      #    containerName = "init",
      #    condition     = "SUCCESS"
      #  }
      #],
      environment = [
        {
          name  = "AWS_REGION"
          value = data.aws_region.current.name
        },
        {
          name  = "KINESIS_STREAM_NAME"
          value = var.kinesis_stream_name
        },
        {
          name  = "ENVIRONMENT"
          value = var.environment
        },
        {
          name  = "OPENAI_API_KEY"
          value = var.openai_api_key
        },
        {
          name  = "REDIRECT_BASE_URL"
          value = local.lb_endpoint
        },
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
        {
          name = "GOOGLE_PUBSUB_TOPIC_NAME"
          value = var.google_pubsub_topic_name

        }
        #{
        #  name  = "OTEL_AWS_APPLICATION_SIGNALS_ENABLED"
        #  value = "true"
        #},
        #{
        #  name  = "OTEL_RESOURCE_ATTRIBUTES"
        #  value = "service.name=agents-core-service-${var.environment},deployment.environment=${var.environment}"
        #},
        #{
        #  name  = "OTEL_EXPORTER_OTLP_PROTOCOL"
        #  value = "http/protobuf"
        #},
        #{
        #  name  = "OTEL_AWS_APPLICATION_SIGNALS_EXPORTER_ENDPOINT"
        #  value = "http://localhost:4316/v1/metrics"
        #},
        #{
        #  name  = "OTEL_EXPORTER_OTLP_TRACES_ENDPOINT"
        #  value = "http://localhost:4316/v1/traces"
        #},
        #{
        #  name  = "OTEL_PROPAGATORS"
        #  value = "xray"
        #},
        #{
        #  name  = "OTEL_TRACES_SAMPLER"
        #  value = "xray"
        #},
        #{
        #  name  = "OTEL_METRICS_EXPORTER"
        #  value = "none"
        #},
        #{
        #  name  = "OTEL_LOGS_EXPORTER"
        #  value = "none"
        #},
        #{
        #  name  = "OTEL_TRACES_SAMPLER_ARG"
        #  value = "endpoint=http://localhost:2000"
        #},
        #{
        #  name  = "NODE_OPTIONS"
        #  value = "--require /otel-auto-instrumentation-node/autoinstrumentation.js"
        #},
        #{
        #  name  = "OTEL_INSTRUMENTATION_HTTP_IGNORE_INCOMING_PATHS"
        #  value = "/health"
        #}
      ]
      environmentFiles = []
      portMappings = [
        {
          containerPort = 3000
          hostPort      = 3000
          protocol      = "tcp"
          name          = "container-port"
          appProtocol   = "http"
        }
      ]
      #healthCheck = {
      #  command = [
      #    "CMD-SHELL",
      #    "curl -f http://0.0.0.0:3000/health || exit 1"
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
          "awslogs-group"         = aws_cloudwatch_log_group.connect_hub_service_log_group.name
        }
        secretOptions = []
      }
      mountPoints = [
        #{
        #  sourceVolume  = "opentelemetry-auto-instrumentation",
        #  containerPath = "/otel-auto-instrumentation-node",
        #  readOnly      = false
        #}
      ]
      volumesFrom    = []
      systemControls = []
      ulimits        = []
    }
  ])
}