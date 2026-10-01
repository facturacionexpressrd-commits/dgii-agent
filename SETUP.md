# DGII Agent - Setup Guide

Complete installation and configuration guide for Dominican Republic invoicing compliance.

## Prerequisites

- Node.js 18+
- NPM or yarn
- Database (PostgreSQL recommended)

## Installation

```bash
npm install @facturacionexpress/dgii-agent
```

## Configuration

Create `.env.local`:

```bash
# Business Info
BUSINESS_ID=acme-corp
RNC_NUMBER=123456789
BUSINESS_NAME=ACME Corporation
BUSINESS_ADDRESS=Santo Domingo, DR
BUSINESS_PHONE=+1-809-123-4567
BUSINESS_EMAIL=invoices@acme.com

# DGII API
DGII_API_KEY=your-dgii-api-key
DGII_API_SECRET=your-dgii-secret

# NCF Sequences (from DGII)
NCF_FROM=1
NCF_TO=100
NCF_CURRENT=1

# Database
DATABASE_URL=postgresql://user:password@localhost/dgii

# Optional
CURRENCY=RDO
ITBIS_RATE=0.18
LOG_LEVEL=info
```

## Basic Usage

```typescript
import { createDGIIAgent } from "@facturacionexpress/dgii-agent";

const agent = createDGIIAgent({
  businessId: "acme-corp",
  rncNumber: "123456789",
  businessName: "ACME Corporation",
  address: "Santo Domingo, DR",
  phone: "+1-809-123-4567",
  email: "invoices@acme.com",
  apiKey: process.env.DGII_API_KEY,
  ncrSequence: {
    from: 1,
    to: 100,
    current: 1,
  },
});

// Generate invoice
const invoice = await agent.invoicing.generateInvoice({
  type: "1",
  customer: {
    name: "Juan Pérez",
    rnc: "001234567891",
    email: "juan@example.com",
  },
  items: [
    {
      description: "Consultoría",
      quantity: 1,
      unitPrice: 1000,
    },
  ],
});

console.log(`Invoice created: ${invoice.ncf}`);
console.log(`Total: RD$ ${invoice.totalAmount}`);

// Validate compliance
const isCompliant = agent.compliance.isCompliant(invoice);
console.log(`Compliant: ${isCompliant}`);
```

## Deployment

### Local Development

```bash
npm run dev
```

### Build & Deploy

```bash
npm run build
vercel --prod  # or your chosen platform
```

## Database Setup

### PostgreSQL

```sql
-- Run migrations in /migrations
psql -d dgii_agent -f migrations/001_init.sql
psql -d dgii_agent -f migrations/002_compliance.sql
```

## Integration

### Express

```typescript
import express from "express";
import { createDGIIAgent } from "@facturacionexpress/dgii-agent";

const agent = createDGIIAgent({...});
const app = express();

app.post("/api/invoices", async (req, res) => {
  const invoice = await agent.invoicing.generateInvoice(req.body);
  res.json(invoice);
});

app.get("/api/compliance/:month/:year", (req, res) => {
  const report = agent.compliance.generateComplianceReport(
    "acme-corp",
    [],
    parseInt(req.params.month),
    parseInt(req.params.year)
  );
  res.json(report);
});

app.listen(3000);
```

## Next Steps

1. Get DGII API credentials from: https://dgii.gov.do
2. Request NCF sequences
3. Configure your business info
4. Start generating compliant invoices
5. Monitor compliance status

For more details, see ARCHITECTURE.md
