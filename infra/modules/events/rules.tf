
resource "aws_cloudwatch_event_rule" "graph_creator_execution_rule" {
  name        = "graph-creator-execution-rule"
  description = "Route runintent and resumeintent events to graph creator executor"
  event_bus_name = aws_cloudwatch_event_bus.clancy_main_event_bus.name

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
  name        = "agent-execution-rule"
  description = "Route runintent and resumeintent events to main agent executor (excluding graph-creator)"
  event_bus_name = aws_cloudwatch_event_bus.clancy_main_event_bus.name

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
  name        = "agent-core-subscriptions"
  description = "Capture each agent core subscription"
  event_bus_name = aws_cloudwatch_event_bus.clancy_main_event_bus.name

  event_pattern = jsonencode({
    detail = {
      event = {
        type = [
          "employeestateupdate",
          "providerconnectioncompleted",
          "requesthumanfeedback"
        ]
      }
    }
  })
}

resource "aws_cloudwatch_event_target" "graph_creator_executor_target" {
  rule = aws_cloudwatch_event_rule.graph_creator_execution_rule.name
  arn = var.graph_creator_executor_function_arn
  event_bus_name = aws_cloudwatch_event_bus.clancy_main_event_bus.name
}
resource "aws_cloudwatch_event_target" "agents_core_target" {
  rule = aws_cloudwatch_event_rule.agent_core_subscriptions.name
  arn = aws_cloudwatch_event_api_destination.agents_core.arn
  event_bus_name = aws_cloudwatch_event_bus.clancy_main_event_bus.name
  role_arn = "arn:aws:iam::702853186114:role/service-role/Amazon_EventBridge_Invoke_Api_Destination_336818126"
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
  event_bus_name = aws_cloudwatch_event_bus.clancy_main_event_bus.name
}
