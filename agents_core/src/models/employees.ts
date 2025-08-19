import { Static, Type } from "@sinclair/typebox";
import { AgentSchema } from "./agents.js";
import { ErrorSchema, Ref, StringEnum } from "./shared.js";

export enum EmployeeStatus {
  Active = "active",
  Inactive = "inactive",
}

export const EmployeeStatusSchema = StringEnum(
  [EmployeeStatus.Active, EmployeeStatus.Inactive],
  { $id: "EmployeeStatus" },
);

export const EmployeeSchema = Type.Object(
  {
    id: Type.ReadonlyOptional(Type.String()),
    orgId: Type.String(),
    userId: Type.String(),
    name: Type.String(),
    // summary: Type.String(),
    status: Ref(EmployeeStatusSchema),
    agents: Type.Array(Ref(AgentSchema)),
  },
  {
    $id: "Employee",
  },
);

export const CreateEmployeeEndpoint = {
  tags: ["Employees"],
  summary: "Create an employee",
  description: "Create an employee",
  security: [{ bearerAuth: [] }],
  body: Ref(EmployeeSchema),
  response: {
    200: Ref(EmployeeSchema),
    400: ErrorSchema,
    401: ErrorSchema,
  },
};

export const GetEmployeesEndpoint = {
  tags: ["Employees"],
  summary: "Get an employee",
  description: "Get an employee",
  security: [{ bearerAuth: [] }],
  response: {
    200: Type.Array(Ref(EmployeeSchema)),
  },
};

export const GetEmployeeEndpoint = {
  tags: ["Employees"],
  summary: "Get an employee",
  description: "Get an employee",
  security: [{ bearerAuth: [] }],
  params: Type.Object({
    id: Type.String(),
  }),
  response: {
    200: Ref(EmployeeSchema),
  },
};

export type Employee = Static<typeof EmployeeSchema>;