import {
  ProviderRuntime,
  Capability,
  ExecutionContext,
  CapabilityMeta,
} from "../providers/types.js";
import { ProviderKind, ProviderAuth } from "../models/capabilities.js";
import { Type, Static } from "@sinclair/typebox";
import { loadPrompts } from "../providers/utils.js";
const __dirname = import.meta.dirname;

// ---------------------------------------------------------------------------
// QuickBooks API helper
// ---------------------------------------------------------------------------
async function qbFetch<T>(
  path: string,
  method: "GET" | "POST",
  params: unknown,
  ctx: ExecutionContext,
): Promise<T> {
  if (!ctx.accessToken) throw new Error("QuickBooks access token missing");
  const companyId = ctx.connectionId; // we overload connectionId to hold realmId
  if (!companyId) throw new Error("QuickBooks company (realm) id missing");

  const url = `https://quickbooks.api.intuit.com/v3/company/${companyId}${path}`;

  const res = await globalThis.fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${ctx.accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: method === "POST" ? JSON.stringify(params ?? {}) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`QuickBooks HTTP ${res.status}: ${text}`);
  }

  const data = (await res.json()) as T;
  return data;
}

// ---------------------------------------------------------------------------
// Capability Schemas
// ---------------------------------------------------------------------------

// invoice.create - Enhanced schema
const invoiceCreateParamsSchema = Type.Object({
  customerRef: Type.String({ description: "Customer ID or reference" }),
  lineItems: Type.Array(Type.Object({
    amount: Type.Number({ minimum: 0 }),
    description: Type.String(),
    itemRef: Type.Optional(Type.String()),
    quantity: Type.Optional(Type.Number({ minimum: 0, default: 1 }))
  })),
  dueDate: Type.Optional(Type.String({ format: "date" })),
  emailDelivery: Type.Optional(Type.Boolean({ default: true }))
});

const invoiceCreateResultSchema = Type.Object({
  Invoice: Type.Object({
    Id: Type.String(),
    DocNumber: Type.String(),
    TotalAmt: Type.Number(),
    Balance: Type.Number()
  })
});

// customer.upsert - Enhanced schema
const customerUpsertParamsSchema = Type.Object({
  displayName: Type.String(),
  email: Type.Optional(Type.String({ format: "email" })),
  phone: Type.Optional(Type.String()),
  companyName: Type.Optional(Type.String()),
  billingAddress: Type.Optional(Type.Object({
    line1: Type.String(),
    city: Type.String(),
    state: Type.String(),
    postalCode: Type.String(),
    country: Type.Optional(Type.String({ default: "US" }))
  }))
});

const customerUpsertResultSchema = Type.Object({
  Customer: Type.Object({
    Id: Type.String(),
    DisplayName: Type.String(),
    Active: Type.Boolean()
  })
});

// payment.record - New capability
const paymentRecordParamsSchema = Type.Object({
  customerRef: Type.String(),
  totalAmt: Type.Number({ minimum: 0 }),
  paymentMethodRef: Type.Optional(Type.String()),
  depositToAccountRef: Type.Optional(Type.String()),
  linkedTxns: Type.Optional(Type.Array(Type.Object({
    txnId: Type.String(),
    txnType: Type.String()
  })))
});

const paymentRecordResultSchema = Type.Object({
  Payment: Type.Object({
    Id: Type.String(),
    TotalAmt: Type.Number()
  })
});

// expense.list
const expenseListParamsSchema = Type.Object({
  startDate: Type.String({ format: "date" }),
  endDate: Type.String({ format: "date" }),
  maxResults: Type.Optional(Type.Number({ minimum: 1, maximum: 1000, default: 100 }))
});

const expenseListResultSchema = Type.Object({
  QueryResponse: Type.Object({
    Purchase: Type.Optional(Type.Array(Type.Object({
      Id: Type.String(),
      TotalAmt: Type.Number(),
      TxnDate: Type.String(),
      AccountRef: Type.Object({
        value: Type.String(),
        name: Type.String()
      })
    })))
  })
});

// reports.profitloss - New capability for business insights
const reportPLParamsSchema = Type.Object({
  startDate: Type.String({ format: "date" }),
  endDate: Type.String({ format: "date" }),
  summarizeColumnBy: Type.Optional(Type.Union([
    Type.Literal("Month"),
    Type.Literal("Quarter"), 
    Type.Literal("Year"),
    Type.Literal("Total")
  ], { default: "Total" }))
});

const reportPLResultSchema = Type.Object({
  QueryResponse: Type.Any() // P&L reports have complex nested structure
});

