# Software Requirements Specification (SRS)
# Nova HMS — Hospital Management System
**Version:** 1.0  
**Date:** September 2026  
**Status:** Draft  
**Prepared by:** Nova HMS Engineering Team  

---

## Table of Contents

1. Executive Summary
2. System Overview & Scope
3. Functional Requirements
4. Business Rules & Workflows
5. Data & Database Design
6. System Architecture, Interfaces & UI
7. Security & Non-Functional Requirements

---

## 1. Executive Summary

### 1.1 Problem Statement

Ethiopian hospitals — public referral centres, general hospitals, university hospitals, and private clinics — operate with fragmented, paper-based workflows that create measurable harm to patient outcomes and institutional efficiency. The core problems are:

**Operational inefficiencies:**
- OPD queues are managed with paper cards and verbal calls, causing 2–4 hours of daily chaos at reception in facilities seeing 200+ patients per day
- Patient records are physically scattered across departments; a doctor in Internal Medicine cannot see what happened in OPD last week without physically retrieving a paper card
- Referral patients arrive at receiving facilities with no advance notice, no clinical summary, and no way to track whether they arrived at all
- Pharmacy staff discover stockouts by walking to the shelf, not by any system alert; EPSA data shows over ETB 2 million lost nationally to drug expiry in a single year due to lack of FEFO tracking

**Financial and compliance gaps:**
- CBHI (Community-Based Health Insurance) claims are submitted manually on paper forms, causing delays, rejections, and revenue leakage
- Fee waiver approvals have no audit trail, creating fraud risk
- Billing is disconnected from clinical activity — dispensed drugs and ordered tests are frequently not billed because there is no automatic link between clinical action and invoice line item

**Data and reporting failures:**
- Facility managers have no real-time visibility into bed occupancy, OPD load, or revenue
- National reporting to DHIS2/eHMIS requires manual data re-entry from paper registers, consuming staff time and introducing transcription errors
- No consumption history exists for demand forecasting; PAR levels are set by intuition, not data

**Infrastructure constraints:**
- Internet connectivity is intermittent in many Ethiopian facilities, making cloud-only systems unreliable
- Most staff interact with systems in Amharic; English-only interfaces create adoption barriers

### 1.2 Proposed Solution

Nova HMS is a multi-tenant, role-based, offline-capable Hospital Management System built specifically for the Ethiopian clinical and regulatory context. It replaces paper workflows with a unified digital platform that connects every department — from reception to pharmacy to finance — in a single system.

Key design decisions:
- **Multi-tenant SaaS:** Each hospital gets an isolated workspace (tenant) on a shared infrastructure, reducing per-facility cost while maintaining data separation
- **Role-based access:** The system presents a different interface and permission set to each of 10 defined roles, so a nurse sees nursing workflows and a billing officer sees billing workflows — not a generic menu
- **Offline-first:** All critical workflows function without internet connectivity; data syncs automatically when connectivity is restored
- **Amharic-first:** All patient-facing interfaces and key staff interfaces support Amharic as a first-class language
- **Ethiopian regulatory alignment:** CBHI claim workflows, RRF (Report and Requisition Form) format for EPSA procurement, fee waiver processes, and DHIS2-compatible export are built in, not bolted on

### 1.3 Goals & Objectives

**Primary goals:**
- Eliminate paper OPD queues and reduce average patient wait time by 40% within 6 months of deployment
- Achieve zero stockouts of essential medicines through automated ROP alerts and demand forecasting
- Reduce CBHI claim rejection rate by 60% through structured digital claim submission
- Give every clinician access to a patient's full history within 10 seconds of opening their record

**Secondary goals:**
- Provide facility managers with real-time dashboards replacing end-of-month paper reports
- Enable referral tracking so that 100% of referred patients are confirmed arrived or flagged as lost
- Reduce drug expiry waste by enforcing FEFO dispensing and near-expiry redistribution alerts
- Support national health reporting by generating DHIS2-compatible data exports

**Business objectives:**
- Achieve 20 paying hospital tenants within 12 months of launch
- Maintain 99.5% uptime SLA for all active tenants
- Reach break-even at 15 tenants on Full Clinical plan

### 1.4 Target Users

**Primary users (staff):**

| Role | Description | Facility type |
|---|---|---|
| Hospital Admin | Manages staff, departments, settings, reports | All |
| Receptionist | Patient registration, OPD queue, appointments | All |
| Doctor | EMR, consultation notes, lab orders, prescriptions, referrals | All |
| Nurse | Vitals entry, MAR, nursing notes, patient monitoring | General+ |
| Lab Technician | Lab order queue, result entry | General+ |
| Pharmacist | Prescription dispensing, inventory, procurement | All |
| Billing Officer | Invoicing, CBHI claims, fee waivers | All |
| Referral Coordinator | Referral inbox/outbox, tracking | Referral+ |
| Ward Manager | Bed board, admissions, discharge | General+ |
| Nova Admin | Platform-level tenant management, billing, feature flags | Platform only |

**Secondary users (patients):**
- Patients accessing the self-service portal to view their health records, lab results, prescriptions, CBHI claims, and referral status

**Tertiary stakeholders:**
- Ethiopian Pharmaceutical Supply Agency (EPSA) — receives RRF requisitions
- Community-Based Health Insurance (CBHI) scheme administrators — receive claims
- Ministry of Health / DHIS2 — receives aggregated reporting data
- Hospital management and board — consume analytics dashboards

### 1.5 Key Features

1. **OPD Queue Management** — Digital ticket issuance, live queue board, kiosk self-check-in, QR-based patient identification
2. **Electronic Medical Records (EMR)** — Full patient history, vitals trending, ICD-coded diagnoses, clinical notes, allergy flags
3. **Lab & Results** — Digital lab order workflow, result entry with reference ranges, automatic clinician notification
4. **Pharmacy & Inventory** — Prescription dispensing queue, multi-location stock ledger, batch/lot tracking, FEFO enforcement, ROP alerts, demand forecasting, RRF requisition, cycle count reconciliation
5. **Referral Management** — Structured referral creation, inter-facility tracking, arrival confirmation, reason logging
6. **CBHI Billing** — Invoice generation linked to clinical activity, CBHI claim submission, approval tracking, fee waiver workflow
7. **Ward & Bed Management** — Real-time bed board, admission/discharge workflow, ward sub-store stock
8. **Analytics & Reporting** — Role-specific dashboards, consumption trends, revenue reports, DHIS2-compatible export
9. **Patient Portal** — Mobile-first self-service portal in English and Amharic for patients to access their own records
10. **Multi-tenant Administration** — Tenant provisioning, plan management, feature flags, platform-level billing

### 1.6 Scope Summary

**In scope:**
- All 10 staff roles and their associated workflows
- Patient self-service portal
- Multi-tenant SaaS architecture with per-hospital data isolation
- Offline-first operation with background sync
- Amharic language support across all patient-facing and key staff interfaces
- CBHI claim workflow
- EPSA RRF-format requisition generation
- DHIS2-compatible data export
- Three pricing tiers: Basic OPD, Full Clinical, Enterprise Multi-Facility

**Out of scope (v1.0):**
- Native mobile applications (iOS/Android) — web responsive only
- Direct DHIS2 API push integration (export file only in v1.0)
- Telemedicine / video consultation
- Medical imaging (PACS/DICOM)
- Payroll and HR management
- Integration with national ID (Fayda) biometric system
- SMS gateway integration (architecture ready, not implemented in v1.0)

---

## 2. System Overview & Scope

### 2.1 System Description

Nova HMS is a web-based, multi-tenant Hospital Management System delivered as Software-as-a-Service (SaaS). Each subscribing hospital receives an isolated tenant workspace accessible at a subdomain (e.g., `debremarkos.novahms.et`). All tenants share the same application infrastructure but have complete data isolation enforced at the database query level via a `tenantId` on every data entity.

The system is built on a modern TypeScript full-stack architecture:
- **Frontend:** Next.js 15 (App Router) with React, Tailwind CSS, deployed on Vercel
- **Backend:** Hono.js API server with tRPC for type-safe client-server communication
- **Database:** PostgreSQL (production) / SQLite (local development) via Prisma ORM
- **Authentication:** Better Auth with session-based auth, role assignment per tenant
- **Offline:** Service Worker + IndexedDB for local data persistence during connectivity loss

The system operates in two modes:
- **Online mode:** All reads and writes go directly to the server; real-time updates via polling or WebSocket
- **Offline mode:** Reads served from local cache; writes queued in IndexedDB and synced on reconnection

### 2.2 System Scope

Nova HMS covers the full patient journey within a hospital facility:

```
Patient arrives → Registration → OPD Queue → Triage (Nurse) → 
Doctor Consultation → [Lab Order] → [Prescription] → [Referral] → 
Pharmacy Dispensing → Billing → [CBHI Claim] → Discharge
```

Additionally it covers:
- Inventory management across the full supply chain (receive → store → dispense → reconcile)
- Ward admission and bed management
- Inter-facility referral tracking
- Platform-level administration for the Nova team

### 2.3 System Modules

