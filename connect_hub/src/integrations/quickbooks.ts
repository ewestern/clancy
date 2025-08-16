import {
  ProviderRuntime,
  Capability,
  ExecutionContext,
  CapabilityMeta,
  CapabilityFactory,
  CapabilityRisk,
  OAuthAuthUrlParams,
  OAuthCallbackParams,
  OAuthContext,
  CallbackResult,
  Trigger,
} from "../providers/types.js";
import { BaseProvider } from "../providers/base.js";
import { ProviderKind, ProviderAuth } from "../models/providers.js";
import { OwnershipScope } from "../models/shared.js";
import { Type, Static } from "@sinclair/typebox";
import OAuthClient from "intuit-oauth";
const __dirname = import.meta.dirname;

// ---------------------------------------------------------------------------
// QuickBooks API helper using Intuit SDK
// ---------------------------------------------------------------------------
function createOAuthClient(ctx: OAuthContext): OAuthClient {
  return new OAuthClient({
    clientId: ctx.providerSecrets.clientId as string,
    clientSecret: ctx.providerSecrets.clientSecret as string,
    environment:
      process.env.NODE_ENV === "production" ? "production" : "sandbox",
    redirectUri: ctx.redirectUri,
  });
}

async function qbFetch<T>(
  path: string,
  method: "GET" | "POST",
  params: unknown,
  ctx: ExecutionContext,
): Promise<T> {
  if (!ctx.tokenPayload) throw new Error("QuickBooks token payload missing");
  if (!ctx.externalAccountId)
    throw new Error("QuickBooks company (realm) id missing");

  const tokenPayload = ctx.tokenPayload;

  const oauthClient = new OAuthClient({
    clientId: process.env.QUICKBOOKS_CLIENT_ID!,
    clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET!,
    environment:
      process.env.NODE_ENV === "production" ? "production" : "sandbox",
    redirectUri: "", // Not needed for API calls
  });

  // Set the token
  oauthClient.setToken(tokenPayload as any);

  const url = `https://quickbooks.api.intuit.com/v3/company/${ctx.externalAccountId}${path}`;

  try {
    const response = await oauthClient.makeApiCall({
      url,
      method,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: method === "POST" ? JSON.stringify(params ?? {}) : undefined,
    });
    const responseContent = response.getJson();

    return responseContent as T;
  } catch (error: any) {
    // Handle rate limiting
    if (error.originalMessage?.includes("429")) {
      throw new Error(`QuickBooks rate limited; retry after 60s`);
    }
    throw new Error(
      `QuickBooks API error: ${error.originalMessage || error.message}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Capability Schemas
// ---------------------------------------------------------------------------

// invoice.create - Enhanced schema
const invoiceCreateParamsSchema = Type.Object({
  customerRef: Type.String({ description: "Customer ID or reference" }),
  lineItems: Type.Array(
    Type.Object({
      amount: Type.Number({ minimum: 0 }),
      description: Type.String(),
      itemRef: Type.Optional(Type.String()),
      quantity: Type.Optional(Type.Number({ minimum: 0, default: 1 })),
    }),
  ),
  dueDate: Type.Optional(Type.String({ format: "date" })),
  emailDelivery: Type.Optional(Type.Boolean({ default: true })),
});

const invoiceCreateResultSchema = Type.Object({
  Invoice: Type.Object({
    Id: Type.String(),
    DocNumber: Type.String(),
    TotalAmt: Type.Number(),
    Balance: Type.Number(),
  }),
});

// customer.upsert - Enhanced schema
const customerUpsertParamsSchema = Type.Object(
  {
    displayName: Type.String(),
    email: Type.Optional(Type.String({ format: "email" })),
    phone: Type.Optional(Type.String()),
    companyName: Type.Optional(Type.String()),
    billingAddress: Type.Optional(
      Type.Object({
        line1: Type.String(),
        city: Type.String(),
        state: Type.String(),
        postalCode: Type.String(),
        country: Type.Optional(Type.String({ default: "US" })),
      }),
    ),
  },
  {
    examples: [
      {
        displayName: "Acme Corporation",
        email: "billing@acme.com",
        phone: "555-0123",
        companyName: "Acme Corporation",
        billingAddress: {
          line1: "123 Main St",
          city: "Anytown",
          state: "CA",
          postalCode: "90210",
          country: "US",
        },
      },
      {
        displayName: "John Smith",
        email: "john@example.com",
        phone: "555-0456",
      },
    ],
  },
);

const customerUpsertResultSchema = Type.Object({
  Customer: Type.Object({
    Id: Type.String(),
    DisplayName: Type.String(),
    Active: Type.Boolean(),
  }),
});

// payment.record - New capability
const paymentRecordParamsSchema = Type.Object({
  customerRef: Type.String(),
  totalAmt: Type.Number({ minimum: 0 }),
  paymentMethodRef: Type.Optional(Type.String()),
  depositToAccountRef: Type.Optional(Type.String()),
  linkedTxns: Type.Optional(
    Type.Array(
      Type.Object({
        txnId: Type.String(),
        txnType: Type.String(),
      }),
    ),
  ),
});

const paymentRecordResultSchema = Type.Object({
  Payment: Type.Object({
    Id: Type.String(),
    TotalAmt: Type.Number(),
  }),
});

// expense.list
const expenseListParamsSchema = Type.Object({
  startDate: Type.String({ format: "date" }),
  endDate: Type.String({ format: "date" }),
  maxResults: Type.Optional(
    Type.Number({ minimum: 1, maximum: 1000, default: 100 }),
  ),
});

const expenseListResultSchema = Type.Object({
  QueryResponse: Type.Object({
    Purchase: Type.Optional(
      Type.Array(
        Type.Object({
          Id: Type.String(),
          TotalAmt: Type.Number(),
          TxnDate: Type.String(),
          AccountRef: Type.Object({
            value: Type.String(),
            name: Type.String(),
          }),
        }),
      ),
    ),
  }),
});

// reports.profitloss - New capability for business insights
const reportPLParamsSchema = Type.Object({
  startDate: Type.String({ format: "date" }),
  endDate: Type.String({ format: "date" }),
  summarizeColumnBy: Type.Optional(
    Type.Union(
      [
        Type.Literal("Month"),
        Type.Literal("Quarter"),
        Type.Literal("Year"),
        Type.Literal("Total"),
      ],
      { default: "Total" },
    ),
  ),
});

const reportPLResultSchema = Type.Object({
  QueryResponse: Type.Any(), // P&L reports have complex nested structure
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

async function qbInvoiceCreate(
  params: InvoiceCreateParams,
  ctx: ExecutionContext,
): Promise<InvoiceCreateResult> {
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
          name: "Services",
        },
        Qty: item.quantity || 1,
      },
    })),
    CustomerRef: {
      value: params.customerRef,
    },
    ...(params.dueDate && { DueDate: params.dueDate }),
    EmailStatus: params.emailDelivery ? "EmailSent" : "NotSet",
  };

  return qbFetch<InvoiceCreateResult>("/invoices", "POST", invoiceData, ctx);
}

async function qbCustomerUpsert(
  params: CustomerUpsertParams,
  ctx: ExecutionContext,
): Promise<CustomerUpsertResult> {
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
            Address: params.email,
          },
        }),
      };
      return qbFetch<CustomerUpsertResult>(
        "/customers",
        "POST",
        updateData,
        ctx,
      );
    } else {
      // Create new customer
      const customerData = {
        DisplayName: params.displayName,
        ...(params.email && {
          PrimaryEmailAddr: {
            Address: params.email,
          },
        }),
      };
      return qbFetch<CustomerUpsertResult>(
        "/customers",
        "POST",
        customerData,
        ctx,
      );
    }
  } catch {
    // If search fails, try to create new customer
    const customerData = {
      DisplayName: params.displayName,
      ...(params.email && {
        PrimaryEmailAddr: {
          Address: params.email,
        },
      }),
    };
    return qbFetch<CustomerUpsertResult>(
      "/customers",
      "POST",
      customerData,
      ctx,
    );
  }
}

async function qbExpenseList(
  params: ExpenseListParams,
  ctx: ExecutionContext,
): Promise<ExpenseListResult> {
  const query = `SELECT * FROM Purchase WHERE TxnDate >= '${params.startDate}' AND TxnDate <= '${params.endDate}' MAXRESULTS ${params.maxResults || 100}`;
  const path = `/query?query=${encodeURIComponent(query)}&minorversion=65`;
  return qbFetch<ExpenseListResult>(path, "GET", undefined, ctx);
}

async function qbPaymentRecord(
  params: PaymentRecordParams,
  ctx: ExecutionContext,
): Promise<PaymentRecordResult> {
  const paymentData = {
    CustomerRef: {
      value: params.customerRef,
    },
    TotalAmt: params.totalAmt,
    ...(params.paymentMethodRef && {
      PaymentMethodRef: {
        value: params.paymentMethodRef,
      },
    }),
    ...(params.depositToAccountRef && {
      DepositToAccountRef: {
        value: params.depositToAccountRef,
      },
    }),
    ...(params.linkedTxns && {
      Line: params.linkedTxns.map((txn) => ({
        Amount: params.totalAmt,
        LinkedTxn: [
          {
            TxnId: txn.txnId,
            TxnType: txn.txnType,
          },
        ],
      })),
    }),
  };

  return qbFetch<PaymentRecordResult>("/payments", "POST", paymentData, ctx);
}

async function qbReportPL(
  params: ReportPLParams,
  ctx: ExecutionContext,
): Promise<ReportPLResult> {
  const reportPath = `/reports/ProfitAndLoss?start_date=${params.startDate}&end_date=${params.endDate}&summarize_column_by=${params.summarizeColumnBy || "Total"}&minorversion=65`;
  return qbFetch<ReportPLResult>(reportPath, "GET", undefined, ctx);
}

// Capability factory functions
function createInvoiceCreateCapability(): Capability<
  InvoiceCreateParams,
  InvoiceCreateResult
> {
  const meta: CapabilityMeta = {
    id: "invoice.create",
    displayName: "Create Invoice",
    description: "Create and email an invoice to a customer",
    docsUrl:
      "https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/invoice#create-an-invoice",
    paramsSchema: invoiceCreateParamsSchema,
    resultSchema: invoiceCreateResultSchema,
    requiredScopes: ["com.intuit.quickbooks.accounting"],
    ownershipScope: OwnershipScope.Organization,
    risk: CapabilityRisk.HIGH,
  };

  return { meta, execute: qbInvoiceCreate };
}

function createCustomerUpsertCapability(): Capability<
  CustomerUpsertParams,
  CustomerUpsertResult
> {
  const meta: CapabilityMeta = {
    id: "customer.upsert",
    displayName: "Upsert Customer",
    description: "Create or update a customer record",
    docsUrl:
      "https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/customer#create-a-customer",
    paramsSchema: customerUpsertParamsSchema,
    resultSchema: customerUpsertResultSchema,
    requiredScopes: ["com.intuit.quickbooks.accounting"],
    ownershipScope: OwnershipScope.Organization,
    risk: CapabilityRisk.MEDIUM,
  };

  return { meta, execute: qbCustomerUpsert };
}

function createExpenseListCapability(): Capability<
  ExpenseListParams,
  ExpenseListResult
> {
  const meta: CapabilityMeta = {
    id: "expense.list",
    displayName: "List Expenses",
    description: "Fetch expenses in a date range",
    docsUrl:
      "https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/purchase#query-a-purchase",
    paramsSchema: expenseListParamsSchema,
    resultSchema: expenseListResultSchema,
    requiredScopes: ["com.intuit.quickbooks.accounting"],
    ownershipScope: OwnershipScope.Organization,
    risk: CapabilityRisk.LOW,
  };

  return { meta, execute: qbExpenseList };
}

function createPaymentRecordCapability(): Capability<
  PaymentRecordParams,
  PaymentRecordResult
> {
  const meta: CapabilityMeta = {
    id: "payment.record",
    displayName: "Record Payment",
    description: "Record a payment received against an invoice",
    docsUrl:
      "https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/payment#create-a-payment",
    paramsSchema: paymentRecordParamsSchema,
    resultSchema: paymentRecordResultSchema,
    requiredScopes: ["com.intuit.quickbooks.accounting"],
    ownershipScope: OwnershipScope.Organization,
    risk: CapabilityRisk.HIGH,
  };

  return { meta, execute: qbPaymentRecord };
}

function createReportPLCapability(): Capability<
  ReportPLParams,
  ReportPLResult
> {
  const meta: CapabilityMeta = {
    id: "reports.profitloss",
    displayName: "Generate Profit & Loss Report",
    description: "Generate profit and loss report for specified date range",
    docsUrl:
      "https://developer.intuit.com/app/developer/qbo/docs/api/accounting/reports",
    paramsSchema: reportPLParamsSchema,
    resultSchema: reportPLResultSchema,
    requiredScopes: ["com.intuit.quickbooks.accounting"],
    ownershipScope: OwnershipScope.Organization,
    risk: CapabilityRisk.LOW,
  };

  return { meta, execute: qbReportPL };
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export class QuickBooksProvider extends BaseProvider {
  constructor() {
    super({
      metadata: {
        id: "quickbooks",
        displayName: "QuickBooks Online",
        description: "Accounting platform for small businesses",
        icon: "https://developer.intuit.com/app/developer/qbo/docs/develop/icon.png",
        docsUrl:
          "https://developer.intuit.com/app/developer/qbo/docs/api/accounting",
        kind: ProviderKind.External,
        auth: ProviderAuth.OAuth2,
      },
      capabilityFactories: {
        "invoice.create": createInvoiceCreateCapability,
        "customer.upsert": createCustomerUpsertCapability,
        "expense.list": createExpenseListCapability,
        "payment.record": createPaymentRecordCapability,
        "reports.profitloss": createReportPLCapability,
      },
      links: [
        "https://developer.intuit.com/appdetail/overview?appId=djQuMTo6OGQzYmJlYTI3Yg:f0608889-15b2-441b-93c8-8e9c3c644242&id=9341454993684865",
      ],
    });
  }

  // ---------------------------------------------------------------------------
  // OAuth Implementation
  // ---------------------------------------------------------------------------

  generateAuthUrl(params: OAuthAuthUrlParams, ctx: OAuthContext): string {
    const oauthClient = createOAuthClient(ctx);

    // QuickBooks requires specific scopes format
    const scopeString = params.scopes.join(" ");

    return oauthClient.authorizeUri({
      scope: scopeString,
      state: params.state,
    });
  }

  async handleCallback(
    callbackParams: OAuthCallbackParams,
    ctx: OAuthContext,
  ): Promise<CallbackResult> {
    if (callbackParams.error) {
      throw new Error(
        `QuickBooks OAuth error: ${callbackParams.error_description || callbackParams.error}`,
      );
    }

    if (!callbackParams.code) {
      throw new Error("QuickBooks OAuth callback missing authorization code");
    }

    const oauthClient = createOAuthClient(ctx);

    try {
      const tokenData = await oauthClient.createToken(ctx.redirectUri);

      return {
        tokenPayload: tokenData.getJson(),
        // TODO: this is not correct, but it doesn't look like intuit includes scopes in the token
        scopes: ctx.requestedScopes!,
        externalAccountMetadata: {},
      };
    } catch (error: any) {
      throw new Error(
        `QuickBooks token exchange failed: ${error.originalMessage || error.message}`,
      );
    }
  }

  async refreshToken(
    tokenPayload: Record<string, unknown>,
    ctx: OAuthContext,
  ): Promise<Record<string, unknown>> {
    const oauthClient = createOAuthClient(ctx);

    // Set the current token with refresh token
    oauthClient.setToken(tokenPayload as any);

    try {
      const newTokenData = await oauthClient.refresh();
      return newTokenData.getJson();
    } catch (error: any) {
      throw new Error(
        `QuickBooks token refresh failed: ${error.originalMessage || error.message}`,
      );
    }
  }

  async isTokenValid(accessToken: string): Promise<boolean> {
    // Create a temporary client to check token validity
    const oauthClient = new (OAuthClient as any)({
      clientId: process.env.QUICKBOOKS_CLIENT_ID!,
      clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET!,
      environment:
        process.env.NODE_ENV === "production" ? "production" : "sandbox",
      redirectUri: "", // Not needed for token validation
    });

    oauthClient.setToken({
      access_token: accessToken,
    });

    try {
      // Use the SDK's built-in token validation
      return oauthClient.isAccessTokenValid();
    } catch (error) {
      // If the SDK method fails, assume token is invalid
      return false;
    }
  }

  /* not implementing handleEvent */
}
