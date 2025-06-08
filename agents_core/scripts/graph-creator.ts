#!/usr/bin/env node

import { StateGraph, END, START, interrupt, Annotation } from "@langchain/langgraph";
import { MemorySaver } from "@langchain/langgraph";
import * as readline from 'readline';
import { v4 as generateUuid } from "uuid";
import dotenv from "dotenv";
import { OpenAIProvider } from "../src/services/llm/OpenAIProvider.js";
import { CapabilitiesApi, Configuration, Capability } from "@clancy-ai/sdks";
import jspath from 'jspath';
import { createEventBus } from "../src/prototype_helpers/event_bus.js";
import type { EventBus } from "../src/events/bus.js";
import { DigitalEmployeeSpec, WorkflowSpec } from "../src/models/graphV2.js";

dotenv.config();

// ============================================================================
// ENHANCED DSL TYPE DEFINITIONS
// ============================================================================

interface FieldMapping {
  source: string; // jspath expression for extracting/transforming data (e.g., "$.customer.email", ".name | uppercase")
  default?: any; // Default value if source is undefined
}

interface CapabilityConfig {
  capabilityId: string;
  parameters: Record<string, any>;
  authConfig?: {
    orgId: string;
    connectionId?: string;
  };
}

interface RetryPolicy {
  maxRetries: number;
  backoffStrategy: "exponential" | "linear" | "fixed";
  baseDelay: number;
  maxDelay: number;
  retryableErrors?: string[]; // Error codes that should trigger retry
}

interface TaskExecution {
  // Input/Output Schemas (JSONSchema7-like)
  inputSchema: Record<string, any>;
  outputSchema: Record<string, any>;
  
  // State mapping - how to extract inputs from workflow state
  inputMapping: Record<string, string | FieldMapping>;
  
  // How to merge outputs back into workflow state
  outputMapping: Record<string, string | FieldMapping>;
  
  // LLM prompting (every node has this - it's what makes it a node)
  prompting: {
    systemPrompt: string;
    userPromptTemplate?: string;
    fewShotExamples?: Array<{input: any, output: any}>;
    temperature?: number;
  };
  
  // External tool capabilities (optional)
  capabilityConfig?: Record<string, CapabilityConfig>;
  
  // Error handling
  errorHandling: {
    retryPolicy: RetryPolicy;
    fallbackCapability?: string;
    errorTransformation?: string; // JS expression
  };
  
  // Conditional execution
  condition?: string; // JS expression that evaluates to boolean
  
  // Validation rules
  validation?: {
    preConditions?: string[]; // JS expressions
    postConditions?: string[]; // JS expressions
  };
}

interface EnhancedTaskNodeSpec {
  id: string;
  type: "task";
  metadata: Record<string, any>;
  description: string;
  capability: string[];
  execution: TaskExecution;
  handoff?: {
    to: string;
    message: string;
  };
}

interface PlaceholderNodeSpec {
  id: "placeholder";
  type: "placeholder";
  metadata: Record<string, any>;
  description: string;
  options: string[];
}

interface InterruptNodeSpec {
  id: string;
  type: "interrupt";
  metadata: Record<string, any>;
  description: string;
  /**
   * Prompt definition that will be passed to the HIL layer when interrupt() is
   * invoked. This mirrors the HILPrompt shape from the design doc so it can be
   * forwarded straight to the event-bus without transformation.
   */
  prompt: {
    kind: "options" | "questions";
    messages: { role: "system"; content: string }[];
    inputSchema: Record<string, any>;
    options?: { id: string; label: string; description?: string }[];
    questions?: { id: string; text: string; exampleAnswer?: string }[];
  };
  /**
   * Which parts of the current workflow state should be injected into the
   * interrupt payload. Keys of this mapping become top-level fields on the
   * object supplied to interrupt().
   */
  inputMapping: Record<string, string | FieldMapping>;
  /**
   * How the resolved interrupt (i.e. HILResponse) should be merged back into
   * state once the graph is resumed. Optional because some interrupt nodes may
   * not write anything back (pure notification use-cases).
   */
  outputMapping?: Record<string, string | FieldMapping>;
}

interface WorkflowNodeSpec {
  id: string;
  metadata: Record<string, any>;
  nodes: (EnhancedTaskNodeSpec | PlaceholderNodeSpec | InterruptNodeSpec)[];
  edges: [string, string][];
}

interface EmployeeGraphSpec {
  graphId: string;
  version: string;
  jobDescription: string;
  metadata: Record<string, any>;
  nodes: WorkflowNodeSpec[];
  edges: [string, string][];
}

interface TaskDecomposition {
  taskDescription: string;
  category: string;
  dependencies: string[];
  capabilities?: string[];
}


// ============================================================================
// PROMPT LIBRARY
// ============================================================================