| Module | Description | Tier availability |
|---|---|---|
| M01 — OPD Queue | Patient registration, ticket issuance, queue board, kiosk | All tiers |
| M02 — Appointments | Scheduling, reminders, calendar view | All tiers |
| M03 — Billing | Invoice generation, payment recording, fee waivers | All tiers |
| M04 — CBHI Claims | Claim creation, submission, tracking | All tiers |
| M05 — EMR | Patient history, vitals, diagnoses, clinical notes | Full Clinical+ |
| M06 — Lab | Order workflow, result entry, notification | Full Clinical+ |
| M07 — Pharmacy | Prescription queue, dispensing, stock deduction | Full Clinical+ |
| M08 — Inventory | Stock ledger, batches, locations, procurement, forecasting | Full Clinical+ |
| M09 — Referral | Referral creation, tracking, arrival confirmation | Full Clinical+ |
| M10 — Analytics | Dashboards, reports, DHIS2 export | Full Clinical+ |
| M11 — Ward | Bed board, admissions, discharge | Enterprise only |
| M12 — Patient Portal | Self-service patient access | All tiers |
| M13 — Nova Admin | Platform tenant management | Platform only |

### 2.4 User Roles

**Hospital-level roles (scoped to a single tenant):**

| Role ID | Role name | Primary module access |
|---|---|---|
| R01 | Hospital Admin | All modules within tenant |
| R02 | Receptionist | M01, M02, M03, M12 |
| R03 | Doctor | M05, M06, M07 (view), M09 |
| R04 | Nurse | M05 (vitals), M07 (MAR), M11 |
| R05 | Lab Technician | M06 |
| R06 | Pharmacist | M07, M08 |
| R07 | Billing Officer | M03, M04 |
| R08 | Referral Coordinator | M09 |
| R09 | Ward Manager | M11, M08 (ward sub-store) |
| R10 | Patient | M12 (own records only) |

**Platform-level roles:**

| Role ID | Role name | Access |
|---|---|---|
| R11 | Nova Admin | M13 — all tenants, platform billing, feature flags |

### 2.5 Permission Matrix

| Action | Nova Admin | Hospital Admin | Doctor | Nurse | Receptionist | Lab Tech | Pharmacist | Billing Officer | Referral Coord. | Ward Manager | Patient |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Create tenant | ✓ | — | — | — | — | — | — | — | — | — | — |
| Manage staff | — | ✓ | — | — | — | — | — | — | — | — | — |
| Register patient | — | ✓ | — | — | ✓ | — | — | — | — | — | — |
| Issue OPD ticket | — | — | — | — | ✓ | — | — | — | — | — | — |
| View EMR | — | ✓ | ✓ | ✓ | — | — | ✓(rx only) | — | — | — | own only |
| Write clinical notes | — | — | ✓ | ✓(nursing) | — | — | — | — | — | — | — |
| Order lab test | — | — | ✓ | — | — | — | — | — | — | — | — |
| Enter lab result | — | — | — | — | — | ✓ | — | — | — | — | — |
| Create prescription | — | — | ✓ | — | — | — | — | — | — | — | — |
| Dispense medication | — | — | — | — | — | — | ✓ | — | — | — | — |
| Manage inventory | — | — | — | — | — | — | ✓ | — | — | ✓(ward) | — |
| Create invoice | — | — | — | — | — | — | — | ✓ | — | — | — |
| Submit CBHI claim | — | — | — | — | — | — | — | ✓ | — | — | — |
| Approve fee waiver | — | ✓ | — | — | — | — | — | — | — | — | — |
| Create referral | — | — | ✓ | — | — | — | — | — | ✓ | — | — |
| Confirm referral arrival | — | — | — | — | ✓ | — | — | — | ✓ | — | — |
| Manage beds | — | — | — | — | — | — | — | — | — | ✓ | — |
| View reports | — | ✓ | — | — | — | — | — | ✓ | — | — | — |
| View audit log | — | ✓ | — | — | — | — | — | — | — | — | — |
| Platform billing | ✓ | — | — | — | — | — | — | — | — | — | — |

---

## 3. Functional Requirements

### 3.1 Authentication

| ID | Requirement |
|---|---|
| AUTH-01 | The system shall support email + password authentication |
| AUTH-02 | Sessions shall expire after 8 hours of inactivity |
| AUTH-03 | A user may belong to multiple tenants with different roles in each |
| AUTH-04 | Login page shall be tenant-scoped (workspace slug required) |
| AUTH-05 | Failed login attempts shall be rate-limited to 5 per minute per IP |
| AUTH-06 | Password reset shall be via email link with 1-hour expiry |
| AUTH-07 | All session tokens shall be stored server-side; client holds only a session cookie |
| AUTH-08 | The patient portal shall use a separate auth flow (health ID + phone OTP) |
| AUTH-09 | Nova Admin accounts shall require 2FA |

### 3.2 User Management

| ID | Requirement |
|---|---|
| UM-01 | Hospital Admin can create, edit, deactivate, and reactivate staff accounts within their tenant |
| UM-02 | Each staff account shall have exactly one role per tenant |
| UM-03 | Staff invitation shall be via email link valid for 48 hours |
| UM-04 | Deactivated accounts cannot log in but their historical records are preserved |
| UM-05 | Hospital Admin can reset any staff member's password within their tenant |
| UM-06 | All user management actions shall be recorded in the audit log |
| UM-07 | Nova Admin can create, suspend, and delete tenant accounts |
| UM-08 | Nova Admin can impersonate any tenant for support purposes (logged action) |

### 3.3 Core System Modules

#### 3.3.1 OPD Queue Management (M01)

| ID | Requirement |
|---|---|
| OPD-01 | Receptionist can register a new patient with: name (EN + AM), DOB, sex, phone, kebele, CBHI status |
| OPD-02 | System shall generate a unique Health ID for each new patient (format: `{FACILITY_CODE}-{SEQUENCE}`) |
| OPD-03 | System shall issue a sequential OPD ticket number per day (format: `A-001`) |
| OPD-04 | Queue board shall display all tickets with status: waiting, being-seen, done, urgent |
| OPD-05 | Doctor can call next patient from their queue view |
| OPD-06 | Receptionist can mark a ticket as urgent, which moves it to the top of the queue |
| OPD-07 | Kiosk mode shall allow patient self-check-in by scanning their QR health ID card |
| OPD-08 | Queue board shall auto-refresh every 30 seconds |
| OPD-09 | System shall record wait time per ticket for reporting |

#### 3.3.2 Electronic Medical Records (M05)

| ID | Requirement |
|---|---|
| EMR-01 | Each patient shall have a single longitudinal EMR accessible across all visits |
| EMR-02 | EMR shall contain: demographics, visit history, vitals per visit, diagnoses (ICD-10 coded), clinical notes, allergies, active medications, lab results, referrals |
| EMR-03 | Doctor can add a new consultation note with: chief complaint, history, examination findings, assessment, plan |
| EMR-04 | Nurse can record vitals: BP, HR, temperature, SpO2, weight, height, RR |
| EMR-05 | Diagnoses shall be coded using ICD-10; system shall provide search by code or description |
| EMR-06 | Allergy flags shall be prominently displayed at the top of the EMR and on the prescription screen |
| EMR-07 | EMR shall be read-only for non-clinical roles (billing, reception) |
| EMR-08 | All EMR edits shall be versioned; previous versions shall be accessible to Hospital Admin |

#### 3.3.3 Lab Module (M06)

| ID | Requirement |
|---|---|
| LAB-01 | Doctor can create a lab order specifying: test name, priority (routine/urgent), clinical indication |
| LAB-02 | Lab orders shall appear in the Lab Technician's queue immediately on creation |
| LAB-03 | Lab Technician can update order status: pending → in-progress → completed |
| LAB-04 | Result entry shall include: value, unit, reference range, flag (normal/high/low/critical) |
| LAB-05 | On result completion, the ordering doctor shall receive an in-app notification |
| LAB-06 | Critical results (flagged as critical) shall trigger an immediate alert to the ordering doctor |
| LAB-07 | Completed results shall be visible in the patient's EMR and patient portal |
| LAB-08 | Lab orders shall be linked to the billing module for automatic invoice line item creation |

#### 3.3.4 Pharmacy & Dispensing (M07)

| ID | Requirement |
|---|---|
| PHARM-01 | Doctor-created prescriptions shall appear in the Pharmacist's dispensing queue |
| PHARM-02 | Pharmacist can view full prescription details before dispensing |
| PHARM-03 | On dispensing confirmation, stock shall be automatically decremented from the correct batch (FEFO order) |
| PHARM-04 | System shall warn if stock is insufficient to fill a prescription |
| PHARM-05 | Dispensing shall create an automatic billing line item for private-pay patients |
| PHARM-06 | Dispensed prescriptions shall be marked in the patient's EMR medication list |
| PHARM-07 | Pharmacist can partially dispense a prescription and record the reason |

#### 3.3.5 Inventory Management (M08)

