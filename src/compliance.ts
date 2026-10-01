/**
 * DGII Compliance Module - Tax compliance, validation, and reporting
 */

import type {
  Invoice,
  RNCValidation,
  ComplianceReport,
  ComplianceStatus,
  DGIIRejection,
  TaxRate,
} from "./types";

export class ComplianceEngine {
  private rejections: Map<string, DGIIRejection> = new Map();
  private rncCache: Map<string, RNCValidation> = new Map();

  /**
   * Validate RNC (Registro Nacional del Contribuyente)
   * Dominican Republic business registration number (11 digits)
   */
  async validateRNC(rnc: string): Promise<RNCValidation> {
    // Check cache
    if (this.rncCache.has(rnc)) {
      return this.rncCache.get(rnc)!;
    }

    // Validate format
    if (!/^\d{11}$/.test(rnc)) {
      return {
        valid: false,
        rnc,
        message: "RNC must be 11 digits",
      };
    }

    // Luhn algorithm validation (simplified)
    const checksum = this.calculateLuhnChecksum(rnc);
    const lastDigit = parseInt(rnc.charAt(10));

    if (checksum !== lastDigit) {
      return {
        valid: false,
        rnc,
        message: "Invalid RNC checksum",
      };
    }

    const validation: RNCValidation = {
      valid: true,
      rnc,
      type: this.getRNCType(rnc),
      status: "active",
    };

    this.rncCache.set(rnc, validation);
    return validation;
  }

  private calculateLuhnChecksum(rnc: string): number {
    const digits = rnc.substring(0, 10).split("").map(Number);
    const weights = [1, 2, 1, 2, 1, 2, 1, 2, 1, 2];
    let sum = 0;

    for (let i = 0; i < 10; i++) {
      let product = digits[i] * weights[i];
      if (product > 9) {
        product = product - 9;
      }
      sum += product;
    }

    return (10 - (sum % 10)) % 10;
  }

  private getRNCType(rnc: string): "person" | "company" {
    // Simplified: can be expanded with actual DGII data
    const firstDigit = parseInt(rnc.charAt(0));
    return firstDigit < 5 ? "person" : "company";
  }

  /**
   * Validate invoice for compliance
   */
  validateInvoice(invoice: Invoice): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check RNC format
    if (!/^\d{11}$/.test(invoice.customerId)) {
      errors.push("Invalid customer RNC");
    }

    // Check NCF format
    if (!/^A\d{8}$/.test(invoice.ncf)) {
      errors.push("Invalid NCF format");
    }

    // Check totals calculation
    const calculatedTotal =
      invoice.subtotal +
      invoice.itbis +
      (invoice.selectiveTax || 0) -
      (invoice.discount || 0);
    if (Math.abs(calculatedTotal - invoice.totalAmount) > 0.01) {
      errors.push("Invoice total mismatch");
    }

    // Check ITBIS calculation
    const expectedItbis = Math.round(
      (invoice.subtotal - (invoice.discount || 0)) * 0.18 * 100
    ) / 100;
    if (Math.abs(expectedItbis - invoice.itbis) > 0.01) {
      warnings.push("ITBIS calculation seems off");
    }

    // Check items
    if (!invoice.items || invoice.items.length === 0) {
      errors.push("Invoice must have at least one item");
    }