const PROMPTS = {
  // Legacy prompt for backwards compatibility
  JOB_DECOMPOSITION: {
    system: `You are an expert at breaking down job descriptions into discrete, actionable tasks.

Analyze the provided job description and decompose it into specific tasks. Each task should be:
- Concrete and actionable
- Have clear success criteria  
- Be categorizable by domain (e.g., communication, data, scheduling, etc.)
- Include any obvious dependencies on other tasks

Return your response as a JSON object with this structure:
{
  "tasks": [
    {
      "taskDescription": "Clear description of what needs to be done",
      "category": "Domain category (e.g., communication, scheduling, data)",
      "dependencies": ["List of task descriptions this depends on"]
    }
  ]
}`,
    user: "Job Description:\n{jobDescription}"
  },

  // DSL-based Graph Creator Agent prompts
  INITIAL_ANALYSIS: `You are an expert at breaking down job descriptions into discrete, actionable tasks.

Analyze the provided job description and decompose it into specific tasks. Each task should be:
- Concrete and actionable
- Have clear success criteria  
- Be categorizable by domain (e.g., communication, data, scheduling, etc.)
- Include any obvious dependencies on other tasks

Return your response as a JSON object with this structure:
{
  "taskDecomposition": [
    {
      "taskDescription": "Clear description of what needs to be done",
      "category": "Domain category (e.g., communication, scheduling, data)",
      "dependencies": ["List of task descriptions this depends on"]
    }
  ]
}`,

  GAP_IDENTIFICATION: `You are an expert at identifying gaps and missing information in task decompositions.

Analyze the provided task decomposition and identify gaps such as:
- Missing integrations or capabilities needed
- Underspecified requirements that need clarification
- Organizational context that needs to be understood
- Workflow ambiguities that could cause execution issues

Cross-reference with available capabilities to identify what's missing.

Return your analysis as a JSON object with identified gaps categorized by type and priority.`,

  ITERATIVE_REFINEMENT: `You are an expert at refining and improving task descriptions based on user feedback.

Take the existing task decomposition and user responses/feedback, then:
- Update task descriptions with additional clarity and detail
- Incorporate user-specified preferences and constraints
- Add missing context or requirements that were identified
- Maintain consistency across all tasks
- Ensure dependencies are still valid after changes

Return the refined task decomposition with the same structure but improved content.`,

  VALIDATION: `You are an expert at validating task decompositions for completeness and feasibility.

Evaluate the provided task decomposition to determine if it is:
- Complete (all necessary tasks identified)
- Feasible (tasks can actually be executed with available capabilities)
- Well-specified (tasks have enough detail for implementation)
- Properly structured (dependencies make sense, no circular references)

Return a validation result indicating whether the decomposition is ready for implementation.`
};

// ============================================================================
// GRAPH CREATOR AGENT DSL SPECIFICATION
// ============================================================================