| ID | Requirement |
|---|---|
| INV-01 | System shall maintain a real-time stock count per item per location |
| INV-02 | Locations include: Main Pharmacy Store, Ward sub-stores, Operating Theatre, Emergency Store |
| INV-03 | Each item shall have: name, category, unit of measure, reorder point (ROP), max level, supplier |
| INV-04 | Items shall support unit-of-measure conversion (box → strip → tablet) |
| INV-05 | Every stock movement shall be recorded with: type, quantity, batch, location, user, timestamp, reference |
| INV-06 | Movement types: received, dispensed, transferred, expired, damaged, correction |
| INV-07 | Each stock receipt shall capture: lot/batch number, expiry date, supplier, delivery date, PO reference |
| INV-08 | System shall enforce FEFO (First-Expiry-First-Out) dispensing order |
| INV-09 | System shall generate tiered expiry alerts at 90, 60, and 30 days before expiry |
| INV-10 | System shall flag near-expiry items with significant stock for redistribution |
| INV-11 | System shall generate ROP alerts when stock falls to or below the reorder point |
| INV-12 | Pharmacist can create a requisition in RRF format specifying: supplier, items, quantities, justification |
| INV-13 | Emergency requisitions shall be flagged separately and bypass normal approval routing |
| INV-14 | System shall suggest reorder quantities based on max level minus current stock |
| INV-15 | Cycle count workflow: Pharmacist enters physical counts; system calculates variance; discrepancies require categorisation (unrecorded dispensing, expired, damaged, theft, data error) |
| INV-16 | Consumption history shall be recorded per item per month |
| INV-17 | Demand forecast shall use 6-month weighted moving average with seasonal adjustment |
| INV-18 | System shall display months-of-stock remaining per item based on average consumption |

#### 3.3.6 Referral Management (M09)

| ID | Requirement |
|---|---|
| REF-01 | Doctor or Referral Coordinator can create an outgoing referral with: patient, destination facility, reason, urgency, clinical summary |
| REF-02 | Referral shall generate a printable referral letter in standard MoH format |
| REF-03 | Incoming referrals shall appear in the Referral Coordinator's inbox |
| REF-04 | Receptionist or Referral Coordinator can confirm patient arrival against an incoming referral |
| REF-05 | Referrals not confirmed within 48 hours shall be flagged as potentially lost |
| REF-06 | Referral status states: pending → in-transit → arrived / lost |
| REF-07 | Patient can view their own referral status in the patient portal |

#### 3.3.7 Billing & CBHI (M03, M04)

| ID | Requirement |
|---|---|
| BILL-01 | Invoice shall be automatically populated with line items from: OPD consultation, lab orders, dispensed medications, procedures |
| BILL-02 | Billing Officer can add, edit, or remove line items before finalising |
| BILL-03 | Invoice statuses: draft → pending → paid / waiver-requested / waiver-approved |
| BILL-04 | CBHI-enrolled patients shall have their invoices flagged for claim submission |
| BILL-05 | Billing Officer can submit a CBHI claim from a finalised invoice |
| BILL-06 | CBHI claim statuses: submitted → approved / rejected |
| BILL-07 | Fee waiver requests require: patient name, invoice, reason, requesting staff |
| BILL-08 | Fee waivers must be approved by Hospital Admin before invoice is marked waived |
| BILL-09 | All billing actions shall be recorded in the audit log |

#### 3.3.8 Ward & Bed Management (M11)

| ID | Requirement |
|---|---|
| WARD-01 | Ward Manager can view a real-time bed board showing: bed ID, ward, room, status (available/occupied/maintenance), patient name if occupied |
| WARD-02 | Ward Manager can admit a patient to a bed, linking the admission to their EMR |
| WARD-03 | Ward Manager can discharge a patient, freeing the bed |
| WARD-04 | Bed statuses: available, occupied, maintenance, reserved |
| WARD-05 | Hospital Admin dashboard shall show bed occupancy percentage in real time |

### 3.4 Request / Workflow Management

| ID | Requirement |
|---|---|
| WF-01 | Lab orders shall flow: Doctor creates → Lab Tech receives → Lab Tech processes → Doctor notified |
| WF-02 | Prescriptions shall flow: Doctor creates → Pharmacist receives → Pharmacist dispenses → Stock decremented → Billing updated |
| WF-03 | Fee waivers shall flow: Staff requests → Hospital Admin reviews → Approved/Rejected → Invoice updated |
| WF-04 | Requisitions shall flow: Pharmacist creates → Hospital Admin approves (routine) / auto-approved (emergency) → Supplier notified |
| WF-05 | CBHI claims shall flow: Invoice finalised → Billing Officer submits → CBHI scheme reviews → Approved/Rejected → Revenue recorded |
| WF-06 | Referrals shall flow: Doctor creates → Referral letter generated → Receiving facility notified → Arrival confirmed |

### 3.5 Scheduling

| ID | Requirement |
|---|---|
| SCH-01 | Receptionist can book an appointment for a patient with: doctor, department, date, time |
| SCH-02 | System shall prevent double-booking of a doctor at the same time slot |
| SCH-03 | Appointment statuses: scheduled, confirmed, completed, cancelled, no-show |
| SCH-04 | Patients can view their upcoming appointments in the patient portal |
| SCH-05 | System shall generate appointment reminder notifications 24 hours before the appointment |

### 3.6 Dashboard

| ID | Requirement |
|---|---|
| DASH-01 | Hospital Admin dashboard shall show: patients today, revenue this month, bed occupancy %, active alerts |
| DASH-02 | Doctor dashboard shall show: patients in queue, completed today, pending lab results |
| DASH-03 | Pharmacist dashboard shall show: pending prescriptions, critical stock items, near-expiry batches |
| DASH-04 | Billing Officer dashboard shall show: pending invoices, submitted CBHI claims, pending fee waivers |
| DASH-05 | Nova Admin dashboard shall show: active tenants, MRR, platform alerts, recent signups |
| DASH-06 | All dashboards shall load within 2 seconds on a 4G connection |

### 3.7 Reports

| ID | Requirement |
|---|---|
| RPT-01 | Stock status report: current qty, ROP, max level, months of stock, status per item |
| RPT-02 | Consumption report: monthly consumption per item over selectable date range |
| RPT-03 | Wastage report: expired, damaged, and lost stock by item and category |
| RPT-04 | Revenue report: total invoiced, collected, waived, and outstanding by period |
| RPT-05 | OPD load report: patients per day, average wait time, peak hours |
| RPT-06 | Bed occupancy report: occupancy rate by ward and period |
| RPT-07 | Referral report: outgoing/incoming counts, arrival rate, lost-in-transit rate |
| RPT-08 | CBHI report: claims submitted, approved, rejected, approval rate, revenue recovered |
| RPT-09 | All reports shall be exportable as CSV and PDF |
| RPT-10 | DHIS2-compatible aggregate export shall be available for MoH reporting periods |

### 3.8 Notifications

| ID | Requirement |
|---|---|
| NOTIF-01 | In-app notifications shall be delivered in real time for: lab results ready, critical lab values, low/critical stock, CBHI claim status change, referral arrival, appointment reminder |
| NOTIF-02 | Notifications shall be marked read/unread; unread count shown in topbar |
| NOTIF-03 | SMS notifications shall be queued when offline and sent on reconnection (architecture ready, gateway TBD) |
| NOTIF-04 | Patients shall receive notifications in their preferred language (EN or AM) |
| NOTIF-05 | Nova Admin shall receive platform alerts for: tenant payment failure, system errors, capacity thresholds |

### 3.9 Administration

| ID | Requirement |
|---|---|
| ADM-01 | Hospital Admin can configure: hospital name, logo, departments, fee schedule, CBHI settings |
| ADM-02 | Hospital Admin can view a full audit log of all actions within their tenant |
| ADM-03 | Audit log entries shall include: user, action, target entity, timestamp, IP address |
| ADM-04 | Audit log shall be read-only; no entry can be deleted |
| ADM-05 | Nova Admin can enable/disable feature flags per tenant |
| ADM-06 | Nova Admin can upgrade or downgrade a tenant's plan |
| ADM-07 | Nova Admin can view platform-level usage metrics: API calls, storage, active users per tenant |

---

## 4. Business Rules & Workflows

### 4.1 Business Rules

**Patient identity:**
- BR-01: A patient's Health ID is unique across the entire platform (not just per tenant)
- BR-02: A patient can be registered at multiple facilities; their EMR is facility-scoped but their Health ID is global
- BR-03: Duplicate patient detection shall check: name similarity + DOB + phone; staff must confirm before creating a new record

**Clinical rules:**
- BR-04: A prescription cannot be created without an active consultation note for the same visit
- BR-05: A lab order cannot be created without an active consultation note for the same visit
- BR-06: Allergy conflicts between a prescribed drug and a recorded allergy shall trigger a mandatory warning (not a hard block — doctor must acknowledge)
- BR-07: A doctor cannot dispense medication directly; dispensing is exclusively a Pharmacist action
- BR-08: Lab results can only be entered by a Lab Technician; doctors cannot modify results

**Inventory rules:**
- BR-09: Stock cannot go below zero; the system shall prevent dispensing if insufficient stock exists
- BR-10: FEFO order is enforced automatically; the system selects the batch with the earliest expiry date first
- BR-11: A stock adjustment of type "correction" requires a mandatory note
- BR-12: Cycle count discrepancies of more than 10% of system quantity require a mandatory loss category selection
- BR-13: Expired batches cannot be dispensed; they must be written off via an "expired" adjustment

