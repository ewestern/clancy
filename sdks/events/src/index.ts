import { Static, Type } from "@sinclair/typebox";

export enum EventType {
    LLMUsage = "llmusage",
    Cron = "cron",
    AiEmployeeStateUpdate = "aieemployeestateupdate",
    HumanFeedbackResponse = "humanfeedbackresponse",
    ProviderConnectionCompleted = "providerconnectioncompleted",
    RunIntent = "runintent",
    ResumeIntent = "resumeintent",
    RequestHumanFeedback = "requesthumanfeedback",
    //RequestHumanFeedbackResponse = "requesthumanfeedbackresponse",
    StopIntent = "stopintent",
}
export const AgentSchema = Type.Recursive(This => Type.Object(
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
    //subagents: Type.Array(This),
  }
));

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
    executionId: Type.String(),
    timestamp: Type.String(),
})

export const GraphCreatorRunIntentEventSchema = Type.Composite([
    RunIntentEventSchema,
    Type.Object({
        userId: Type.String(),
        jobDescription: Type.String(),
        agentId: Type.Literal("graph-creator"),
    })
])

export const ResumeIntentEventSchema = Type.Object({
    type: Type.Literal(EventType.ResumeIntent),
    orgId: Type.String(),
    timestamp: Type.String(),
    agentId: Type.String(),
    executionId: Type.String(),
    resume: Type.Any(),
})

export const GraphCreatorResumeIntentEventSchema = Type.Composite([
    ResumeIntentEventSchema,
    Type.Object({
        userId: Type.String(),
    })
])

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
    executionId: Type.Optional(Type.String()),
    request: Type.Union([
        TextRequestSchema,
        OptionsRequestSchema,
    ])
})


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
    description: Type.String(),
    steps: Type.Array(Type.Object({
        description: Type.String(),
        requirement: Type.String(),
    })),
    activation: Type.String(),
})

export const AiEmployeeUpdateEventSchema = Type.Object({
    orgId: Type.String(),
    type: Type.Literal(EventType.AiEmployeeStateUpdate),
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
    agents: Type.Array(AgentSchema),
})

// Trigger

export const CronEventSchema = Type.Object({
    orgId: Type.String(),
    timestamp: Type.String(),
    type: Type.Literal(EventType.Cron),
    agentId: Type.String(),
})



export const EventSchema = Type.Union([
    CronEventSchema,

    // graph creator
    GraphCreatorRunIntentEventSchema,
    GraphCreatorResumeIntentEventSchema,
    AiEmployeeUpdateEventSchema,
    ProviderConnectionCompletedEventSchema,

    RequestHumanFeedbackEventSchema,
    LLMUsageEventSchema,
])


export type Event = Static<typeof EventSchema>


export type RunIntentEvent = Static<typeof RunIntentEventSchema>
export type ResumeIntentEvent = Static<typeof ResumeIntentEventSchema>
export type GraphCreatorRunIntentEvent = Static<typeof GraphCreatorRunIntentEventSchema>
export type GraphCreatorResumeIntentEvent = Static<typeof GraphCreatorResumeIntentEventSchema>
export type RequestHumanFeedbackEvent = Static<typeof RequestHumanFeedbackEventSchema>
export type ProviderConnectionCompletedEvent= Static<typeof ProviderConnectionCompletedEventSchema>
export type AiEmployeeUpdateEvent = Static<typeof AiEmployeeUpdateEventSchema>
export type CronEvent = Static<typeof CronEventSchema>
export type LLMUsageEvent = Static<typeof LLMUsageEventSchema>