const GRAPH_CREATOR_AGENT_WORKFLOW: WorkflowSpec = {
  id: "graph-creator-agent",
  metadata: {
    category: "meta-agent",
    complexity: "high",
    dogfooding: true
  },
  nodes: [
    {
      id: "initial-analysis",
      nodes: [
      {
      id: "graph_creation_workflow",
      metadata: {},
      nodes: [
      {
        id: "initial-analysis",
        type: "task",
        metadata: { skill: "analysis" },
        description: "Analyze job description and decompose into discrete, actionable tasks",
        capability: [], // LLM-only node, no external capabilities
        execution: {
          inputSchema: {
            type: "object",
            required: ["jobDescription"],
            properties: {
              jobDescription: { type: "string" },
              orgId: { type: "string" },
              executionId: { type: "string" }
            }
          },
          outputSchema: {
            type: "object",
            properties: {
              taskDecomposition: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    taskDescription: { type: "string" },
                    category: { type: "string" },
                    dependencies: { type: "array", items: { type: "string" } }
                  }
                }
              }
            }
          },
          inputMapping: {
            jobDescription: "$.jobDescription",
            orgId: "$.orgId",
            executionId: "$.executionId"
          },
          outputMapping: {
            taskDecomposition: "$.taskDecomposition"
          },
          prompting: {
            systemPrompt: PROMPTS.INITIAL_ANALYSIS,
            temperature: 0.1
          },
          errorHandling: {
            retryPolicy: {
              maxRetries: 2,
              backoffStrategy: "exponential",
              baseDelay: 1000,
              maxDelay: 5000
            }
          }
        }
      },
      {
        id: "gap-identification", 
        type: "task",
        metadata: { skill: "analysis" },
        description: "Identify gaps and missing information in the task decomposition",
        capability: [], // No capabilities needed - uses fundamental infrastructure
        execution: {
          inputSchema: {
            type: "object",
            required: ["taskDecomposition"],
            properties: {
              taskDecomposition: { type: "array" },
              orgId: { type: "string" }
            }
          },
          outputSchema: {
            type: "object",
            properties: {
              identifiedGaps: { type: "array" },
              availableCapabilities: { type: "array" }
            }
          },
          inputMapping: {
            taskDecomposition: "$.taskDecomposition",
            orgId: "$.orgId"
          },
          outputMapping: {
            identifiedGaps: "$.identifiedGaps",
            availableCapabilities: "$.availableCapabilities"
          },
          prompting: {
            systemPrompt: PROMPTS.GAP_IDENTIFICATION,
            temperature: 0.2
          },
          // No capabilityConfig needed - CapabilitiesApi is fundamental infrastructure
          errorHandling: {
            retryPolicy: {
              maxRetries: 3,
              backoffStrategy: "exponential", 
              baseDelay: 1000,
              maxDelay: 10000
            }
          }
        }
      },
      {
        id: "human-interaction",
        type: "interrupt",
        metadata: { skill: "communication" },
        description: "Pause execution and collect user input to resolve identified gaps via HIL.",
        prompt: {
          kind: "questions",
          messages: [
            { role: "system", content: "I need your help to clarify a few open questions before I can continue building the employee graph." }
          ],
          inputSchema: {
            type: "object",
            properties: {
              userResponses: { type: "object" }
            }
          },
          questions: [
            { id: "gap_responses", text: "Please provide the necessary details to address the identified gaps." }
          ]
        },
        inputMapping: {
          gaps: "$.identifiedGaps",
          capabilities: "$.availableCapabilities",
          executionId: "$.executionId"
        },
        outputMapping: {
          currentPrompt: "$.currentPrompt"
        }
      },
      {
        id: "iterative-refinement",
        type: "task",
        metadata: { skill: "synthesis" },
        description: "Refine task decomposition based on user feedback and responses",
        capability: [], // LLM-only node
        execution: {
          inputSchema: {
            type: "object", 
            required: ["taskDecomposition", "userResponses"],
            properties: {
              taskDecomposition: { type: "array" },
              userResponses: { type: "object" },
              iterationCount: { type: "number" }
            }
          },
          outputSchema: {
            type: "object",
            properties: {
              taskDecomposition: { type: "array" },
              iterationCount: { type: "number" }
            }
          },
          inputMapping: {
            tasks: "$.taskDecomposition",
            feedback: "$.userResponses",
            iteration: "$.iterationCount"
          },
          outputMapping: {
            taskDecomposition: "$.taskDecomposition", 
            iterationCount: "$.iterationCount"
          },
          prompting: {
            systemPrompt: PROMPTS.ITERATIVE_REFINEMENT,
            temperature: 0.3
          },
          errorHandling: {
            retryPolicy: {
              maxRetries: 2,
              backoffStrategy: "linear",
              baseDelay: 1000, 
              maxDelay: 3000
            }
          }
        }
      },
      {
        id: "validation",
        type: "task",
        metadata: { skill: "validation" },
        description: "Validate completeness and feasibility of refined task decomposition",
        capability: ["validation.check"],
        execution: {
          inputSchema: {
            type: "object",
            required: ["taskDecomposition", "userResponses"],
            properties: {
              taskDecomposition: { type: "array" },
              userResponses: { type: "object" }
            }
          },
          outputSchema: {
            type: "object",
            properties: {
              isComplete: { type: "boolean" },
              validationResults: { type: "object" }
            }
          },
          inputMapping: {
            tasks: "$.taskDecomposition",
            responses: "$.userResponses"
          },
          outputMapping: {
            isComplete: "$.isComplete",
            validationResults: "$.validationResults"
          },
          prompting: {
            systemPrompt: PROMPTS.VALIDATION,
            temperature: 0.1
          },
          capabilityConfig: {
            "validation.check": {
              capabilityId: "validation.check",
              parameters: {
                checkCapabilities: true,
                checkCompleteness: true,
                checkFeasibility: true
              }
            }
          },
          errorHandling: {
            retryPolicy: {
              maxRetries: 1,
              backoffStrategy: "fixed",
              baseDelay: 500,
              maxDelay: 500
            }
          },
          condition: "$.taskDecomposition.length > 0"
        }
      },
      {
        id: "graph-assembly",
        type: "task", 
        metadata: { skill: "construction" },
        description: "Assemble final executable employee graph from validated tasks",
        capability: ["graph.build"],
        execution: {
          inputSchema: {
            type: "object",
            required: ["taskDecomposition", "isComplete"],
            properties: {
              taskDecomposition: { type: "array" },
              isComplete: { type: "boolean" },
              orgId: { type: "string" },
              jobDescription: { type: "string" }
            }
          },
          outputSchema: {
            type: "object", 
            properties: {
              finalGraph: { type: "object" },
              executableWorkflow: { type: "object" }
            }
          },
          inputMapping: {
            tasks: "$.taskDecomposition",
            complete: "$.isComplete",
            orgId: "$.orgId",
            jobDescription: "$.jobDescription"
          },
          outputMapping: {
            finalGraph: "$.finalGraph",
            executableWorkflow: "$.executableWorkflow"
          },
          prompting: {
            systemPrompt: "You are an expert at assembling executable employee graphs from task decompositions. Create a well-structured graph with proper input/output mapping and capability configurations.",
            temperature: 0.2
          },
          capabilityConfig: {
            "graph.build": {
              capabilityId: "graph.build",
              parameters: {
                generateExecutable: true,
                validateGraph: true
              }
            }
          },
          errorHandling: {
            retryPolicy: {
              maxRetries: 2,
              backoffStrategy: "exponential",
              baseDelay: 1000,
              maxDelay: 5000
            }
          },
          condition: "$.isComplete === true",
          validation: {
            preConditions: [
              "$.taskDecomposition.length > 0",
              "$.isComplete === true"
            ],
            postConditions: [
              "$.finalGraph !== undefined"
            ]
          }
        }
      }
    ],
    edges: [
      ["initial-analysis", "gap-identification"],
      ["gap-identification", "human-interaction"], 
      ["human-interaction", "iterative-refinement"],
      ["iterative-refinement", "validation"],
      // Conditional: if validation passes, go to assembly, otherwise loop back to gap identification
      ["validation", "graph-assembly"], // when isComplete = true
      ["validation", "gap-identification"] // when isComplete = false (loop back)
    ]
    },
    // HIL Subgraph - Graph Creator uses console.prompt only (creating graphs in the app)
    {
      id: "hil_subgraph",
      metadata: { type: "hil", autoGenerated: true },
      nodes: [
        {
          id: "hil-listener",
          type: "task",
          metadata: { skill: "communication", persistent: true },
          description: "Listen for HIL prompt events and route through console for graph creation",
          capability: ["console.prompt"], // Graph Creator uses console interaction only
          execution: {
            inputSchema: {
              type: "object",
              required: ["hilPrompt"],
              properties: {
                hilPrompt: { type: "object" },
                deliveryMethods: { type: "array", items: { type: "string" } }
              }
            },
            outputSchema: {
              type: "object",
              properties: {
                promptDelivered: { type: "boolean" },
                deliveryMethods: { type: "array" }
              }
            },
            inputMapping: {
              prompt: "$.hilPrompt",
              methods: "$.deliveryMethods"
            },
            outputMapping: {
              promptDelivered: "$.promptDelivered",
              deliveryMethods: "$.deliveryMethods"
            },
            prompting: {
              systemPrompt: "You are a HIL coordinator for graph creation. Route human interaction prompts through the console interface for interactive graph building.",
              temperature: 0.1
            },
            capabilityConfig: {
              "console.prompt": {
                capabilityId: "console.prompt",
                parameters: {
                  interactive: true,
                  timeout: 300000 // 5 minutes
                }
              }
            },
            errorHandling: {
              retryPolicy: {
                maxRetries: 2,
                backoffStrategy: "exponential",
                baseDelay: 1000,
                maxDelay: 5000
              }
            }
          }
        },
        {
          id: "hil-correlator",
          type: "task",
          metadata: { skill: "coordination", persistent: true },
          description: "Correlate HIL responses with original prompts and resume workflows",
          capability: [],
          execution: {
            inputSchema: {
              type: "object",
              required: ["hilResponse"],
              properties: {
                hilResponse: { type: "object" },
                executionId: { type: "string" },
                promptId: { type: "string" }
              }
            },
            outputSchema: {
              type: "object",
              properties: {
                workflowResumed: { type: "boolean" },
                responseData: { type: "object" }
              }
            },
            inputMapping: {
              response: "$.hilResponse",
              executionId: "$.executionId",
              promptId: "$.promptId"
            },
            outputMapping: {
              workflowResumed: "$.workflowResumed",
              responseData: "$.responseData"
            },
            prompting: {
              systemPrompt: "You are a HIL response correlator. Process human responses and emit workflow resumption events with the response data.",
              temperature: 0.1
            },
            errorHandling: {
              retryPolicy: {
                maxRetries: 1,
                backoffStrategy: "fixed",
                baseDelay: 500,
                maxDelay: 500
              }
            }
          }
        }
      ],
      edges: [
        ["hil-listener", "hil-correlator"]
      ]
    }
  ]
  }
]
};