**Financial rules:**
- BR-14: An invoice cannot be submitted as a CBHI claim unless the patient has CBHI status = active
- BR-15: A fee waiver cannot exceed 100% of the invoice total
- BR-16: Once an invoice is marked "paid", it cannot be edited; a credit note must be issued instead
- BR-17: CBHI claim rejection reason must be recorded before the claim can be resubmitted

**Referral rules:**
- BR-18: An outgoing referral must include a clinical summary of at least 50 characters
- BR-19: A referral cannot be created for a patient who has no active visit on the same day
- BR-20: Referrals not confirmed as arrived within 72 hours are automatically flagged as "potentially lost"

**Tenant rules:**
- BR-21: A suspended tenant's staff cannot log in, but data is preserved for 90 days
- BR-22: Feature flags override plan-level module access (Nova Admin can enable a module for a tenant regardless of plan)
- BR-23: Each tenant's data is isolated; cross-tenant queries are architecturally impossible at the application layer

### 4.2 Main Workflows

#### Workflow 1: Patient OPD Visit (end-to-end)

```
1. Patient arrives at reception
2. Receptionist searches for existing patient by name / Health ID / phone
   → If new: register patient, generate Health ID, print QR card
   → If existing: confirm identity
3. Receptionist issues OPD ticket (e.g. A-007)
4. Ticket appears on queue board with status "waiting"
5. Doctor calls next patient from their queue
   → Ticket status changes to "being-seen"
6. Nurse records vitals (BP, HR, temp, SpO2, weight)
7. Doctor opens EMR, reviews history, writes consultation note
8. Doctor optionally:
   a. Orders lab test → goes to Lab module
   b. Creates prescription → goes to Pharmacy module
   c. Creates referral → goes to Referral module
9. Doctor marks consultation complete
   → Ticket status changes to "done"
10. Billing Officer generates invoice from visit
    → Line items auto-populated from consultation, labs, prescriptions
11. Patient pays or CBHI claim submitted
12. Visit recorded in patient's EMR and patient portal
```

#### Workflow 2: Pharmacy Dispensing with Stock Deduction

```
1. Doctor creates prescription (drug, dose, frequency, days)
2. Prescription appears in Pharmacist's queue with status "pending"
3. Pharmacist reviews prescription
   → System checks stock availability
   → System identifies correct batch (FEFO — earliest expiry first)
   → System warns if allergy conflict exists
4. Pharmacist confirms dispense
   → Stock decremented from correct batch and location
   → Prescription status → "dispensed"
   → Billing line item created (if private-pay)
   → EMR medication list updated
5. If stock insufficient:
   → Pharmacist records partial dispense with reason
   → Remaining quantity flagged as outstanding
```

#### Workflow 3: Inventory Replenishment (RRF Cycle)

```
1. System detects item stock ≤ ROP
   → ROP alert generated in Pharmacist dashboard
2. Pharmacist reviews alert, checks demand forecast
3. Pharmacist creates requisition:
   → Selects supplier (EPSA or other)
   → System auto-suggests reorder quantity (max level − current stock)
   → Pharmacist adjusts quantities, adds justification
   → Marks as routine or emergency
4. Routine: Hospital Admin reviews and approves
   Emergency: Auto-approved, flagged for Hospital Admin awareness
5. Requisition exported as RRF-format document for EPSA submission
6. On delivery:
   → Pharmacist opens Goods Receipt form
   → Enters: lot number, expiry date, quantity, unit cost per line
   → System creates new batch records
   → Stock incremented per location
   → Movement recorded as "received" with PO reference
```

#### Workflow 4: CBHI Claim Submission

```
1. Patient visit completed; invoice generated
2. Billing Officer verifies patient CBHI status = active
3. Billing Officer reviews invoice line items
4. Billing Officer submits CBHI claim
   → Claim status → "submitted"
   → Claim linked to invoice
5. CBHI scheme reviews (external process)
6. Billing Officer records outcome:
   → Approved: invoice marked paid via CBHI; revenue recorded
   → Rejected: rejection reason recorded; claim can be corrected and resubmitted
```

#### Workflow 5: Referral (Outgoing)

```
1. Doctor decides patient needs referral
2. Doctor opens referral form:
   → Selects destination facility
   → Selects reason / specialty needed
   → Writes clinical summary (min 50 chars)
   → Sets urgency (routine / urgent / emergency)
3. System generates referral letter (MoH format)
4. Referral status → "pending"
5. Patient travels to destination facility
6. At destination: Receptionist or Referral Coordinator confirms arrival
   → Referral status → "arrived"
7. If not confirmed within 72 hours:
   → System flags referral as "potentially lost"
   → Alert sent to Referral Coordinator
8. Patient can track referral status in patient portal
```

### 4.3 Status & State Management

#### OPD Ticket States
```
issued → waiting → being-seen → done
                ↘ urgent (priority override, returns to waiting at top)
                ↘ no-show (patient did not respond when called)
```

#### Prescription States
```
created → pending → dispensed
                 ↘ partially-dispensed → dispensed
                 ↘ cancelled (by doctor before dispensing)
```

#### Lab Order States
```
ordered → pending → in-progress → completed
                              ↘ cancelled
```

#### Invoice States
```
draft → pending → paid
              ↘ waiver-requested → waiver-approved → waived
              ↘ void (credit note issued)
```

#### CBHI Claim States
```
submitted → approved → revenue-recorded
         ↘ rejected → corrected → submitted (loop)
```

#### Referral States
```
pending → in-transit → arrived
                    ↘ lost (72h timeout, no confirmation)
```

#### Inventory Batch States
```
active → low (qty ≤ ROP) → critical (qty ≤ 50% ROP) → depleted (qty = 0)
       → near-expiry (≤90 days) → expired
```

#### Requisition States
```
draft → pending-approval → approved → fulfilled
                        ↘ rejected
     (emergency) → auto-approved → fulfilled
```

---

## 5. Data & Database Design

### 5.1 Data Requirements

- All data must be tenant-isolated via a `tenantId` foreign key on every entity
- Patient Health IDs must be globally unique across all tenants
- All clinical data (EMR, lab results, prescriptions) must be versioned — no hard deletes
- Stock movements must be immutable — corrections are new records, not edits
- Audit log entries must be immutable
- All timestamps stored in UTC; displayed in Africa/Addis_Ababa (UTC+3)
- Amharic text stored as UTF-8; all name fields support both Latin and Ethiopic scripts

### 5.2 Entity List

| Entity | Description |
|---|---|
| Tenant | A hospital workspace |
| User | A staff member or patient account |
| UserTenantRole | Junction: user ↔ tenant ↔ role |
| Patient | A registered patient |
| Visit | A single OPD or inpatient encounter |
| OPDTicket | A queue ticket for a visit |
| Appointment | A scheduled future visit |
| VitalSigns | Vitals recorded per visit |
| ClinicalNote | Doctor/nurse notes per visit |
| Diagnosis | ICD-10 coded diagnosis per visit |
| Allergy | Patient allergy record |
| LabOrder | A lab test ordered for a visit |
| LabResult | Result values for a lab order |
| Prescription | A medication order per visit |
| PrescriptionLine | Individual drug line within a prescription |
| InventoryItem | A drug or supply item |
| InventoryLocation | A physical storage location |
| InventoryBatch | A lot/batch of an item |
| LocationStock | Current qty of an item at a location |
| StockMovement | Immutable record of every stock change |
| ConsumptionRecord | Monthly consumption per item |
| Supplier | A drug/supply supplier |
| Requisition | A purchase/RRF requisition |
| RequisitionLine | Individual item line in a requisition |
| CycleCount | A physical stock count session |
| CycleCountLine | Per-item count within a cycle count |
| Invoice | A billing invoice for a visit |
| InvoiceLine | Individual charge line on an invoice |
| CBHIClaim | A CBHI insurance claim |
| FeeWaiver | A fee waiver request |
| Referral | An inter-facility patient referral |
| Bed | A physical hospital bed |
| Admission | A patient's inpatient stay |
| Notification | An in-app notification |
| AuditLog | Immutable record of all system actions |
| FeatureFlag | Per-tenant feature toggle |

### 5.3 Database Technology

| Environment | Database | Rationale |
|---|---|---|
| Production | PostgreSQL 16 | ACID compliance, row-level security, JSON support, mature ecosystem |
| Local development | SQLite | Zero-config, file-based, Prisma supports both |
| ORM | Prisma 6 | Type-safe queries, migration management, multi-schema support |
| Connection pooling | PgBouncer / Prisma Accelerate | Required for serverless deployment on Vercel |
| Offline cache | IndexedDB (via Dexie.js) | Browser-native, supports complex queries, works offline |

### 5.4 ER Diagram

