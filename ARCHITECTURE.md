# DGII Agent - Architecture

Dominican Republic tax compliance and invoicing system.

## Core Modules

### Invoicing Engine
- Invoice generation
- NCF sequence management
- Tax calculation (ITBIS, selective tax)
- Invoice status tracking
- PDF generation (future)

### Compliance Engine
- RNC validation
- Invoice validation
- DGII rejections handling
- Compliance reports
- Tax rate management

### DGII Integration
- E-CF submission (future)
- Rejection letter handling (future)
- Status tracking (future)

## Data Flow

```
Invoice Request
    ↓
[Validate input & RNC]
    ↓
[Get next NCF]
    ↓
[Calculate taxes]
    ↓
[Create invoice]
    ↓
[Store in database]
    ↓
[Submit to DGII] (future)
    ↓
Invoice generated
```

## Database Schema

- invoices: Main invoice records
- invoice_items: Line items
- ncf_sequences: NCF tracking
- dgii_rejections: Rejection logs
- compliance_reports: Monthly reports
- audit_logs: Change tracking

## Tax Calculations

### ITBIS (Standard 18%)
- Base tax on subtotal minus discounts
- Exemptions for healthcare, education
- Rounded to nearest cent

### Selective Taxes
- Alcohol: 25%
- Tobacco: 10%
- Applied per item

### Total = Subtotal + ITBIS + Selective Tax - Discount

## Compliance Rules

- RNC validation (11 digits, checksum)
- NCF format: A01000000001
- Monthly reporting required
- Audit trail for 3 years
- Digital signature ready

## Multi-Tenant

Each business gets isolated:
- Configuration
- NCF sequences
- Invoice records
- Compliance reports

## Performance

- Invoice generation: <100ms
- Tax calculation: <10ms
- Database: Connection pooling
- Caching: RNC validation

## Security

- API key encryption
- RLS database isolation
- Audit logging
- Input validation
- RNC verification

## Error Handling

- Validation errors: Return details
- Sequence exhaustion: Alert admin
- DGII failures: Queue for retry
- Silent logging: All events logged

For implementation details, see the source code.