const GRAPH_CREATOR_AGENT_SPEC: DigitalEmployeeSpec = {
  graphId: "graph-creator-agent",
  version: "1.0.0", 
  jobDescription: "Creates digital employees from job descriptions through interactive refinement",
  metadata: {
    category: "meta-agent",
    complexity: "high",
    dogfooding: true
  },
  workflows: [GRAPH_CREATOR_AGENT_WORKFLOW],
  nodes: ,
  edges: [
    // Main workflow operates independently
    // HIL subgraph listens for HIL events from any workflow
  ]
};

// Graph Creator State Interface
interface GraphCreationState {
  // Input
  jobDescription: string;
  orgId: string;
  executionId: string;
  
  // Analysis Results
  taskDecomposition?: TaskDecomposition[];
  identifiedGaps?: Gap[];
  availableCapabilities?: any[]; // Using any[] instead of Capability[] to avoid SDK type issues
  
  // Human Interaction
  currentPrompt?: HILPrompt;
  userResponses?: Record<string, any>;
  iterationCount: number;
  
  // Output
  finalGraph?: EmployeeGraphSpec;
  isComplete: boolean;
  
  // Debug/Logging
  logs: string[];
}

// HIL Types from design document
interface HILPrompt {
  id: string;
  executionId: string;
  promptId: string;
  kind: "options" | "questions";
  messages: { role: "assistant" | "system"; content: string }[];
  inputSchema: Record<string, any>;
  options?: { id: string; label: string; description?: string }[];
  questions?: { id: string; text: string; exampleAnswer?: string }[];
}

interface Gap {
  type: "missing_integration" | "underspecified_task" | "organizational_context" | "workflow_ambiguity";
  description: string;
  priority: "blocking" | "high" | "medium" | "low";
  suggestedActions: string[];
}

// ============================================================================
// DSL-TO-LANGGRAPH EXECUTION ENGINE
// ============================================================================

class WorkflowExecutor {
  private connectHubUrl: string;
  private capabilitiesApi: CapabilitiesApi;
  private hilEventBus?: EventBus<any>;

  constructor(connectHubUrl: string, hilEventBus?: EventBus<any>) {
    this.connectHubUrl = connectHubUrl;
    this.hilEventBus = hilEventBus;
    // CapabilitiesApi is fundamental infrastructure, not a capability
    const config = new Configuration({
      basePath: connectHubUrl,
    });
    this.capabilitiesApi = new CapabilitiesApi(config);
  }

  // Fundamental infrastructure method - available to all digital employees
  async getAvailableCapabilities(orgId?: string): Promise<any[]> {
    try {
      const response = await this.capabilitiesApi.capabilitiesGet();
      console.log('   ✅ Fetched capabilities via fundamental infrastructure');
      return response || [];
    } catch (error) {
      console.error('   ❌ CapabilitiesApi unavailable:', error.message);
      throw new Error(`Failed to fetch capabilities: ${error.message}`);
    }
  }

