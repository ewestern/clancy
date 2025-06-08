import { test, expect, beforeEach, vi } from "vitest";
import { MultiAgentGraphCreator } from "../src/graphCreator.js";
import type {
  LLMProvider,
  LLMCompletionRequest,
  LLMCompletionResponse,
} from "../src/types/llm.js";

// Mock LLM Provider
const mockLLMProvider: LLMProvider = {
  createCompletion: vi.fn(),
  getProviderName: () => "mock",
};

let graphCreator: MultiAgentGraphCreator;

beforeEach(() => {
  // Reset mocks
  vi.clearAllMocks();

  // Create graph creator instance
  graphCreator = new MultiAgentGraphCreator(
    "http://localhost:3001",
    mockLLMProvider,
  );
});

test("createMultiAgentSystem should decompose job and create agents", async () => {
  // Mock LLM responses
  vi.mocked(mockLLMProvider.createCompletion)
    .mockResolvedValueOnce({
      content: JSON.stringify({
        tasks: [
          {
            taskDescription: "Schedule a meeting with the team",
            category: "calendar",
            priority: 3,
            dependencies: [],
            estimatedComplexity: "simple",
            requiredCapabilities: ["calendar-management"],
          },
          {
            taskDescription: "Send email confirmation",
            category: "communication",
            priority: 2,
            dependencies: ["Schedule a meeting with the team"],
            estimatedComplexity: "simple",
            requiredCapabilities: ["email-communication"],
          },
        ],
      }),
    })
    .mockResolvedValueOnce({
      content: JSON.stringify({
        "Calendar Assistant": ["Schedule a meeting with the team"],
        "Communication Assistant": ["Send email confirmation"],
      }),
    });

  const result = await graphCreator.createMultiAgentSystem(
    "Please schedule a team meeting and send confirmations",
    "org-123",
    "Team Meeting System",
  );

  expect(result).toBeDefined();
  expect(result.version).toBe("0.1.0");
  expect(result.jobDescription).toBe(
    "Please schedule a team meeting and send confirmations",
  );
  expect(result.executionMode).toBe("event-driven");
  expect(result.agents).toHaveLength(2);

  // Verify agents were created with proper structure
  expect(result.agents[0]).toMatchObject({
    id: expect.any(String),
    name: expect.any(String),
    description: expect.any(String),
    category: expect.any(String),
    nodes: expect.any(Array),
    edges: expect.any(Array),
    specification: expect.any(Object),
  });

  // Verify inter-agent messages were identified
  expect(result.interAgentMessages).toHaveLength(1);
  expect(result.interAgentMessages[0]).toMatchObject({
    from: expect.any(String),
    to: expect.any(String),
    messageType: "task_completion",
    schema: expect.any(Object),
  });
});

test("decomposeJobDescription should parse LLM response correctly", async () => {
  const mockTasks = [
    {
      taskDescription: "Research flight options",
      category: "travel",
      priority: 4,
      dependencies: [],
      estimatedComplexity: "medium",
      requiredCapabilities: ["travel-booking"],
    },
  ];

  vi.mocked(mockLLMProvider.createCompletion).mockResolvedValueOnce({
    content: JSON.stringify({ tasks: mockTasks }),
  });

  const result = await graphCreator.decomposeJobDescription(
    "Book a flight to San Francisco for next week",
  );

  expect(result).toEqual(mockTasks);
  expect(mockLLMProvider.createCompletion).toHaveBeenCalledWith({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: expect.stringContaining("expert at decomposing complex jobs"),
      },
      {
        role: "user",
        content: expect.stringContaining("Book a flight to San Francisco"),
      },
    ],
    temperature: 0.3,
    maxTokens: 2000,
  });
});

test("decomposeJobDescription should handle LLM errors gracefully", async () => {
  vi.mocked(mockLLMProvider.createCompletion).mockRejectedValueOnce(
    new Error("LLM API error"),
  );

  const result = await graphCreator.decomposeJobDescription(
    "Test job description",
  );

  // Should return fallback task
  expect(result).toHaveLength(1);
  expect(result[0]).toMatchObject({
    taskDescription: "Test job description",
    category: "general",
    priority: 3,
    dependencies: [],
    estimatedComplexity: "medium",
    requiredCapabilities: ["general-assistant"],
  });
});

test("decomposeJobDescription should handle invalid JSON gracefully", async () => {
  vi.mocked(mockLLMProvider.createCompletion).mockResolvedValueOnce({
    content: "Invalid JSON response",
  });

  const result = await graphCreator.decomposeJobDescription(
    "Test job description",
  );

  // Should return fallback task
  expect(result).toHaveLength(1);
  expect(result[0]).toMatchObject({
    taskDescription: "Test job description",
    category: "general",
    estimatedComplexity: "medium",
  });
});

test("createMultiAgentSystem should handle complex job descriptions", async () => {
  const complexTasks = [
    {
      taskDescription: "Research destination options",
      category: "research",
      priority: 5,
      dependencies: [],
      estimatedComplexity: "complex",
      requiredCapabilities: ["research", "travel-booking"],
    },
    {
      taskDescription: "Book flights and hotels",
      category: "travel",
      priority: 4,
      dependencies: ["Research destination options"],
      estimatedComplexity: "medium",
      requiredCapabilities: ["travel-booking"],
    },
    {
      taskDescription: "Create itinerary",
      category: "admin",
      priority: 3,
      dependencies: ["Book flights and hotels"],
      estimatedComplexity: "simple",
      requiredCapabilities: ["calendar-management"],
    },
  ];

  vi.mocked(mockLLMProvider.createCompletion)
    .mockResolvedValueOnce({
      content: JSON.stringify({ tasks: complexTasks }),
    })
    .mockResolvedValueOnce({
      content: JSON.stringify({
        "Travel Planner": [
          "Research destination options",
          "Book flights and hotels",
        ],
        "Itinerary Manager": ["Create itinerary"],
      }),
    });

  const result = await graphCreator.createMultiAgentSystem(
    "Plan a complete vacation including research, booking, and itinerary",
    "org-456",
  );

  expect(result.agents).toHaveLength(2);
  expect(result.interAgentMessages).toHaveLength(1); // One cross-agent dependency

  // Verify complex workflow structure
  const travelPlannerAgent = result.agents.find(
    (a) => a.name === "Travel Planner",
  );
  expect(travelPlannerAgent?.specification?.complexity).toBe("medium"); // Average of complex and medium tasks
  expect(travelPlannerAgent?.specification?.priority).toBe(5); // Max priority from tasks
});
