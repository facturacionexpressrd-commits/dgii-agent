/**
 * DGII Agent - Type Definitions
 * Dominican Republic Tax Compliance & Invoicing
 */

export type InvoiceType = "1" | "2" | "3" | "4" | "5" | "6" | "7";

export type InvoiceStatus =
  | "draft"
  | "submitted"
  | "accepted"
  | "rejected"
  | "cancelled"
  | "modified";

export type Currency = "RDO" | "USD";

export interface InvoicingConfig {
  businessId: string;
  rncNumber: string;
  businessName: string;

  address: string;
  phone: string;
  email: string;
  website?: string;

  apiKey: string;
  apiSecret?: string;

  ncrSequence: {
    from: number;
    to: number;
    current: number;
  };

  currency?: Currency;
  itbisRate?: number;
  selectiveTaxRates?: Record<string, number>;

  database?: {
    url: string;
    apiKey: string;
  };

  onError?: (error: Error, context: any) => void;
  onInvoiceCreated?: (invoice: Invoice) => void;
  onInvoiceRejected?: (invoice: Invoice, reason: string) => void;
}

export interface Customer {
  name: string;
  rnc: string; // Registro Nacional del Contribuyente
  email?: string;
  phone?: string;
  address?: string;
  type?: "person" | "company";
}

export interface InvoiceItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  itbis?: number;
  selectiveTax?: number;
  lineTotal?: number;
}

export interface InvoiceInput {
  type: InvoiceType;
  customer: Customer;
  items: InvoiceItem[];
  discount?: number;
  notes?: string;
  dueDate?: Date;
  reference?: string;
}

export interface Invoice {
  id: string;
  businessId: string;
  ncf: string; // Número de Comprobante Fiscal
  type: InvoiceType;
  customerId: string;
  customerName: string;

  items: InvoiceItem[];
  subtotal: number;
  discount?: number;
  itbis: number;
  selectiveTax?: number;
  otherTaxes?: number;
  totalAmount: number;

  status: InvoiceStatus;
  currency: Currency;

  pdfUrl?: string;
  digitalSignature?: string;

  submittedAt?: Date;
  acceptedAt?: Date;
  rejectionReason?: string;
  rejectionCode?: string;

  createdAt: Date;
  updatedAt: Date;

  notes?: string;
  reference?: string;
}

export interface RNCValidation {
  valid: boolean;
  rnc: string;
  name?: string;
  type?: "person" | "company";
  status?: "active" | "inactive" | "suspended";
  message?: string;
}

export interface NCFSequence {
  id: string;
  businessId: string;
  invoiceType: InvoiceType;
  currentSequence: number;
  fromSequence: number;
  toSequence: number;
  usedCount: number;
  expiresAt: Date;
  updatedAt: Date;
}

export interface DGIIRejection {
  id: string;
  invoiceId: string;
  ncf: string;
  errorCode: string;
  errorMessage: string;
  receivedAt: Date;
  resolvedAt?: Date;
}

export interface ComplianceReport {
  id: string;
  businessId: string;
  reportMonth: number;
  reportYear: number;
  totalInvoices: number;
  totalAmount: number;
  totalItbis: number;
  totalSelectiveTax?: number;
  rejectionsCount: number;
  submittedToDGII: boolean;
  submittedAt?: Date;
  generatedAt: Date;
}

export interface TaxCalculation {
  subtotal: number;
  discountAmount: number;
  subtotalAfterDiscount: number;
  itbis: number;
  selectiveTax?: number;
  otherTaxes?: number;
  totalAmount: number;
  currency: Currency;
}

export interface DigitalSignature {
  algorithm: string;
  certificate: string;
  thumbprint: string;
  timestamp: Date;
  signedData: string;
}

export interface AuditLog {
  id: string;
  invoiceId: string;
  action: string; // "created" | "submitted" | "accepted" | "rejected" | "modified"
  timestamp: Date;
  userId?: string;
  ipAddress?: string;
  changes?: Record<string, any>;
  notes?: string;
}

export interface DGIISubmissionResult {
  success: boolean;
  ncf: string;
  acceptedAt?: Date;
  rejectionCode?: string;
  rejectionMessage?: string;
  metadata?: Record<string, any>;
}

export interface ComplianceStatus {
  businessId: string;
  totalInvoices: number;
  acceptedInvoices: number;
  rejectedInvoices: number;
  pendingInvoices: number;
  complianceRate: number; // 0-100
  lastReportDate?: Date;
  nextReportDue: Date;
  sequenceStatus: "active" | "expiring_soon" | "expired";
}

export interface TaxRate {
  type: "itbis" | "selective" | "luxury" | "excise";
  rate: number;
  applicable: boolean;
  appliesTo?: string[]; // Categories
}