  // Create executable LangGraph from DSL
  createWorkflowFromDSL(employeeGraph: EmployeeGraphSpec): StateGraph<any> {
    const workflow = employeeGraph.nodes[0]; // Single workflow for now
    if (!workflow) {
      throw new Error('No workflow found in employee graph');
    }

    // Build state schema from all task input/output mappings
    const stateSchema = this.buildStateSchema(workflow);
    
    // Create the StateGraph
    const graph = new StateGraph(stateSchema);

    // Add nodes for each task or interrupt
    const executableNodes = workflow.nodes.filter(node => node.type === 'task' || node.type === 'interrupt');
    executableNodes.forEach(nodeSpec => {
      if (nodeSpec.type === 'task') {
        const fn = this.createTaskNodeFunction(nodeSpec as EnhancedTaskNodeSpec);
        graph.addNode(nodeSpec.id, fn);
      } else if (nodeSpec.type === 'interrupt') {
        const fn = this.createInterruptNodeFunction(nodeSpec as InterruptNodeSpec);
        graph.addNode(nodeSpec.id, fn);
      }
    });

    // Add edges defined in DSL
    workflow.edges.forEach(([from, to]) => {
      graph.addEdge(from as any, to as any);
    });

    // Connect start/end for the overall workflow
    if (executableNodes.length > 0) {
      graph.addEdge(START, executableNodes[0].id as any);
      graph.addEdge(executableNodes[executableNodes.length - 1].id as any, END);
    }

    return graph;
  }

  private buildStateSchema(workflow: WorkflowNodeSpec): any {
    const stateFields: Record<string, any> = {
      // Standard fields
      executionId: Annotation<string>(),
      orgId: Annotation<string>(),
      timestamp: Annotation<string>(),
      
      // Core GraphCreationState fields
      jobDescription: Annotation<string>(),
      taskDecomposition: Annotation<any>(),
      identifiedGaps: Annotation<any>(),
      availableCapabilities: Annotation<any>(),
      currentPrompt: Annotation<any>(),
      userResponses: Annotation<any>(),
      iterationCount: Annotation<number>(),
      finalGraph: Annotation<any>(),
      isComplete: Annotation<boolean>(),
      logs: Annotation<any>(),
      validationResults: Annotation<any>(),
    };

    // Extract additional state fields from task and interrupt mappings
    workflow.nodes.forEach(node => {
      if (node.type === 'task') {
        const taskNode = node as EnhancedTaskNodeSpec;
        // Add fields from input mapping
        Object.keys(taskNode.execution.inputMapping).forEach(field => {
          if (!stateFields[field]) {
            stateFields[field] = Annotation<any>();
          }
        });
        // Add fields from output mapping
        Object.keys(taskNode.execution.outputMapping).forEach(field => {
          if (!stateFields[field]) {
            stateFields[field] = Annotation<any>();
          }
        });
      } else if (node.type === 'interrupt') {
        const intNode = node as InterruptNodeSpec;
        // Input mapping
        Object.keys(intNode.inputMapping).forEach(field => {
          if (!stateFields[field]) {
            stateFields[field] = Annotation<any>();
          }
        });
        // Output mapping (optional)
        if (intNode.outputMapping) {
          Object.keys(intNode.outputMapping).forEach(field => {
            if (!stateFields[field]) {
              stateFields[field] = Annotation<any>();
            }
          });
        }
      }
    });

    return Annotation.Root(stateFields);
  }

  private createTaskNodeFunction(taskSpec: EnhancedTaskNodeSpec) {
    return async (state: any): Promise<Partial<any>> => {
      console.log(`Executing task: ${taskSpec.description}`);
      
      try {
        // 1. Extract inputs from state
        const inputs = this.extractInputs(state, taskSpec.execution.inputMapping);
        // 2. Validate inputs
        this.validateInputs(inputs, taskSpec.execution.inputSchema);
        
        // 3. Check pre-conditions
        if (taskSpec.execution.validation?.preConditions) {
          this.checkConditions(taskSpec.execution.validation.preConditions, state);
        }
        
        // 4. Check conditional execution
        if (taskSpec.execution.condition && !this.evaluateCondition(taskSpec.execution.condition, state)) {
          console.log(`Skipping task due to condition: ${taskSpec.execution.condition}`);
          return {};
        }
        
        // 5. Execute capability with retry logic
        const result = await this.executeWithRetry(async () => {
          return await this.executeCapability(taskSpec, inputs);
        }, taskSpec.execution.errorHandling.retryPolicy);
        
        // 6. Validate outputs
        this.validateOutputs(result, taskSpec.execution.outputSchema);
        
        // 7. Check post-conditions
        if (taskSpec.execution.validation?.postConditions) {
          this.checkConditions(taskSpec.execution.validation.postConditions, {...state, ...result});
        }
        
        // 8. Map outputs back to state
        return this.mapOutputs(result, taskSpec.execution.outputMapping);
        
      } catch (error) {
        console.error(`Task ${taskSpec.id} failed:`, error);
        
        // Try fallback capability if available
        if (taskSpec.execution.errorHandling.fallbackCapability) {
          try {
            const inputs = this.extractInputs(state, taskSpec.execution.inputMapping);
            const fallbackResult = await this.executeConnectHubCapability(
              taskSpec.execution.errorHandling.fallbackCapability, 
              inputs, 
              { capabilityId: taskSpec.execution.errorHandling.fallbackCapability, parameters: {} }
            );
            return this.mapOutputs(fallbackResult, taskSpec.execution.outputMapping);
          } catch (fallbackError) {
            console.error('Fallback also failed:', fallbackError);
          }
        }
        
        throw error;
      }
    };
  }

