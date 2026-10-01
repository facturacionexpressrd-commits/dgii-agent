/**
 * DGII Invoicing Engine - Core invoice generation and management
 */

import { v4 as uuidv4 } from "crypto";
import type {
  InvoicingConfig,
  Invoice,
  InvoiceInput,
  InvoiceStatus,
  TaxCalculation,
  NCFSequence,
} from "./types";

export class InvoicingEngine {
  private config: InvoicingConfig;
  private invoices: Map<string, Invoice> = new Map();
  private sequences: Map<string, NCFSequence> = new Map();

  constructor(config: InvoicingConfig) {
    this.config = config;
    this.initializeSequence();
  }

  private initializeSequence() {
    const sequence: NCFSequence = {
      id: uuidv4(),
      businessId: this.config.businessId,
      invoiceType: "1",
      currentSequence: this.config.ncrSequence.current,
      fromSequence: this.config.ncrSequence.from,
      toSequence: this.config.ncrSequence.to,
      usedCount: 0,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      updatedAt: new Date(),
    };
    this.sequences.set("1", sequence);
  }

  async generateInvoice(input: InvoiceInput): Promise<Invoice> {
    try {
      // Validate input
      this.validateInvoiceInput(input);

      // Get next NCF
      const ncf = this.getNextNCF(input.type);

      // Calculate taxes
      const taxes = this.calculateTaxes(input.items, input.discount);

      // Create invoice
      const invoice: Invoice = {
        id: uuidv4(),
        businessId: this.config.businessId,
        ncf,
        type: input.type,
        customerId: input.customer.rnc,
        customerName: input.customer.name,
        items: input.items.map((item) => ({
          ...item,
          id: uuidv4(),
          itbis: item.itbis || this.calculateItemItbis(item.unitPrice * item.quantity),
          lineTotal: (item.unitPrice * item.quantity) + (item.itbis || 0),
        })),
        subtotal: taxes.subtotal,
        discount: input.discount,
        itbis: taxes.itbis,
        selectiveTax: taxes.selectiveTax,
        totalAmount: taxes.totalAmount,
        status: "draft",
        currency: this.config.currency || "RDO",
        createdAt: new Date(),
        updatedAt: new Date(),
        notes: input.notes,
        reference: input.reference,
        dueDate: input.dueDate,
      };

      // Store invoice
      this.invoices.set(invoice.id, invoice);

      // Callback
      if (this.config.onInvoiceCreated) {
        this.config.onInvoiceCreated(invoice);
      }

      return invoice;
    } catch (error) {
      if (this.config.onError) {
        this.config.onError(error as Error, { input });
      }
      throw error;
    }
  }

  private validateInvoiceInput(input: InvoiceInput) {
    if (!input.customer.name || input.customer.name.length === 0) {
      throw new Error("Customer name is required");
    }

    if (!input.customer.rnc || input.customer.rnc.length !== 11) {
      throw new Error("Valid RNC (11 digits) is required");
    }

    if (!input.items || input.items.length === 0) {
      throw new Error("At least one item is required");
    }

    for (const item of input.items) {
      if (item.quantity <= 0) {
        throw new Error("Item quantity must be greater than 0");
      }
      if (item.unitPrice < 0) {
        throw new Error("Item price cannot be negative");
      }
    }
  }

  private getNextNCF(type: string): string {
    const sequence = this.sequences.get(type);
    if (!sequence) {
      throw new Error(`No sequence available for invoice type ${type}`);
    }

    if (sequence.currentSequence >= sequence.toSequence) {
      throw new Error(`NCF sequence exhausted for type ${type}`);
    }

    sequence.currentSequence++;
    sequence.usedCount++;
    sequence.updatedAt = new Date();

    // Format: A01000000001
    const padded = String(sequence.currentSequence).padStart(8, "0");
    return `A${padded}`;
  }

  private calculateTaxes(
    items: any[],
    discount?: number
  ): TaxCalculation {
    const subtotal = items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );

    const discountAmount = discount || 0;
    const subtotalAfterDiscount = subtotal - discountAmount;

    // Calculate ITBIS (18% standard)
    const itbisRate = this.config.itbisRate || 0.18;
    const itbis = Math.round(subtotalAfterDiscount * itbisRate * 100) / 100;

    // Calculate selective taxes if applicable
    let selectiveTax = 0;
    for (const item of items) {
      if (item.selectiveTax) {
        selectiveTax += item.selectiveTax;
      }
    }

    const totalAmount = subtotalAfterDiscount + itbis + selectiveTax;

    return {
      subtotal,
      discountAmount,
      subtotalAfterDiscount,
      itbis,
      selectiveTax: selectiveTax > 0 ? selectiveTax : undefined,
      totalAmount,
      currency: this.config.currency || "RDO",
    };
  }

  private calculateItemItbis(amount: number): number {
    const rate = this.config.itbisRate || 0.18;
    return Math.round(amount * rate * 100) / 100;
  }

  async getInvoice(invoiceId: string): Promise<Invoice | undefined> {
    return this.invoices.get(invoiceId);
  }

  async updateInvoiceStatus(
    invoiceId: string,
    status: InvoiceStatus
  ): Promise<Invoice> {
    const invoice = this.invoices.get(invoiceId);
    if (!invoice) {
      throw new Error(`Invoice ${invoiceId} not found`);
    }

    invoice.status = status;
    invoice.updatedAt = new Date();

    if (status === "accepted") {
      invoice.acceptedAt = new Date();
    }

    return invoice;
  }

  async cancelInvoice(invoiceId: string, reason?: string): Promise<Invoice> {
    const invoice = await this.updateInvoiceStatus(invoiceId, "cancelled");
    invoice.notes = `Cancelled: ${reason || "No reason provided"}`;
    return invoice;
  }

  getSequenceUsage(type: string = "1"): {
    used: number;
    remaining: number;
    total: number;
    expiresAt: Date;
  } {
    const sequence = this.sequences.get(type);
    if (!sequence) {
      throw new Error(`No sequence found for type ${type}`);
    }

    const total = sequence.toSequence - sequence.fromSequence + 1;
    const remaining = sequence.toSequence - sequence.currentSequence;

    return {
      used: sequence.usedCount,
      remaining,
      total,
      expiresAt: sequence.expiresAt,
    };
  }

  listInvoices(status?: InvoiceStatus): Invoice[] {
    const invoices = Array.from(this.invoices.values());
    if (status) {
      return invoices.filter((inv) => inv.status === status);
    }
    return invoices;
  }

  getInvoicesByMonth(month: number, year: number): Invoice[] {
    return Array.from(this.invoices.values()).filter((inv) => {
      const date = new Date(inv.createdAt);
      return date.getMonth() + 1 === month && date.getFullYear() === year;
    });
  }

  getTotalByMonth(month: number, year: number): {
    count: number;
    subtotal: number;
    itbis: number;
    total: number;
  } {
    const invoices = this.getInvoicesByMonth(month, year);

    return {
      count: invoices.length,
      subtotal: invoices.reduce((sum, inv) => sum + inv.subtotal, 0),
      itbis: invoices.reduce((sum, inv) => sum + inv.itbis, 0),
      total: invoices.reduce((sum, inv) => sum + inv.totalAmount, 0),
    };
  }
}

export function createInvoicingEngine(config: InvoicingConfig): InvoicingEngine {
  return new InvoicingEngine(config);
}