// ---------------------------------------------------------------------------
// Type definitions derived from schemas
// ---------------------------------------------------------------------------

type InvoiceCreateParams = Static<typeof invoiceCreateParamsSchema>;
type InvoiceCreateResult = Static<typeof invoiceCreateResultSchema>;
type CustomerUpsertParams = Static<typeof customerUpsertParamsSchema>;
type CustomerUpsertResult = Static<typeof customerUpsertResultSchema>;
type PaymentRecordParams = Static<typeof paymentRecordParamsSchema>;
type PaymentRecordResult = Static<typeof paymentRecordResultSchema>;
type ExpenseListParams = Static<typeof expenseListParamsSchema>;
type ExpenseListResult = Static<typeof expenseListResultSchema>;
type ReportPLParams = Static<typeof reportPLParamsSchema>;
type ReportPLResult = Static<typeof reportPLResultSchema>;

// ---------------------------------------------------------------------------
// Capability implementations
// ---------------------------------------------------------------------------

async function qbInvoiceCreate(params: InvoiceCreateParams, ctx: ExecutionContext): Promise<InvoiceCreateResult> {
  // Transform input params to QuickBooks Invoice object structure
  const invoiceData = {
    Line: params.lineItems.map((item, index: number) => ({
      Id: index + 1,
      Amount: item.amount,
      DetailType: "SalesItemLineDetail",
      Description: item.description,
      SalesItemLineDetail: {
        ItemRef: {
          value: item.itemRef || "1", // Default to first service item
          name: "Services"
        },
        Qty: item.quantity || 1
      }
    })),
    CustomerRef: {
      value: params.customerRef
    },
    ...(params.dueDate && { DueDate: params.dueDate }),
    EmailStatus: params.emailDelivery ? "EmailSent" : "NotSet"
  };
  
  return qbFetch<InvoiceCreateResult>("/invoices", "POST", invoiceData, ctx);
}

async function qbCustomerUpsert(params: CustomerUpsertParams, ctx: ExecutionContext): Promise<CustomerUpsertResult> {
  // First, try to find existing customer by name
  const searchQuery = `SELECT * FROM Customer WHERE DisplayName = '${params.displayName}'`;
  const searchPath = `/query?query=${encodeURIComponent(searchQuery)}`;
  
  try {
    const searchResult = await qbFetch<any>(searchPath, "GET", undefined, ctx);
    const existingCustomer = searchResult.QueryResponse?.Customer?.[0];
    
    if (existingCustomer) {
      // Update existing customer
      const updateData = {
        ...existingCustomer,
        DisplayName: params.displayName,
        ...(params.email && {
          PrimaryEmailAddr: {
            Address: params.email
          }
        })
      };
      return qbFetch<CustomerUpsertResult>("/customers", "POST", updateData, ctx);
    } else {
      // Create new customer
      const customerData = {
        DisplayName: params.displayName,
        ...(params.email && {
          PrimaryEmailAddr: {
            Address: params.email
          }
        })
      };
      return qbFetch<CustomerUpsertResult>("/customers", "POST", customerData, ctx);
    }
  } catch {
    // If search fails, try to create new customer
    const customerData = {
      DisplayName: params.displayName,
      ...(params.email && {
        PrimaryEmailAddr: {
          Address: params.email
        }
      })
    };
    return qbFetch<CustomerUpsertResult>("/customers", "POST", customerData, ctx);
  }
}

async function qbExpenseList(params: ExpenseListParams, ctx: ExecutionContext): Promise<ExpenseListResult> {
  const query = `SELECT * FROM Purchase WHERE TxnDate >= '${params.startDate}' AND TxnDate <= '${params.endDate}' MAXRESULTS ${params.maxResults || 100}`;
  const path = `/query?query=${encodeURIComponent(query)}&minorversion=65`;
  return qbFetch<ExpenseListResult>(path, "GET", undefined, ctx);
}

async function qbPaymentRecord(params: PaymentRecordParams, ctx: ExecutionContext): Promise<PaymentRecordResult> {
  const paymentData = {
    CustomerRef: {
      value: params.customerRef
    },
    TotalAmt: params.totalAmt,
    ...(params.paymentMethodRef && {
      PaymentMethodRef: {
        value: params.paymentMethodRef
      }
    }),
    ...(params.depositToAccountRef && {
      DepositToAccountRef: {
        value: params.depositToAccountRef
      }
    }),
    ...(params.linkedTxns && {
      Line: params.linkedTxns.map((txn) => ({
        Amount: params.totalAmt,
        LinkedTxn: [{
          TxnId: txn.txnId,
          TxnType: txn.txnType
        }]
      }))
    })
  };
  
  return qbFetch<PaymentRecordResult>("/payments", "POST", paymentData, ctx);
}