  private async executeCapability(taskSpec: EnhancedTaskNodeSpec, inputs: any): Promise<any> {
    // First, execute the LLM reasoning (every node has this)
    const llmResult = await this.executeLLMTask(inputs, taskSpec.execution.prompting);
    
    // If the node has capabilities, execute them with the LLM result
    if (taskSpec.capability.length > 0 && taskSpec.execution.capabilityConfig) {
      const primaryCapability = taskSpec.capability[0];
      const config = taskSpec.execution.capabilityConfig[primaryCapability];
      
      // Pass LLM result as input to the capability
      const capabilityInput = { ...inputs, llmResult };
      const capabilityResult = await this.executeConnectHubCapability(primaryCapability, capabilityInput, config);
      
      // Combine LLM and capability results
      return { ...llmResult, ...capabilityResult };
    }
    
    // LLM-only node (including HIL subgraphs - they're just regular subgraphs)
    return llmResult;
  }

  // Utility methods
  protected async executeConnectHubCapability(capabilityId: string, inputs: any, config: CapabilityConfig): Promise<any> {
    const response = await fetch(`${this.connectHubUrl}/proxy/${capabilityId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CONNECT_HUB_JWT}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        org_id: config.authConfig?.orgId || process.env.DEFAULT_ORG_ID,
        params: inputs,
        correlation_id: generateUuid()
      })
    });
    
    if (!response.ok) {
      throw new Error(`ConnectHub call failed: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    if (result.error) {
      throw new Error(result.error);
    }
    
    return result.data;
  }

  protected async executeLLMTask(inputs: any, prompting: any): Promise<any> {
    
    if (!prompting?.systemPrompt) {
      throw new Error('No system prompt provided for LLM task');
    }

    // For tasks that need capabilities, inject them via fundamental infrastructure
    let enhancedInputs = inputs;
    if (prompting.systemPrompt.includes('available capabilities') || prompting.systemPrompt.includes('capabilities')) {
      const capabilities = await this.getAvailableCapabilities();
      enhancedInputs = { ...inputs, availableCapabilities: capabilities };
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error('No OPENAI_API_KEY found in environment');
      throw new Error('OPENAI_API_KEY is required for LLM operations');
    }

    try {
      const llmProvider = new OpenAIProvider(process.env.OPENAI_API_KEY);
      const response = await llmProvider.createCompletion({
        responseFormat: { type: 'json_object' },
        messages: [
          { role: 'system', content: prompting.systemPrompt },
          { role: 'user', content: JSON.stringify(enhancedInputs) }
        ]
      });

      // Try to parse as JSON, fallback to text
      try {
        const parsed = JSON.parse(response.content);
        // Ensure capabilities are included in response for gap identification
        if (enhancedInputs.availableCapabilities) {
          parsed.availableCapabilities = enhancedInputs.availableCapabilities;
        }
        return parsed;
      } catch {
        return { 
          result: response.content,
          availableCapabilities: enhancedInputs.availableCapabilities || []
        };
      }
    } catch (error) {
      console.error('LLM task failed:', error);
      throw new Error(`LLM task failed: ${error.message}`);
    }
  }

  private extractInputs(state: any, inputMapping: Record<string, string | FieldMapping>): any {
    const inputs: any = {};
    
    for (const [key, mapping] of Object.entries(inputMapping)) {
      if (typeof mapping === 'string') {
        // Simple jspath expression
        const results = jspath.apply(mapping, state);
        inputs[key] = results.length > 0 ? results[0] : undefined;
      } else {
        // FieldMapping with jspath expression and optional default
        const results = jspath.apply(mapping.source, state);
        let value = results.length > 0 ? results[0] : undefined;
        
        if (value === undefined && mapping.default !== undefined) {
          value = mapping.default;
        }
        inputs[key] = value;
      }
    }
    
    return inputs;
  }

  private mapOutputs(result: any, outputMapping: Record<string, string | FieldMapping>): any {
    const stateUpdates: any = {};
    
    for (const [stateKey, mapping] of Object.entries(outputMapping)) {
      if (typeof mapping === 'string') {
        // Simple jspath expression
        const results = jspath.apply(mapping, result);
        stateUpdates[stateKey] = results.length > 0 ? results[0] : undefined;
      } else {
        // FieldMapping with jspath expression
        const results = jspath.apply(mapping.source, result);
        const value = results.length > 0 ? results[0] : undefined;
        stateUpdates[stateKey] = value;
      }
    }
    
    return stateUpdates;
  }

  private validateInputs(inputs: any, schema: any): void {
    if (schema.required) {
      for (const field of schema.required) {
        if (inputs[field] === undefined) {
          throw new Error(`Required field missing: ${field}`);
        }
      }
    }
  }

  private validateOutputs(outputs: any, schema: any): void {
    // Simplified validation
    console.log('Validating outputs against schema');
  }

  private evaluateCondition(condition: string, state: any): boolean {
    try {
      // jspath can handle boolean expressions directly!
      const results = jspath.apply(condition, state);
      
      // jspath returns an array, for boolean expressions it should return [true] or [false]
      if (results.length === 0) return false;
      
      const result = results[0];
      return typeof result === 'boolean' ? result : !!result;
    } catch (error) {
      console.error('Condition evaluation failed:', error);
      return false;
    }
  }

  private checkConditions(conditions: string[], state: any): void {
    for (const condition of conditions) {
      if (!this.evaluateCondition(condition, state)) {
        throw new Error(`Condition failed: ${condition}`);
      }
    }
  }

  private async executeWithRetry<T>(fn: () => Promise<T>, retryPolicy: RetryPolicy): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= retryPolicy.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === retryPolicy.maxRetries) {
          break;
        }
        
