import { MultiAgentGraphCreator } from "../src/graphCreator.js";
import { OpenAIProvider } from "../src/services/llm/OpenAIProvider.js";
import { stringify } from "yaml";
import { EmployeeGraphSpecSchema } from "../src/models/graph.js";
import { promptRegistry } from "../src/prompts/promptRegistry.js";
import dotenv from "dotenv";
dotenv.config();
const example = `
The Executive Assistant will create leverage and capacity and act as a true business partner for our President and COO. You will learn and understand the business at a level required to help team members prioritize conflicting needs with meeting schedules, travel, and delivery of projects. A successful EA will learn, understand, and anticipate the style and personal preferences of each executive they support and make proactive offers to enhance the executive’s experience and management load. Essentially the expectation is that the EA will act as a business partner to the executive team to improve the fluidity of their roles and the overall operations of the business.

Responsibilites:

    Manage Outlook calendars for President and COO.
    Proactively review calendars to ensure proper time for executive to travel between appointments, prepare for key meetings, breaks/moments to reflect, vacations, etc. and resolve conflicts in scheduling by discussing with executive(s) and potentially external parties. Ensure all key participants are invited and if unsure of necessary attendees gain clarification from the requestor.
    Ensures that proper logistics are tested and set-up (e.g., conference room booking, A/V tested, virtual meeting software set-up) for key meetings.
    Occasionally support others to resolve large meeting conflicts. Develops an understanding of who should be included based on the meeting objectives, asks for clarity when unsure.
    Manage expense reports for President and COO including gathering appropriate documentation and submitting through Concur.
    Providing feedback to those you support to improve processes and reduce waste around expense reports and approving expense reports submitted by Executives’ direct reports.
    Arrange travel (air, hotel, car, reservations, etc.), itineraries, agendas, logistics, and compilation or documents for travel-related meetings for executives as requested.
    Act as the administrative point of contact between the executives and internal/external clients, board members, and advisory board members. Act as a brand ambassador and represent Experience Senior Living with the highest level of professionalism.
    Perform general administrative duties and pitch in around the office for clean-up, restocking of refreshments and supplies, managing vendors, etc.
    May perform other duties as needed and /or assigned.
`;
//console.log(stringify(EmployeeGraphSpecSchema));
promptRegistry.getPrompt("agent-grouping");

const llmProvider = new OpenAIProvider(process.env.OPENAI_API_KEY || "");
const graphCreator = new MultiAgentGraphCreator(
  "http://localhost:3000",
  llmProvider,
);
//const tasks = await graphCreator.decomposeJobDescription(example, "v1.0.0");
//const integrations = await graphCreator.engineerIntegrations(tasks, "v1.0.0");
const assessments = await graphCreator.assessCapabilities(example, "v1.0.0");
//const agentGroups = await graphCreator.identifyAgentGroups(tasks, "v1.0.0");
console.log(JSON.stringify(assessments, null, 2));
