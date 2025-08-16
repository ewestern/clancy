
resource "aws_cloudwatch_event_rule" "graph_creator_execution_rule" {
  name        = "graph-creator-execution-rule-${var.environment}"
  description = "Route runintent and resumeintent events to graph creator executor"
  event_bus_name = data.aws_cloudwatch_event_bus.default.name

  event_pattern = jsonencode({
    detail = {
      event = {
        type = [
          "runintent",
          "resumeintent"
        ]
        agentId = [
          "graph-creator"
        ]
      }
    }
  })
}

resource "aws_cloudwatch_event_rule" "agent_execution_rule" {
  name        = "agent-execution-rule-${var.environment}"
  description = "Route runintent and resumeintent events to main agent executor (excluding graph-creator)"
  event_bus_name = data.aws_cloudwatch_event_bus.default.name

  event_pattern = jsonencode({
    detail = {
      event = {
        type = [
          "runintent",
          "resumeintent"
        ]
        agentId = [
          {
            "anything-but" = "graph-creator"
          }
        ]
      }
    }
  })
}
resource "aws_cloudwatch_event_rule" "agent_core_subscriptions" {
  name        = "agent-core-subscriptions-${var.environment}"
  description = "Capture each agent core subscription"
  event_bus_name = data.aws_cloudwatch_event_bus.default.name

  event_pattern = jsonencode({
    detail = {
      event = {
        type = [
          "employeestateupdate",
          "providerconnectioncompleted",
          "requesthumanfeedback",
          "requestapproval",
          "actioninitiated",
          "actioncompleted",
          "runcompleted",
          "runintent",
        ]
      }
    }
  })
}

resource "aws_cloudwatch_event_rule" "internal_cron_rule" {
  name        = "internal-cron-rule-${var.environment}"
  description = "Route cron events to internal cron executor"
  event_bus_name = data.aws_cloudwatch_event_bus.default.name
  schedule_expression = "rate(1 minute)"
}

resource "aws_cloudwatch_event_target" "internal_cron_target" {
  rule = aws_cloudwatch_event_rule.internal_cron_rule.name
  arn = aws_cloudwatch_event_api_destination.connect_hub.arn
  event_bus_name = data.aws_cloudwatch_event_bus.default.name
  role_arn = aws_iam_role.eventbridge_connect_hub_role.arn
  http_target {
    path_parameter_values = [
      "webhooks/internal"
    ]
  }
}

resource "aws_cloudwatch_event_target" "graph_creator_executor_target" {
  rule = aws_cloudwatch_event_rule.graph_creator_execution_rule.name
  arn = var.graph_creator_executor_function_arn
  event_bus_name = data.aws_cloudwatch_event_bus.default.name
}
resource "aws_cloudwatch_event_target" "agents_core_target" {
  rule = aws_cloudwatch_event_rule.agent_core_subscriptions.name
  arn = aws_cloudwatch_event_api_destination.agents_core.arn
  event_bus_name = data.aws_cloudwatch_event_bus.default.name
  role_arn = aws_iam_role.eventbridge_agents_core_role.arn
  input_path = "$.detail.event"
  http_target {
    path_parameter_values = [
      "webhook"
    ]
  }
}


resource "aws_cloudwatch_event_target" "main_agent_executor_target" {
  rule = aws_cloudwatch_event_rule.agent_execution_rule.name
  arn = var.main_agent_executor_function_arn
  event_bus_name = data.aws_cloudwatch_event_bus.default.name
}