async function qbReportPL(params: ReportPLParams, ctx: ExecutionContext): Promise<ReportPLResult> {
  const reportPath = `/reports/ProfitAndLoss?start_date=${params.startDate}&end_date=${params.endDate}&summarize_column_by=${params.summarizeColumnBy || 'Total'}&minorversion=65`;
  return qbFetch<ReportPLResult>(reportPath, "GET", undefined, ctx);
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export class QuickBooksProvider implements ProviderRuntime {
  private cache = new Map<string, Capability>();

  public readonly metadata = {
    id: "quickbooks",
    displayName: "QuickBooks Online",
    description: "Accounting platform for small businesses",
    icon: "https://developer.intuit.com/app/developer/qbo/docs/develop/icon.png",
    docsUrl: "https://developer.intuit.com/app/developer/qbo/docs/api/accounting",
    kind: ProviderKind.External,
    auth: ProviderAuth.OAuth2,
  } as const;

  getCapability<P, R>(capId: string): Capability<P, R> {
    if (!this.cache.has(capId)) {
      switch (capId) {
        case "invoice.create": {
          const meta: CapabilityMeta = {
            id: capId,
            displayName: "Create Invoice",
            description: "Create and email an invoice to a customer",
            docsUrl: "https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/invoice#create-an-invoice",
            paramsSchema: invoiceCreateParamsSchema,
            resultSchema: invoiceCreateResultSchema,
            requiredScopes: ["com.intuit.quickbooks.accounting"],
            promptVersions: loadPrompts(__dirname, capId),
          };
          const impl: Capability = { meta, execute: qbInvoiceCreate };
          this.cache.set(capId, impl);
          break;
        }
        case "customer.upsert": {
          const meta: CapabilityMeta = {
            id: capId,
            displayName: "Upsert Customer",
            description: "Create or update a customer record",
            docsUrl: "https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/customer#create-a-customer",
            paramsSchema: customerUpsertParamsSchema,
            resultSchema: customerUpsertResultSchema,
            requiredScopes: ["com.intuit.quickbooks.accounting"],
            promptVersions: loadPrompts(__dirname, capId),
          };
          this.cache.set(capId, { meta, execute: qbCustomerUpsert });
          break;
        }
        case "expense.list": {
          const meta: CapabilityMeta = {
            id: capId,
            displayName: "List Expenses",
            description: "Fetch expenses in a date range",
            docsUrl: "https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/purchase#query-a-purchase",
            paramsSchema: expenseListParamsSchema,
            resultSchema: expenseListResultSchema,
            requiredScopes: ["com.intuit.quickbooks.accounting"],
            promptVersions: loadPrompts(__dirname, capId),
          };
          this.cache.set(capId, { meta, execute: qbExpenseList });
          break;
        }
        case "payment.record": {
          const meta: CapabilityMeta = {
            id: capId,
            displayName: "Record Payment",
            description: "Record a payment to a customer",
            docsUrl: "https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/payment#create-a-payment",
            paramsSchema: paymentRecordParamsSchema,
            resultSchema: paymentRecordResultSchema,
            requiredScopes: ["com.intuit.quickbooks.accounting"],
            promptVersions: loadPrompts(__dirname, capId),
          };
          this.cache.set(capId, { meta, execute: qbPaymentRecord });
          break;
        }
        case "reports.profitloss": {
          const meta: CapabilityMeta = {
            id: capId,
            displayName: "Profit and Loss Report",
            description: "Generate a profit and loss report",
            docsUrl: "https://developer.intuit.com/app/developer/qbo/docs/api/accounting/reports#profit-and-loss-report",
            paramsSchema: reportPLParamsSchema,
            resultSchema: reportPLResultSchema,
            requiredScopes: ["com.intuit.quickbooks.accounting"],
            promptVersions: loadPrompts(__dirname, capId),
          };
          this.cache.set(capId, { meta, execute: qbReportPL });
          break;
        }
        default:
          throw new Error(`QuickBooks capability ${capId} not implemented`);
      }
    }
    return this.cache.get(capId)! as Capability<P, R>;
  }

  listCapabilities() {
    // ensure meta cached
    ["invoice.create", "customer.upsert", "expense.list", "payment.record", "reports.profitloss"].forEach((k) =>
      this.getCapability(k),
    );
    return [...this.cache.values()].map((c) => c.meta);
  }

  /* not implementing handleEvent */
} 