```
TENANT
  │
  ├──< USER_TENANT_ROLE >── USER
  │
  ├──< PATIENT
  │       │
  │       ├──< VISIT
  │       │       ├──< OPD_TICKET
  │       │       ├──< VITAL_SIGNS
  │       │       ├──< CLINICAL_NOTE
  │       │       ├──< DIAGNOSIS
  │       │       ├──< LAB_ORDER >──< LAB_RESULT
  │       │       ├──< PRESCRIPTION >──< PRESCRIPTION_LINE
  │       │       ├──< INVOICE >──< INVOICE_LINE
  │       │       │       └──< CBHI_CLAIM
  │       │       │       └──< FEE_WAIVER
  │       │       └──< REFERRAL
  │       ├──< ALLERGY
  │       └──< ADMISSION >── BED
  │
  ├──< INVENTORY_ITEM
  │       ├──< INVENTORY_BATCH >──< LOCATION_STOCK
  │       ├──< STOCK_MOVEMENT
  │       ├──< CONSUMPTION_RECORD
  │       └──< REQUISITION_LINE
  │
  ├──< INVENTORY_LOCATION
  │       └──< LOCATION_STOCK
  │
  ├──< SUPPLIER >──< REQUISITION >──< REQUISITION_LINE
  │
  ├──< CYCLE_COUNT >──< CYCLE_COUNT_LINE
  │
  ├──< APPOINTMENT
  ├──< NOTIFICATION
  ├──< AUDIT_LOG
  └──< FEATURE_FLAG
```

### 5.5 Database Schema

```prisma
// ─── TENANT ───────────────────────────────────────────────
model Tenant {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  region      String
  facilityType String
  plan        String   @default("basic")
  status      String   @default("active") // active | suspended | trial
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  users         UserTenantRole[]
  patients      Patient[]
  inventoryItems InventoryItem[]
  locations     InventoryLocation[]
  suppliers     Supplier[]
  requisitions  Requisition[]
  cycleCounts   CycleCount[]
  appointments  Appointment[]
  notifications Notification[]
  auditLogs     AuditLog[]
  featureFlags  FeatureFlag[]
  beds          Bed[]
}

// ─── USER ─────────────────────────────────────────────────
model User {
  id            String   @id @default(cuid())
  name          String
  email         String   @unique
  passwordHash  String
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  tenantRoles   UserTenantRole[]
  sessions      Session[]
}

model UserTenantRole {
  id        String   @id @default(cuid())
  userId    String
  tenantId  String
  role      String   // Hospital Admin | Doctor | Nurse | etc.
  status    String   @default("active")
  user      User     @relation(fields: [userId], references: [id])
  tenant    Tenant   @relation(fields: [tenantId], references: [id])

  @@unique([userId, tenantId])
}

// ─── PATIENT ──────────────────────────────────────────────
model Patient {
  id          String   @id @default(cuid())
  tenantId    String
  healthId    String   @unique
  nameEn      String
  nameAm      String?
  dob         DateTime
  sex         String   // M | F
  phone       String?
  kebele      String?
  cbhiStatus  Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  tenant      Tenant   @relation(fields: [tenantId], references: [id])
  visits      Visit[]
  allergies   Allergy[]
  appointments Appointment[]
  admissions  Admission[]
}

// ─── VISIT ────────────────────────────────────────────────
model Visit {
  id          String   @id @default(cuid())
  tenantId    String
  patientId   String
  type        String   // opd | inpatient | emergency
  status      String   @default("open") // open | completed | cancelled
  openedAt    DateTime @default(now())
  closedAt    DateTime?

  patient     Patient  @relation(fields: [patientId], references: [id])
  ticket      OPDTicket?
  vitals      VitalSigns[]
  notes       ClinicalNote[]
  diagnoses   Diagnosis[]
  labOrders   LabOrder[]
  prescriptions Prescription[]
  invoice     Invoice?
  referrals   Referral[]
}

// ─── OPD TICKET ───────────────────────────────────────────
model OPDTicket {
  id          String   @id @default(cuid())
  tenantId    String
  visitId     String   @unique
  ticketNumber String
  status      String   @default("waiting")
  issuedAt    DateTime @default(now())
  calledAt    DateTime?
  completedAt DateTime?
  waitMinutes Int?

  visit       Visit    @relation(fields: [visitId], references: [id])
}

// ─── VITAL SIGNS ──────────────────────────────────────────
model VitalSigns {
  id          String   @id @default(cuid())
  visitId     String
  recordedBy  String
  recordedAt  DateTime @default(now())
  bpSystolic  Int?
  bpDiastolic Int?
  heartRate   Int?
  temperature Float?
  spo2        Int?
  weight      Float?
  height      Float?
  rr          Int?

  visit       Visit    @relation(fields: [visitId], references: [id])
}

// ─── CLINICAL NOTE ────────────────────────────────────────
model ClinicalNote {
  id            String   @id @default(cuid())
  visitId       String
  authorId      String
  noteType      String   // consultation | nursing | progress
  chiefComplaint String?
  history       String?
  examination   String?
  assessment    String?
  plan          String?
  createdAt     DateTime @default(now())
  version       Int      @default(1)

  visit         Visit    @relation(fields: [visitId], references: [id])
}

// ─── DIAGNOSIS ────────────────────────────────────────────
model Diagnosis {
  id          String   @id @default(cuid())
  visitId     String
  icdCode     String
  description String
  notes       String?
  diagnosedBy String
  diagnosedAt DateTime @default(now())

  visit       Visit    @relation(fields: [visitId], references: [id])
}

// ─── LAB ORDER ────────────────────────────────────────────
model LabOrder {
  id          String   @id @default(cuid())
  tenantId    String
  visitId     String
  orderedBy   String
  testName    String
  priority    String   @default("routine") // routine | urgent
  indication  String?
  status      String   @default("pending")
  orderedAt   DateTime @default(now())

  visit       Visit    @relation(fields: [visitId], references: [id])
  result      LabResult?
  invoiceLine InvoiceLine?
}

model LabResult {
  id            String   @id @default(cuid())
  labOrderId    String   @unique
  enteredBy     String
  enteredAt     DateTime @default(now())
  results       Json     // [{name, value, unit, refRange, flag}]
  interpretation String?

  labOrder      LabOrder @relation(fields: [labOrderId], references: [id])
}

// ─── PRESCRIPTION ─────────────────────────────────────────
model Prescription {
  id          String   @id @default(cuid())
  tenantId    String
  visitId     String
  prescribedBy String
  status      String   @default("pending")
  createdAt   DateTime @default(now())

  visit       Visit    @relation(fields: [visitId], references: [id])
  lines       PrescriptionLine[]
}

model PrescriptionLine {
  id             String   @id @default(cuid())
  prescriptionId String
  itemId         String
  dose           String
  frequency      String
  durationDays   Int
  status         String   @default("pending")
  dispensedAt    DateTime?
  dispensedBy    String?
  batchId        String?

  prescription   Prescription @relation(fields: [prescriptionId], references: [id])
  item           InventoryItem @relation(fields: [itemId], references: [id])
  invoiceLine    InvoiceLine?
}

// ─── INVENTORY ITEM ───────────────────────────────────────
model InventoryItem {
  id          String   @id @default(cuid())
  tenantId    String
  name        String
  nameAm      String?
  category    String
  uomBase     String
  uomBox      String?
  uomBoxQty   Int      @default(1)
  rop         Int
  maxLevel    Int
  supplierId  String?
  status      String   @default("ok")
  createdAt   DateTime @default(now())

  tenant      Tenant   @relation(fields: [tenantId], references: [id])
  supplier    Supplier? @relation(fields: [supplierId], references: [id])
  batches     InventoryBatch[]
  locationStock LocationStock[]
  movements   StockMovement[]
  consumption ConsumptionRecord[]
  prescriptionLines PrescriptionLine[]
  requisitionLines RequisitionLine[]
}

// ─── INVENTORY BATCH ──────────────────────────────────────
model InventoryBatch {
  id           String   @id @default(cuid())
  itemId       String
  lotNumber    String
  qty          Int
  expiryDate   DateTime
  receivedDate DateTime
  supplierId   String?
  locationId   String
  status       String   @default("active")

  item         InventoryItem @relation(fields: [itemId], references: [id])
  location     InventoryLocation @relation(fields: [locationId], references: [id])
}

// ─── INVENTORY LOCATION ───────────────────────────────────
model InventoryLocation {
  id        String   @id @default(cuid())
  tenantId  String
  name      String
  type      String   // pharmacy | ward | or | emergency
  managerId String?

  tenant    Tenant   @relation(fields: [tenantId], references: [id])
  stock     LocationStock[]
  batches   InventoryBatch[]
  movements StockMovement[]
}

// ─── LOCATION STOCK ───────────────────────────────────────
model LocationStock {
  id         String @id @default(cuid())
  itemId     String
  locationId String
  qty        Int    @default(0)

  item       InventoryItem     @relation(fields: [itemId], references: [id])
  location   InventoryLocation @relation(fields: [locationId], references: [id])

  @@unique([itemId, locationId])
}

// ─── STOCK MOVEMENT ───────────────────────────────────────
model StockMovement {
  id           String   @id @default(cuid())
  tenantId     String
  itemId       String
  batchId      String?
  type         String   // received | dispensed | transferred | expired | damaged | correction
  qty          Int      // positive = in, negative = out
  locationId   String
  toLocationId String?
  reference    String?
  note         String?
  userId       String
  createdAt    DateTime @default(now())

  item         InventoryItem     @relation(fields: [itemId], references: [id])
  location     InventoryLocation @relation(fields: [locationId], references: [id])
}

// ─── CONSUMPTION RECORD ───────────────────────────────────
model ConsumptionRecord {
  id       String @id @default(cuid())
  itemId   String
  tenantId String
  month    String // YYYY-MM
  qty      Int

  item     InventoryItem @relation(fields: [itemId], references: [id])

  @@unique([itemId, tenantId, month])
}

// ─── SUPPLIER ─────────────────────────────────────────────
model Supplier {
  id        String @id @default(cuid())
  tenantId  String
  name      String
  fullName  String?
  contact   String?
  phone     String?
  leadDays  Int    @default(14)

  tenant    Tenant @relation(fields: [tenantId], references: [id])
  items     InventoryItem[]
  requisitions Requisition[]
}

// ─── REQUISITION ──────────────────────────────────────────
model Requisition {
  id           String   @id @default(cuid())
  tenantId     String
  supplierId   String
  type         String   @default("routine") // routine | emergency
  status       String   @default("pending")
  requestedBy  String
  approvedBy   String?
  justification String?
  createdAt    DateTime @default(now())

  tenant       Tenant   @relation(fields: [tenantId], references: [id])
  supplier     Supplier @relation(fields: [supplierId], references: [id])
  lines        RequisitionLine[]
}

model RequisitionLine {
  id             String @id @default(cuid())
  requisitionId  String
  itemId         String
  qtyRequested   Int
  unitCost       Float?

  requisition    Requisition   @relation(fields: [requisitionId], references: [id])
  item           InventoryItem @relation(fields: [itemId], references: [id])
}

// ─── CYCLE COUNT ──────────────────────────────────────────
model CycleCount {
  id          String   @id @default(cuid())
  tenantId    String
  conductedBy String
  status      String   @default("in-progress")
  date        DateTime @default(now())

  tenant      Tenant   @relation(fields: [tenantId], references: [id])
  lines       CycleCountLine[]
}

model CycleCountLine {
  id              String  @id @default(cuid())
  cycleCountId    String
  itemId          String
  systemQty       Int
  countedQty      Int
  variance        Int
  varianceReason  String?
  lossCategory    String?

  cycleCount      CycleCount @relation(fields: [cycleCountId], references: [id])
}

// ─── INVOICE ──────────────────────────────────────────────
model Invoice {
  id        String   @id @default(cuid())
  tenantId  String
  visitId   String   @unique
  patientId String
  status    String   @default("pending")
  total     Float    @default(0)
  createdAt DateTime @default(now())
  paidAt    DateTime?

  visit     Visit    @relation(fields: [visitId], references: [id])
  lines     InvoiceLine[]
  cbhiClaim CBHIClaim?
  feeWaiver FeeWaiver?
}

model InvoiceLine {
  id          String  @id @default(cuid())
  invoiceId   String
  description String
  qty         Int     @default(1)
  unitPrice   Float
  total       Float
  labOrderId  String? @unique
  rxLineId    String? @unique

  invoice     Invoice @relation(fields: [invoiceId], references: [id])
  labOrder    LabOrder? @relation(fields: [labOrderId], references: [id])
  rxLine      PrescriptionLine? @relation(fields: [rxLineId], references: [id])
}

// ─── CBHI CLAIM ───────────────────────────────────────────
model CBHIClaim {
  id              String   @id @default(cuid())
  tenantId        String
  invoiceId       String   @unique
  patientId       String
  amount          Float
  status          String   @default("submitted")
  submittedAt     DateTime @default(now())
  resolvedAt      DateTime?
  rejectionReason String?

  invoice         Invoice  @relation(fields: [invoiceId], references: [id])
}

// ─── FEE WAIVER ───────────────────────────────────────────
model FeeWaiver {
  id          String   @id @default(cuid())
  tenantId    String
  invoiceId   String   @unique
  patientId   String
  amount      Float
  reason      String
  requestedBy String
  approvedBy  String?
  status      String   @default("pending")
  createdAt   DateTime @default(now())

  invoice     Invoice  @relation(fields: [invoiceId], references: [id])
}

// ─── REFERRAL ─────────────────────────────────────────────
model Referral {
  id              String   @id @default(cuid())
  tenantId        String
  visitId         String
  patientId       String
  fromFacility    String
  toFacility      String
  reason          String
  clinicalSummary String
  urgency         String   @default("routine")
  type            String   // out | in
  status          String   @default("pending")
  createdBy       String
  confirmedBy     String?
  createdAt       DateTime @default(now())
  confirmedAt     DateTime?

  visit           Visit    @relation(fields: [visitId], references: [id])
}

// ─── BED & ADMISSION ──────────────────────────────────────
model Bed {
  id        String  @id @default(cuid())
  tenantId  String
  ward      String
  room      String
  status    String  @default("available")

  tenant    Tenant  @relation(fields: [tenantId], references: [id])
  admissions Admission[]
}

model Admission {
  id          String   @id @default(cuid())
  tenantId    String
  patientId   String
  bedId       String
  admittedAt  DateTime @default(now())
  dischargedAt DateTime?
  status      String   @default("active")

  patient     Patient  @relation(fields: [patientId], references: [id])
  bed         Bed      @relation(fields: [bedId], references: [id])
}

// ─── NOTIFICATION ─────────────────────────────────────────
model Notification {
  id        String   @id @default(cuid())
  tenantId  String
  userId    String
  type      String
  title     String
  body      String
  read      Boolean  @default(false)
  createdAt DateTime @default(now())

  tenant    Tenant   @relation(fields: [tenantId], references: [id])
}

// ─── AUDIT LOG ────────────────────────────────────────────
model AuditLog {
  id        String   @id @default(cuid())
  tenantId  String
  userId    String
  action    String
  entity    String
  entityId  String?
  metadata  Json?
  ipAddress String?
  createdAt DateTime @default(now())

  tenant    Tenant   @relation(fields: [tenantId], references: [id])
}

// ─── FEATURE FLAG ─────────────────────────────────────────
model FeatureFlag {
  id       String  @id @default(cuid())
  tenantId String
  flag     String
  enabled  Boolean @default(false)

  tenant   Tenant  @relation(fields: [tenantId], references: [id])

  @@unique([tenantId, flag])
}
```

