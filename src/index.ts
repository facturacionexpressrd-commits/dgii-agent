/**
 * DGII Agent - Main Entry Point
 * Dominican Republic Tax Compliance & Invoicing
 */

export type {
  InvoicingConfig,
  Invoice,
  InvoiceInput,
  InvoiceItem,
  Customer,
  InvoiceStatus,
  InvoiceType,
  Currency,
  RNCValidation,
  NCFSequence,
  ComplianceReport,
  ComplianceStatus,
  DGIIRejection,
  TaxRate,
  TaxCalculation,
  DigitalSignature,
  AuditLog,
  DGIISubmissionResult,
} from "./types";

export { InvoicingEngine, createInvoicingEngine } from "./invoicing";
export { ComplianceEngine, createComplianceEngine } from "./compliance";

export const VERSION = "1.0.0";

export interface DGIIAgentConfig {
  businessId: string;
  rncNumber: string;
  businessName: string;
  address: string;
  phone: string;
  email: string;
  apiKey: string;
  ncrSequence: {
    from: number;
    to: number;
    current: number;
  };
}

export function createDGIIAgent(config: DGIIAgentConfig) {
  const { createInvoicingEngine } = require("./invoicing");
  const { createComplianceEngine } = require("./compliance");

  const invoicing = createInvoicingEngine({
    ...config,
    currency: "RDO",
    itbisRate: 0.18,
  });

  const compliance = createComplianceEngine();

  return {
    invoicing,
    compliance,
    version: VERSION,
  };
}
