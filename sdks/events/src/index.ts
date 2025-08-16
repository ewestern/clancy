import { Static, Type } from "@sinclair/typebox";

export enum EventType {
    LLMUsage = "llmusage",
    RequestApproval = "requestapproval",
    RequestHumanFeedback = "requesthumanfeedback",

    Cron = "cron",
    EmployeeStateUpdate = "employeestateupdate",
    ProviderConnectionCompleted = "providerconnectioncompleted",
    RunIntent = "runintent",
    ResumeIntent = "resumeintent",
    EmployeeCreated = "employeecreated",
    AgentCreated = "agentcreated",
}
export const AgentPrototypeSchema = Type.Object(
  {
    id: Type.ReadonlyOptional(Type.String()),
    name: Type.String(),
    description: Type.String(),
    capabilities: Type.Array(
      Type.Object({
        providerId: Type.String(),
        id: Type.String(),
      }),
    ),
    trigger: Type.Object({
      providerId: Type.String(),
      id: Type.String(),
      triggerParams: Type.Unknown({
        description: "Parameters for the trigger in the format specified by the get_triggers tool.",
      }),
    }),
    prompt: Type.String(),
})

export const LLMUsageEventSchema = Type.Object({
    type: Type.Literal(EventType.LLMUsage),
    orgId: Type.String(),
    timestamp: Type.String(),
    agentId: Type.String(),
    executionId: Type.String(),
    model: Type.String(),
    promptTokens: Type.Number(),
    completionTokens: Type.Number(),
    totalTokens: Type.Number(),
    prompt: Type.String(),
});


export const RunIntentEventSchema = Type.Object({
    type: Type.Literal(EventType.RunIntent),
    agentId: Type.String(),
    orgId: Type.String(),
    userId: Type.String(),
    executionId: Type.String(),
    timestamp: Type.String(),
    details: Type.Any()
})

//export const GraphCreatorRunIntentEventSchema = Type.Composite([
//    RunIntentEventSchema,
//    Type.Object({
//        userId: Type.String(),
//        jobDescription: Type.String(),
//        agentId: Type.Literal("graph-creator"),
//    })
//])

export const ResumeIntentEventSchema = Type.Object({
    type: Type.Literal(EventType.ResumeIntent),
    orgId: Type.String(),
    userId: Type.String(),
    timestamp: Type.String(),
    agentId: Type.String(),
    executionId: Type.String(),
    resume: Type.Any(),
})

//export const GraphCreatorResumeIntentEventSchema = Type.Composite([
//    ResumeIntentEventSchema,
//    Type.Object({
//        userId: Type.String(),
//    })
//])

export const TextRequestSchema = Type.Object({
    type: Type.Literal("text"),
    text: Type.String(),
})
export const OptionsRequestSchema = Type.Object({
    type: Type.Literal("options"),
    options: Type.Array(Type.String()),
})

export const RequestHumanFeedbackEventSchema = Type.Object({
    type: Type.Literal(EventType.RequestHumanFeedback),
    userId: Type.String(),
    orgId: Type.String(),
    timestamp: Type.String(),
    executionId: Type.String(),
    request: Type.Union([
        TextRequestSchema,
        OptionsRequestSchema,
    ])
})

export const FormattedApprovalRequestSchema = Type.Object({
  request: Type.Any(),
  capabilityName: Type.String(),
  capabilityDescription: Type.String(),
  providerName: Type.String(),
  providerDescription: Type.String(),
  schema: Type.Any(),
})

export const RequestApprovalEventSchema = Type.Object({
    type: Type.Literal(EventType.RequestApproval),
    userId: Type.String(),
    orgId: Type.String(),
    timestamp: Type.String(),
    executionId: Type.String(),
    request: Type.Any()
})

//export const ApprovalResponseEventSchema = Type.Object({
//    type: Type.Literal(EventType.ApprovalResponse),
//    userId: Type.String(),
//    orgId: Type.String(),
//    timestamp: Type.String(),
//    executionId: Type.String(),
//})


export const ProviderConnectionCompletedEventSchema = Type.Object({
    type: Type.Literal(EventType.ProviderConnectionCompleted),
    orgId: Type.String(),
    userId: Type.String(),
    timestamp: Type.String(),
    providerId: Type.String(),
    connectionStatus: Type.Union([Type.Literal("connected"), Type.Literal("failed")]),
    connectionId: Type.String(),
    externalAccountMetadata: Type.Record(Type.String(), Type.Any()),
})


export const WorkflowSchema = Type.Object({
    originalDescription: Type.String(),
    description: Type.String(),
    steps: Type.Array(Type.Object({
        description: Type.String(),
        requirement: Type.String(),
    })),
    activation: Type.String(),
})

export const EmployeeStateUpdateEventSchema = Type.Object({
    orgId: Type.String(),
    type: Type.Literal(EventType.EmployeeStateUpdate),
    timestamp: Type.String(),
    /**
     * Optional processing phase for UI/consumers to understand what has been populated.
     * "workflows"  – only `workflows` has data
     * "mapping"    – `agents` and possibly `unsatisfiedWorkflows` are populated
     * "ready"      – provider-enriched data ready for user completion
     */
    phase: Type.Optional(Type.Union([
        Type.Literal("workflows"),
        Type.Literal("connect"),
        Type.Literal("ready"),
    ])),
    workflows: Type.Array(WorkflowSchema),
    unsatisfiedWorkflows: Type.Array(Type.Object({
        description: Type.String(),
        explanation: Type.String(),
    })),
    agents: Type.Array(AgentPrototypeSchema),
})

export const AgentCreatedEventSchema = Type.Object({
    type: Type.Literal(EventType.AgentCreated),
    orgId: Type.String(),
    userId: Type.String(),
    timestamp: Type.String(),
    agentId: Type.String(),
    agent: AgentPrototypeSchema,
})
export const EmployeeCreatedEventSchema = Type.Object({
    type: Type.Literal(EventType.EmployeeCreated),
    orgId: Type.String(),
    userId: Type.String(),
    timestamp: Type.String(),
    employeeId: Type.String(),
})


export const EventSchema = Type.Union([

    //GraphCreatorRunIntentEventSchema,
    //GraphCreatorResumeIntentEventSchema,

    EmployeeStateUpdateEventSchema,
    ProviderConnectionCompletedEventSchema,
    AgentCreatedEventSchema,
    EmployeeCreatedEventSchema,

    RequestHumanFeedbackEventSchema,
    RequestApprovalEventSchema,

    //ApprovalResponseEventSchema,
    LLMUsageEventSchema,
    RunIntentEventSchema,
    ResumeIntentEventSchema,
])


export type Event = Static<typeof EventSchema>


export type RunIntentEvent = Static<typeof RunIntentEventSchema>
export type ResumeIntentEvent = Static<typeof ResumeIntentEventSchema>
//export type GraphCreatorRunIntentEvent = Static<typeof GraphCreatorRunIntentEventSchema>
//export type GraphCreatorResumeIntentEvent = Static<typeof GraphCreatorResumeIntentEventSchema>
export type RequestHumanFeedbackEvent = Static<typeof RequestHumanFeedbackEventSchema>
export type ProviderConnectionCompletedEvent= Static<typeof ProviderConnectionCompletedEventSchema>
export type EmployeeStateUpdateEvent = Static<typeof EmployeeStateUpdateEventSchema>
export type LLMUsageEvent = Static<typeof LLMUsageEventSchema>
export type RequestApprovalEvent = Static<typeof RequestApprovalEventSchema>
export type FormattedApprovalRequest = Static<typeof FormattedApprovalRequestSchema>