    for (const item of invoice.items || []) {
      if (item.quantity <= 0) {
        errors.push(`Invalid quantity for item: ${item.description}`);
      }
      if (item.unitPrice < 0) {
        errors.push(`Invalid price for item: ${item.description}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Record DGII rejection
   */
  recordRejection(
    invoiceId: string,
    ncf: string,
    errorCode: string,
    errorMessage: string
  ): DGIIRejection {
    const rejection: DGIIRejection = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      invoiceId,
      ncf,
      errorCode,
      errorMessage,
      receivedAt: new Date(),
    };

    this.rejections.set(rejection.id, rejection);
    return rejection;
  }

  /**
   * Get tax rates for Dominican Republic
   */
  getTaxRates(category?: string): TaxRate[] {
    const rates: TaxRate[] = [
      {
        type: "itbis",
        rate: 0.18,
        applicable: true,
        appliesTo: ["general"],
      },
      {
        type: "itbis",
        rate: 0.0,
        applicable: true,
        appliesTo: ["healthcare", "education", "agriculture"],
      },
      {
        type: "selective",
        rate: 0.25,
        applicable: true,
        appliesTo: ["alcohol"],
      },
      {
        type: "selective",
        rate: 0.1,
        applicable: true,
        appliesTo: ["tobacco"],
      },
      {
        type: "luxury",
        rate: 0.05,
        applicable: true,
        appliesTo: ["vehicles"],
      },
      {
        type: "excise",
        rate: 0.08,
        applicable: true,
        appliesTo: ["fuel", "gas"],
      },
    ];

    if (category) {
      return rates.filter((r) =>
        r.appliesTo?.some((cat) => cat.includes(category))
      );
    }

    return rates;
  }

  /**
   * Generate compliance report for a month
   */
  generateComplianceReport(
    businessId: string,
    invoices: Invoice[],
    month: number,
    year: number
  ): ComplianceReport {
    const monthInvoices = invoices.filter((inv) => {
      const date = new Date(inv.createdAt);
      return date.getMonth() + 1 === month && date.getFullYear() === year;
    });

    const acceptedInvoices = monthInvoices.filter(
      (inv) => inv.status === "accepted"
    );
    const rejectedInvoices = monthInvoices.filter(
      (inv) => inv.status === "rejected"
    );

    const report: ComplianceReport = {
      id: `${businessId}-${year}-${month}`,
      businessId,
      reportMonth: month,
      reportYear: year,
      totalInvoices: monthInvoices.length,
      totalAmount: monthInvoices.reduce(
        (sum, inv) => sum + inv.totalAmount,
        0
      ),
      totalItbis: monthInvoices.reduce((sum, inv) => sum + inv.itbis, 0),
      totalSelectiveTax: monthInvoices.reduce(
        (sum, inv) => sum + (inv.selectiveTax || 0),
        0
      ),
      rejectionsCount: rejectedInvoices.length,
      submittedToDGII: false,
      generatedAt: new Date(),
    };

    return report;
  }

  /**
   * Get compliance status overview
   */
  getComplianceStatus(
    businessId: string,
    invoices: Invoice[]
  ): ComplianceStatus {
    const businessInvoices = invoices.filter(
      (inv) => inv.businessId === businessId
    );
    const accepted = businessInvoices.filter(
      (inv) => inv.status === "accepted"
    ).length;
    const rejected = businessInvoices.filter(
      (inv) => inv.status === "rejected"
    ).length;
    const pending = businessInvoices.filter(
      (inv) => inv.status === "draft" || inv.status === "submitted"
    ).length;

    const complianceRate =
      businessInvoices.length > 0
        ? Math.round((accepted / businessInvoices.length) * 100)
        : 0;

    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 20);

    return {
      businessId,
      totalInvoices: businessInvoices.length,
      acceptedInvoices: accepted,
      rejectedInvoices: rejected,
      pendingInvoices: pending,
      complianceRate,
      sequenceStatus: "active",
      nextReportDue: nextMonth,
    };
  }

  /**
   * Check if invoice is compliant
   */
  isCompliant(invoice: Invoice): boolean {
    const validation = this.validateInvoice(invoice);
    return validation.valid && invoice.status === "accepted";
  }

  /**
   * Get rejections for business
   */
  getRejections(businessId: string, invoiceId?: string): DGIIRejection[] {
    const rejections = Array.from(this.rejections.values());

    if (invoiceId) {
      return rejections.filter((r) => r.invoiceId === invoiceId);
    }

    return rejections;
  }
}

export function createComplianceEngine(): ComplianceEngine {
  return new ComplianceEngine();
}