        // Check if error is retryable
        if (retryPolicy.retryableErrors && retryPolicy.retryableErrors.length > 0) {
          const isRetryable = retryPolicy.retryableErrors.some(code => 
            lastError.message.includes(code)
          );
          if (!isRetryable) {
            break;
          }
        }
        
        // Calculate delay
        let delay = retryPolicy.baseDelay;
        if (retryPolicy.backoffStrategy === 'exponential') {
          delay = Math.min(retryPolicy.baseDelay * Math.pow(2, attempt), retryPolicy.maxDelay);
        } else if (retryPolicy.backoffStrategy === 'linear') {
          delay = Math.min(retryPolicy.baseDelay * (attempt + 1), retryPolicy.maxDelay);
        }
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }

  private createInterruptNodeFunction(nodeSpec: InterruptNodeSpec) {
    return async (state: any): Promise<any> => {
      console.log(`⏸️  Interrupt node reached: ${nodeSpec.description}`);

      // Collect inputs as defined by the DSL mapping so they can be referenced
      // by downstream consumers (e.g. UI renderer).
      const inputs = this.extractInputs(state, nodeSpec.inputMapping || {});

      // Clone base prompt definition so we can augment dynamically
      const promptDef = JSON.parse(JSON.stringify(nodeSpec.prompt));

      // If this interrupt is the human-interaction node and we have gap info, transform it into granular questions
      if (
        nodeSpec.id === "human-interaction" &&
        Array.isArray(inputs.gaps) &&
        promptDef.kind === "questions"
      ) {
        const generatedQuestions = (inputs.gaps as Gap[]).map((gap, idx) => ({
          id: `gap_${idx}`,
          text: `${gap.description} (priority: ${gap.priority}) – suggested actions?`,
        }));

        promptDef.questions = generatedQuestions;

        // Prepend a summary message so the user knows what's going on
        promptDef.messages = [
          { role: "system", content: `I have identified ${generatedQuestions.length} gaps that need clarification before continuing.` },
          ...(promptDef.messages || []),
        ];
      }

      const hilPrompt: HILPrompt = {
        id: generateUuid(),
        executionId: state.executionId,
        promptId: nodeSpec.id,
        kind: promptDef.kind,
        messages: promptDef.messages,
        inputSchema: promptDef.inputSchema,
        options: promptDef.options,
        questions: promptDef.questions,
      };

      // Emit the prompt over the HIL event bus so any listeners (console, UI, etc.) can react.
      if (this.hilEventBus) {
        await this.hilEventBus.publish("hil_prompt", hilPrompt as any);
      }

      // Merge prompt onto state so the outside world can pick it up from the
      // checkpoint. Then trigger LangGraph's interrupt() helper.
      return interrupt({
        currentPrompt: hilPrompt,
        ...inputs,
      });
    };
  }
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Simple validation function for testing
function validateEmployeeGraphSpec(spec: EmployeeGraphSpec): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!spec.graphId) {
    errors.push("Missing graphId");
  }
  
  if (!spec.nodes || spec.nodes.length === 0) {
    errors.push("No workflow nodes defined");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// Simple HIL validation function
function validateHILSubgraph(hilSubgraph: WorkflowNodeSpec): ValidationResult {
  return {
    isValid: true,
    errors: [],
    warnings: []
  };
}

// Simple ensure function
function ensureValidEmployeeGraphSpec(spec: EmployeeGraphSpec): EmployeeGraphSpec {
  return spec;
}

// Simple HIL subgraph creator
function createStandardHILSubgraph(hilCapabilities: string[] = ["console.prompt"]): WorkflowNodeSpec {
  return {
    id: "hil_subgraph",
    metadata: { type: "hil" },
    nodes: [],
    edges: []
  };
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error("Usage: npm run graph-creator \"<job description>\"");
    process.exit(1);
  }

  // Validate required environment variables
  if (!process.env.OPENAI_API_KEY) {
    console.error("❌ OPENAI_API_KEY environment variable is required");
    process.exit(1);
  }

  if (!process.env.CONNECT_HUB_URL) {
    console.error("❌ CONNECT_HUB_URL environment variable is required");
    process.exit(1);
  }

  const jobDescription = args.join(" ");
  const connectHubUrl = process.env.CONNECT_HUB_URL;
  const orgId = process.env.DEFAULT_ORG_ID || "default-org";
  const executionId = generateUuid();
  
  console.log("🎯 Clancy Graph Creator - DSL-Based Execution");
  console.log("=============================================");
  console.log(`📋 Job Description: ${jobDescription}`);
  console.log(`🏢 Organization: ${orgId}`);
  console.log(`🔗 ConnectHub URL: ${connectHubUrl}`);
  console.log(`🔄 Execution ID: ${executionId}`);
  console.log("");
  
  // -------------------------------
  // HIL EVENT BUS INITIALISATION
  // -------------------------------
  const hilEventBus = createEventBus<any>();

  // Console-based prompt handler
  let pendingResponse: any = null;

  await hilEventBus.subscribe("hil_prompt", async (prompt: HILPrompt) => {
    console.log("\n================ HUMAN INPUT REQUIRED ================");
    console.log("Prompt", JSON.stringify(prompt.inputSchema, null, 2));
    prompt.messages.forEach((m) => console.log(`${m.role.toUpperCase()}: ${m.content}`));
    if (prompt.questions) {
      prompt.questions.forEach((q) => {
        console.log(`• ${q.text}`);
      });
    }

    // Read arbitrary JSON from user
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise<string>((resolve) => {
      rl.question("Please answer (JSON accepted): ", (ans) => {
        rl.close();
        resolve(ans.trim());
      });
    });

    let parsed: any;
    try {
      parsed = JSON.parse(answer);
    } catch {
      parsed = { raw: answer };
    }

    // Emit response event
    await hilEventBus.publish("hil_response", {
      executionId: prompt.executionId,
      promptId: prompt.promptId,
      userResponses: parsed,
    });
  });

  // Capture response for resumption
  await hilEventBus.subscribe("hil_response", async (resp) => {
    pendingResponse = resp;
  });

  try {
    // Create WorkflowExecutor instance
    const workflowExecutor = new WorkflowExecutor(connectHubUrl, hilEventBus);
    
    // Create the workflow from DSL
    console.log("🔧 Creating workflow from DSL...");
    const workflow = workflowExecutor.createWorkflowFromDSL(GRAPH_CREATOR_AGENT_SPEC);
    
    // Compile the workflow
    const memory = new MemorySaver();
    const app = workflow.compile({ checkpointer: memory });
    
    console.log("✅ DSL workflow compiled successfully");
    console.log("");
    
    // Initialize state
    let currentState: any = {
      jobDescription,
      orgId,
      executionId,
      timestamp: new Date().toISOString(),
      iterationCount: 0,
      isComplete: false,
      logs: [],
    };

    console.log("🚀 Starting DSL-based graph execution...");
    console.log("");

    const config = {
      configurable: { thread_id: executionId },
      recursionLimit: 50,
    };

    let completed = false;
    while (!completed) {
      try {
        currentState = await app.invoke(currentState, config);
        completed = true;
      } catch (err: any) {
        // Detect interrupt from LangGraph – heuristic check
        const isInterrupt =
          (typeof err?.message === "string" && err.message.includes("INTERRUPT")) ||
          err?.name === "LangGraphInterrupt" ||
          err?.constructor?.name === "LangGraphInterrupt";

        if (!isInterrupt) {
          throw err;
        }

        console.log("⏸️  Workflow interrupted – awaiting human input…");

        // Merge any partial state returned from the interrupt payload (if available)
        if (err?.value && typeof err.value === "object") {
          currentState = { ...currentState, ...err.value };
        }

        // Wait for user response via event bus
        while (!pendingResponse) {
          await new Promise((r) => setTimeout(r, 200));
        }

        // Merge user responses into state and clear prompt
        currentState = {
          ...currentState,
          userResponses: pendingResponse.userResponses,
          iterationCount: (currentState.iterationCount || 0) + 1,
          currentPrompt: undefined,
        };

        pendingResponse = null; // Reset for next loop
      }
    }

    console.log("\n🎉 DSL workflow execution completed!");

    if (currentState?.finalGraph) {
      console.log("📋 Generated Employee Graph:");
      console.log(JSON.stringify(currentState.finalGraph, null, 2));

      // Validate the generated graph
      console.log("\n🔍 Validating generated graph...");
      const validation = validateEmployeeGraphSpec(currentState.finalGraph);

      if (validation.isValid) {
        console.log("✅ Generated graph is valid!");
      } else {
        console.log("⚠️  Generated graph has validation issues:");
        validation.errors.forEach((error) => console.log(`   ❌ ${error}`));
      }

      if (validation.warnings.length > 0) {
        console.log("⚠️  Warnings:");
        validation.warnings.forEach((warning) => console.log(`   ⚠️  ${warning}`));
      }

      return true;
    } else {
      console.log("⚠️  No final graph was generated");
      console.log("Final state:", JSON.stringify(currentState, null, 2));
      return false;
    }
    
  } catch (error) {
    console.error("\n❌ DSL workflow execution failed:");
    console.error(`   Error: ${error.message}`);
    
    if (error.message.includes('OPENAI_API_KEY')) {
      console.error("   💡 Make sure OPENAI_API_KEY is set in your environment");
    }
    if (error.message.includes('capabilities')) {
      console.error("   💡 Make sure ConnectHub is running and accessible");
    }
    
    console.error("\n🔍 Stack trace:");
    console.error(error.stack);
    
    return false;
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}



export { 
  WorkflowExecutor,
  type GraphCreationState, 
  type HILPrompt, 
  type Gap,
  type EnhancedTaskNodeSpec,
  type InterruptNodeSpec,
  type TaskExecution,
  type EmployeeGraphSpec,
  type ValidationResult,
  PROMPTS,
  GRAPH_CREATOR_AGENT_SPEC,
  validateEmployeeGraphSpec,
  validateHILSubgraph,
  ensureValidEmployeeGraphSpec,
  createStandardHILSubgraph,
}; 