---

## 6. System Architecture, Interfaces & UI

### 6.1 Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| Frontend framework | Next.js 15 (App Router) | SSR + client components, file-based routing, Vercel-native |
| UI language | TypeScript | End-to-end type safety with tRPC |
| Styling | Tailwind CSS | Utility-first, consistent design system, no runtime CSS |
| Component library | Custom nova-ui + shadcn/ui primitives | Lightweight, fully controlled |
| State management | React useState / useContext | Sufficient for module-scoped state; no global store needed in v1 |
| Server state | TanStack Query (React Query) | Cache, background refetch, optimistic updates |
| API layer | tRPC over Hono.js | Type-safe RPC, no REST boilerplate, shared types between client and server |
| Backend runtime | Node.js 20 (Hono.js) | Lightweight, edge-compatible, fast cold starts |
| ORM | Prisma 6 | Type-safe queries, migration management, multi-DB support |
| Database (prod) | PostgreSQL 16 | ACID, row-level security, JSON columns for flexible result data |
| Database (dev) | SQLite | Zero-config local development |
| Authentication | Better Auth | Session-based, multi-tenant aware, extensible |
| Offline storage | IndexedDB via Dexie.js | Browser-native, structured queries, works without network |
| File storage | AWS S3 / Cloudflare R2 | Referral letters, reports, exported documents |
| Deployment | Vercel (frontend) + Railway/Fly.io (backend) | Managed, auto-scaling, zero-downtime deploys |
| Monorepo tooling | Turborepo + pnpm workspaces | Shared packages (api, db, auth, ui, env) across apps |
| CI/CD | GitHub Actions | Lint, type-check, test, deploy on merge to main |

### 6.2 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENTS                              │
│                                                             │
│  ┌──────────────────┐    ┌──────────────────┐              │
│  │  Staff Web App   │    │  Patient Portal  │              │
│  │  (Next.js SSR)   │    │  (Next.js SSR)   │              │
│  │  /nova/*         │    │  /nova/patient/* │              │
│  └────────┬─────────┘    └────────┬─────────┘              │
│           │                       │                         │
│  ┌────────▼───────────────────────▼─────────┐              │
│  │         Service Worker + IndexedDB        │              │
│  │         (offline cache & sync queue)      │              │
│  └────────────────────┬──────────────────────┘              │
└───────────────────────┼─────────────────────────────────────┘
                        │ HTTPS / tRPC
┌───────────────────────▼─────────────────────────────────────┐
│                      API LAYER                              │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Hono.js + tRPC Router                  │   │
│  │                                                     │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐           │   │
│  │  │ Auth     │ │ Patient  │ │ Inventory│  ...       │   │
│  │  │ Router   │ │ Router   │ │ Router   │            │   │
│  │  └──────────┘ └──────────┘ └──────────┘           │   │
│  │                                                     │   │
│  │  Middleware: tenantId injection, RBAC, audit log   │   │
│  └─────────────────────────┬───────────────────────────┘   │
└────────────────────────────┼────────────────────────────────┘
                             │ Prisma ORM
┌────────────────────────────▼────────────────────────────────┐
│                     DATA LAYER                              │
│                                                             │
│  ┌──────────────────┐    ┌──────────────────┐              │
│  │   PostgreSQL 16  │    │   AWS S3 / R2    │              │
│  │   (primary DB)   │    │   (file storage) │              │
│  └──────────────────┘    └──────────────────┘              │
└─────────────────────────────────────────────────────────────┘
```

### 6.3 Application Architecture

**Monorepo structure:**
```
my-better-t-app/
├── apps/
│   ├── web/                  # Next.js frontend
│   │   └── src/
│   │       ├── app/
│   │       │   ├── nova/     # Staff app (all roles)
│   │       │   │   ├── layout.tsx        # Sidebar + topbar shell
│   │       │   │   ├── hospital-admin/
│   │       │   │   ├── reception/
│   │       │   │   ├── doctor/
│   │       │   │   ├── nurse/
│   │       │   │   ├── lab/
│   │       │   │   ├── pharmacy/
│   │       │   │   │   ├── inventory/
│   │       │   │   │   ├── receive/
│   │       │   │   │   ├── requisition/
│   │       │   │   │   ├── expiry/
│   │       │   │   │   ├── reconciliation/
│   │       │   │   │   ├── forecast/
│   │       │   │   │   └── locations/
│   │       │   │   ├── billing/
│   │       │   │   ├── referral/
│   │       │   │   ├── ward/
│   │       │   │   ├── nova-admin/
│   │       │   │   └── patient/          # Patient portal
│   │       │   │       ├── layout.tsx    # Mobile-first, bottom nav
│   │       │   │       ├── visits/
│   │       │   │       ├── prescriptions/
│   │       │   │       ├── results/
│   │       │   │       ├── appointments/
│   │       │   │       ├── cbhi/
│   │       │   │       ├── referrals/
│   │       │   │       └── id-card/
│   │       │   └── page.tsx  # Redirects to /nova
│   │       ├── components/
│   │       │   └── nova/
│   │       │       ├── nova-ui.tsx       # Shared UI primitives
│   │       │       ├── nova-sidebar.tsx
│   │       │       ├── nova-topbar.tsx
│   │       │       └── nova-role-context.tsx
│   │       └── lib/
│   │           ├── nova-mock-data.ts     # All mock data (pre-backend)
│   │           └── auth-client.ts
│   └── server/               # Hono.js API server
│       └── src/
│           ├── routers/      # tRPC routers per module
│           ├── context.ts    # Request context (session, tenantId)
│           └── index.ts      # tRPC init + middleware
└── packages/
    ├── api/                  # Shared tRPC router types
    ├── auth/                 # Better Auth configuration
    ├── db/                   # Prisma schema + client
    │   └── prisma/schema/
    │       ├── schema.prisma # Core models
    │       └── auth.prisma   # Auth models
    ├── ui/                   # Shared UI components
    ├── env/                  # Environment variable validation
    └── config/               # Shared TypeScript config
```

**Request lifecycle:**
```
1. Browser sends tRPC request with session cookie
2. Hono middleware validates session → extracts userId
3. Middleware resolves tenantId from subdomain or request header
4. Middleware loads UserTenantRole → extracts role
5. tRPC procedure checks role against required permission
6. Prisma query executes with tenantId filter on every table
7. Response returned; audit log entry written asynchronously
```

**Offline sync strategy:**
```
Online:  All reads/writes → server directly
         Service Worker caches GET responses in Cache API

Offline: Reads → served from IndexedDB cache
         Writes → queued in IndexedDB sync queue with:
                  { procedure, input, timestamp, retryCount }

Reconnect: Background sync fires
           Queue processed in order
           Conflicts resolved: server wins for clinical data,
           last-write-wins for non-clinical (vitals, notes)
           Failed items flagged for manual review
```

### 6.4 External Interfaces & APIs

| Interface | Direction | Protocol | Description |
|---|---|---|---|
| EPSA RRF Export | Outbound | File download (PDF/CSV) | Generates standard Report and Requisition Form for EPSA submission |
| DHIS2 Export | Outbound | File download (JSON/CSV) | Aggregate health data export compatible with DHIS2 import format |
| CBHI Scheme | Outbound | Manual / future API | Claim submission; v1 is file-based, v2 will use CBHI API when available |
| SMS Gateway | Outbound | REST (queued) | Appointment reminders, lab result notifications; gateway TBD |
| Email (SMTP) | Outbound | SMTP via Resend | Staff invitations, password reset, claim status notifications |
| YouTube embed | Inbound | iframe / img CDN | Video thumbnails and embeds on public landing page |
| QR Code | Internal | Browser-generated | Patient health ID QR codes generated client-side using qrcode.js |

### 6.5 UI Requirements

| ID | Requirement |
|---|---|
| UI-01 | Staff app shall use a fixed left sidebar (240px) + top bar layout on desktop |
| UI-02 | Staff app sidebar shall collapse to icon-only on screens < 1024px |
| UI-03 | Patient portal shall be mobile-first with max-width 420px and bottom tab navigation |
| UI-04 | All patient-facing text shall support English and Amharic; language toggle in header |
| UI-05 | Color system: teal-600 primary, slate-800 text, red-600 critical, amber-600 warning, emerald-600 success |
| UI-06 | All data tables shall support horizontal scroll on small screens |
| UI-07 | Forms shall show inline validation errors; required fields marked with asterisk |
| UI-08 | All destructive actions (delete, write-off, cancel) shall require a confirmation step |
| UI-09 | Loading states shall use skeleton screens, not spinners, for table and card content |
| UI-10 | Offline mode shall show a persistent amber banner: "You're offline — changes will sync when reconnected" |
| UI-11 | Critical stock and expiry alerts shall use red banners at the top of relevant pages |
| UI-12 | The queue board shall auto-refresh every 30 seconds without full page reload |
| UI-13 | All pages shall be accessible at WCAG 2.1 AA level |
| UI-14 | Font size minimum 14px for body text; 12px for labels and metadata |

### 6.6 User Flows & Wireframes

#### Flow 1: New patient OPD registration
```
Landing (/nova)
  └─ Log in (/nova/login)
       └─ Hospital Admin dashboard (/nova/hospital-admin)
            └─ [Switch role: Receptionist]
                 └─ Patient Registration (/nova/reception/register)
                      ├─ Search existing patient
                      │    └─ Found → issue ticket → Queue board
                      └─ New patient form
                           └─ Submit → Health ID generated → QR card
                                └─ Issue OPD ticket → Queue board (/nova/reception/queue)
```

#### Flow 2: Doctor consultation
```
Doctor queue (/nova/doctor)
  └─ Call next patient
       └─ Patient EMR (/nova/doctor/emr?patientId=P001)
            ├─ View history, vitals, allergies
            └─ New consultation (/nova/doctor/consultation)
                 ├─ Write note
                 ├─ Add diagnosis (ICD-10 search)
                 ├─ Order lab (/nova/doctor/lab-order)
                 ├─ Write prescription (/nova/doctor/prescription)
                 └─ Create referral (/nova/doctor/referral)
```

#### Flow 3: Pharmacy inventory replenishment
```
ROP Alerts (/nova/pharmacy/rop-alerts)
  └─ Critical item detected
       └─ Demand Forecast (/nova/pharmacy/forecast)
            └─ Confirm reorder quantity
                 └─ Requisition (/nova/pharmacy/requisition)
                      └─ Submit → Pending approval
                           └─ Hospital Admin approves
                                └─ Goods Receipt (/nova/pharmacy/receive)
                                     └─ Enter lot, expiry, qty
                                          └─ Stock updated → Inventory Ledger (/nova/pharmacy/inventory)
```

#### Flow 4: Patient portal self-service
```
Landing (/nova) → Patient portal link
  └─ Patient portal (/nova/patient)
       ├─ Dashboard: vitals, next appointment, active medications
       ├─ Appointments (/nova/patient/appointments)
       ├─ Lab results (/nova/patient/results)
       ├─ Medications (/nova/patient/prescriptions)
       ├─ CBHI status & claims (/nova/patient/cbhi)
       ├─ Referral tracking (/nova/patient/referrals)
       └─ Health ID card (/nova/patient/id-card)
```

---

## 7. Security & Non-Functional Requirements

### 7.1 Security

#### Authentication & Session Security

| ID | Requirement |
|---|---|
| SEC-01 | All passwords shall be hashed using bcrypt with a minimum cost factor of 12 |
| SEC-02 | Session tokens shall be cryptographically random (128-bit minimum entropy) |
| SEC-03 | Session cookies shall be HttpOnly, Secure, and SameSite=Strict |
| SEC-04 | All API endpoints shall require a valid session; unauthenticated requests return 401 |
| SEC-05 | Nova Admin accounts shall require TOTP-based 2FA |
| SEC-06 | Brute-force protection: 5 failed login attempts triggers a 15-minute lockout per IP |
| SEC-07 | Password reset tokens expire after 1 hour and are single-use |

#### Authorisation & Data Isolation

| ID | Requirement |
|---|---|
| SEC-08 | Every database query at the application layer shall include a tenantId filter |
| SEC-09 | tRPC middleware shall inject and validate tenantId on every procedure call |
| SEC-10 | Role-based access control shall be enforced server-side; client-side role checks are UI-only |
| SEC-11 | A user with role Doctor in Tenant A shall have zero access to Tenant B's data, even if they have an account there |
| SEC-12 | Patients in the patient portal can only read their own records; cross-patient access is architecturally blocked |
| SEC-13 | Nova Admin impersonation of a tenant shall be logged in both the platform audit log and the tenant's audit log |

#### Transport & Data Security

| ID | Requirement |
|---|---|
| SEC-14 | All traffic shall be encrypted via TLS 1.2 minimum; TLS 1.3 preferred |
| SEC-15 | HSTS headers shall be set with a minimum max-age of 1 year |
| SEC-16 | All API responses shall include: X-Content-Type-Options, X-Frame-Options, Content-Security-Policy headers |
| SEC-17 | Database connections shall use TLS; credentials stored in environment variables, never in code |
| SEC-18 | File uploads (referral letters, reports) shall be scanned for malware before storage |
| SEC-19 | S3/R2 buckets shall be private; files served via signed URLs with 1-hour expiry |

#### Clinical Data Security

| ID | Requirement |
|---|---|
| SEC-20 | EMR data is classified as sensitive health information; access is logged in the audit trail for every read |
| SEC-21 | Bulk data export (DHIS2, reports) shall require Hospital Admin role and is logged |
| SEC-22 | No patient PII shall appear in application logs, error messages, or URLs |
| SEC-23 | Database backups shall be encrypted at rest using AES-256 |
| SEC-24 | Backup retention: daily backups for 30 days, weekly for 12 months |

#### Input Validation & Injection Prevention

| ID | Requirement |
|---|---|
| SEC-25 | All user inputs shall be validated server-side using Zod schemas on every tRPC procedure |
| SEC-26 | Prisma ORM parameterises all queries; raw SQL is prohibited except in reviewed migration scripts |
| SEC-27 | File upload types shall be validated by MIME type and magic bytes, not file extension alone |
| SEC-28 | Rate limiting shall be applied to all public endpoints: 100 requests/minute per IP |

### 7.2 Performance

| ID | Requirement | Target |
|---|---|---|
| PERF-01 | Dashboard page initial load (logged-in user, warm cache) | < 2 seconds on 4G |
| PERF-02 | tRPC API response time for read procedures (p95) | < 300ms |
| PERF-03 | tRPC API response time for write procedures (p95) | < 500ms |
| PERF-04 | OPD queue board refresh (polling) | < 1 second round-trip |
| PERF-05 | Patient search by name or Health ID | < 500ms for up to 100,000 patients |
| PERF-06 | Inventory ledger page load with 500 items | < 2 seconds |
| PERF-07 | Report generation (monthly consumption, 12 months) | < 5 seconds |
| PERF-08 | Offline mode: page load from IndexedDB cache | < 500ms |
| PERF-09 | Database queries shall use indexes on: tenantId, patientId, visitId, itemId, createdAt on all high-read tables |
| PERF-10 | Connection pooling shall be configured to handle 100 concurrent connections per tenant |

### 7.3 Availability

| ID | Requirement |
|---|---|
| AVAIL-01 | System uptime SLA: 99.5% per calendar month (≤ 3.6 hours downtime/month) |
| AVAIL-02 | Planned maintenance windows shall be scheduled between 01:00–04:00 EAT and announced 48 hours in advance |
| AVAIL-03 | The system shall degrade gracefully: if the API is unreachable, the frontend shall serve cached data and queue writes |
| AVAIL-04 | Database failover shall be automatic with a recovery time objective (RTO) of < 5 minutes |
| AVAIL-05 | Recovery point objective (RPO): maximum 1 hour of data loss in a catastrophic failure scenario |
| AVAIL-06 | Health check endpoint (`/api/health`) shall respond within 200ms and be monitored every 60 seconds |
| AVAIL-07 | Incident response: P1 (system down) acknowledged within 15 minutes, resolved within 2 hours |

### 7.4 Scalability

| ID | Requirement |
|---|---|
| SCALE-01 | The system shall support up to 500 concurrent active users across all tenants without performance degradation |
| SCALE-02 | The multi-tenant architecture shall support up to 200 hospital tenants on shared infrastructure |
| SCALE-03 | A single tenant shall support up to 10,000 patient records and 500 daily visits without schema changes |
| SCALE-04 | The inventory module shall support up to 2,000 items per tenant and 50,000 stock movements per year |
| SCALE-05 | The application shall be horizontally scalable: adding API server instances shall increase throughput linearly |
| SCALE-06 | Database read replicas shall be used for report generation to avoid impacting transactional performance |
| SCALE-07 | Large tenants (Enterprise plan) shall be eligible for dedicated database instances |
| SCALE-08 | File storage (S3/R2) shall scale without capacity planning; no per-tenant storage limits in v1 |

### 7.5 Usability

| ID | Requirement |
|---|---|
| USE-01 | A new Receptionist with basic computer literacy shall be able to register a patient and issue an OPD ticket within 5 minutes of first use, with no training beyond a 10-minute onboarding video |
| USE-02 | All critical actions (dispense medication, submit CBHI claim, approve fee waiver) shall require no more than 3 clicks from the relevant dashboard |
| USE-03 | Error messages shall be written in plain language describing what went wrong and what the user should do next |
| USE-04 | The patient portal shall be usable on a low-end Android smartphone (2GB RAM, Chrome) |
| USE-05 | Amharic text shall render correctly on all supported browsers without requiring font installation |
| USE-06 | All forms shall auto-save drafts every 30 seconds to prevent data loss on accidental navigation |
| USE-07 | The system shall support keyboard navigation for all core workflows (WCAG 2.1 AA) |
| USE-08 | Colour alone shall never be the sole indicator of status; icons and text labels shall accompany all colour-coded states |
| USE-09 | The onboarding wizard shall allow a new hospital to complete workspace setup in under 15 minutes |
| USE-10 | In-app help tooltips shall be available on all non-obvious form fields |

### 7.6 Compatibility

| ID | Requirement |
|---|---|
| COMPAT-01 | Supported browsers: Chrome 110+, Firefox 110+, Edge 110+, Safari 16+ |
| COMPAT-02 | Patient portal shall be tested and functional on Chrome for Android 110+ |
| COMPAT-03 | Minimum screen resolution for staff app: 1280 × 720px |
| COMPAT-04 | Patient portal minimum screen width: 320px |
| COMPAT-05 | The system shall function on connections as slow as 1 Mbps for core workflows |
| COMPAT-06 | Offline mode shall be supported on Chrome and Edge (Service Worker support required) |
| COMPAT-07 | PDF exports shall be compatible with Adobe Acrobat Reader and standard browser PDF viewers |
| COMPAT-08 | DHIS2 export format shall conform to DHIS2 v2.38 import specification |
| COMPAT-09 | RRF export format shall conform to the EPSA standard requisition form layout |

### 7.7 Maintainability

| ID | Requirement |
|---|---|
| MAINT-01 | All code shall be written in TypeScript with strict mode enabled; no implicit `any` |
| MAINT-02 | Database schema changes shall be managed exclusively through Prisma migrations; no manual schema edits |
| MAINT-03 | Every tRPC procedure shall have a corresponding Zod input schema; no unvalidated inputs |
| MAINT-04 | Shared UI components shall live in the `packages/ui` package; no duplication across apps |
| MAINT-05 | Environment variables shall be validated at startup using the `packages/env` Zod schema; the app shall refuse to start with missing required variables |
| MAINT-06 | All API routes shall be covered by integration tests before merging to main |
| MAINT-07 | The codebase shall maintain a test coverage minimum of 70% on business logic (routers, workflows) |
| MAINT-08 | Dependency updates shall be automated via Dependabot with weekly PRs |
| MAINT-09 | Application logs shall be structured JSON, shipped to a centralised log aggregator (e.g. Axiom, Datadog) |
| MAINT-10 | Feature flags shall be used for all new modules; no module is enabled by default for existing tenants on deploy |
| MAINT-11 | The monorepo shall use Turborepo for build caching; a full clean build shall complete in under 3 minutes on CI |
| MAINT-12 | All public-facing API changes shall be versioned; breaking changes require a deprecation notice of at least 30 days |

---

## Document Control

| Version | Date | Author | Changes |
|---|---|---|---|
| 0.1 | Aug 2026 | Nova HMS Engineering | Initial draft — frontend prototype scope |
| 1.0 | Sep 2026 | Nova HMS Engineering | Full SRS — all 7 sections, complete schema, security requirements |

**Next review date:** December 2026  
**Document owner:** Nova HMS Engineering Team  
**Contact:** hello@novahms.et

---

*This document describes the intended system design for Nova HMS v1.0. Requirements marked as "v2" or "future" are noted in the relevant sections and are not binding for the initial release.*
