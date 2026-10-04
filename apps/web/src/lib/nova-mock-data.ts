// Nova HMS — all mock/dummy data used across the frontend prototype

export const ROLES = [
  "Organizational Admin",
  "Branch Admin",
  "Hospital Admin",
  "Receptionist",
  "Doctor",
  "Nurse",
  "Lab Technician",
  "Pharmacist",
  "Billing Officer",
  "Referral Coordinator",
  "Ward Manager",
  "Nova Admin",
] as const;

export type Role = (typeof ROLES)[number];

export const MOCK_USER = {
  name: "Dr. Tigist Alemu",
  role: "Doctor" as Role,
  hospital: "Debre Markos Referral Hospital",
  avatar: "TA",
};

export const HOSPITALS = [
  { id: "h1", name: "Debre Markos Referral Hospital", region: "Amhara", status: "active", plan: "Full Clinical", patients: 1240, staff: 87, since: "2024-01-15" },
  { id: "h2", name: "Jimma University Medical Center", region: "Oromia", status: "active", plan: "Enterprise Multi-Facility", patients: 3102, staff: 210, since: "2023-11-03" },
  { id: "h3", name: "Hawassa University Comprehensive", region: "Sidama", status: "trial", plan: "Basic OPD", patients: 340, staff: 32, since: "2026-08-01" },
  { id: "h4", name: "Gondar University Hospital", region: "Amhara", status: "active", plan: "Full Clinical", patients: 2180, staff: 145, since: "2024-03-22" },
  { id: "h5", name: "St. Paul's Hospital Millennium", region: "Addis Ababa", status: "active", plan: "Enterprise Multi-Facility", patients: 5400, staff: 380, since: "2023-09-10" },
  { id: "h6", name: "Adama General Hospital", region: "Oromia", status: "suspended", plan: "Basic OPD", patients: 0, staff: 28, since: "2025-02-14" },
];

export const PATIENTS = [
  { id: "P001", name: "Abebe Kebede", nameAm: "አበበ ከበደ", dob: "1985-03-12", sex: "M", phone: "0911234567", healthId: "DMH-00123", kebele: "Kebele 03", cbhi: true, visits: 4, lastVisit: "2026-08-28" },
  { id: "P002", name: "Tigist Worku", nameAm: "ትግስት ወርቁ", dob: "1992-07-22", sex: "F", phone: "0922345678", healthId: "DMH-00456", kebele: "Kebele 07", cbhi: false, visits: 2, lastVisit: "2026-09-01" },
  { id: "P003", name: "Mulugeta Haile", nameAm: "ሙሉጌታ ሃይሌ", dob: "1975-11-04", sex: "M", phone: "0933456789", healthId: "DMH-00789", kebele: "Kebele 01", cbhi: true, visits: 8, lastVisit: "2026-09-03" },
  { id: "P004", name: "Birtukan Tadesse", nameAm: "ብርቱካን ታደሰ", dob: "2001-01-30", sex: "F", phone: "0944567890", healthId: "DMH-01012", kebele: "Kebele 12", cbhi: true, visits: 1, lastVisit: "2026-09-05" },
  { id: "P005", name: "Dawit Bekele", nameAm: "ዳዊት በቀለ", dob: "1968-09-15", sex: "M", phone: "0955678901", healthId: "DMH-01345", kebele: "Kebele 05", cbhi: false, visits: 12, lastVisit: "2026-08-20" },
  { id: "P006", name: "Selamawit Girma", nameAm: "ሰላማዊት ግርማ", dob: "1998-05-08", sex: "F", phone: "0966789012", healthId: "DMH-01678", kebele: "Kebele 09", cbhi: true, visits: 3, lastVisit: "2026-09-04" },
];

export const OPD_QUEUE = [
  { ticket: "A-001", patientId: "P001", name: "Abebe Kebede", waitMins: 5, status: "being-seen", doctor: "Dr. Yonas Tesfaye" },
  { ticket: "A-002", patientId: "P002", name: "Tigist Worku", waitMins: 18, status: "waiting", doctor: null },
  { ticket: "A-003", patientId: "P003", name: "Mulugeta Haile", waitMins: 32, status: "waiting", doctor: null },
  { ticket: "A-004", patientId: "P004", name: "Birtukan Tadesse", waitMins: 0, status: "done", doctor: "Dr. Tigist Alemu" },
  { ticket: "A-005", patientId: "P005", name: "Dawit Bekele", waitMins: 45, status: "waiting", doctor: null },
  { ticket: "A-006", patientId: "P006", name: "Selamawit Girma", waitMins: 58, status: "urgent", doctor: null },
];

export const STAFF = [
  { id: "S01", name: "Dr. Yonas Tesfaye", role: "Doctor", dept: "OPD", status: "active", email: "yonas@dmrh.gov.et" },
  { id: "S02", name: "Nurse Mekdes Alemu", role: "Nurse", dept: "Ward A", status: "active", email: "mekdes@dmrh.gov.et" },
  { id: "S03", name: "Ato Girma Tadesse", role: "Receptionist", dept: "OPD", status: "active", email: "girma@dmrh.gov.et" },
  { id: "S04", name: "W/ro Hiwot Bekele", role: "Billing Officer", dept: "Finance", status: "active", email: "hiwot@dmrh.gov.et" },
  { id: "S05", name: "Dr. Tigist Alemu", role: "Doctor", dept: "Internal Medicine", status: "active", email: "tigist@dmrh.gov.et" },
  { id: "S06", name: "Lab Tech Bereket Haile", role: "Lab Technician", dept: "Laboratory", status: "active", email: "bereket@dmrh.gov.et" },
  { id: "S07", name: "Pharm. Selam Worku", role: "Pharmacist", dept: "Pharmacy", status: "on-leave", email: "selam@dmrh.gov.et" },
  { id: "S08", name: "Ato Solomon Kebede", role: "Referral Coordinator", dept: "OPD", status: "active", email: "solomon@dmrh.gov.et" },
];

export const DEPARTMENTS = [
  { id: "D01", name: "Outpatient Department (OPD)", nameAm: "ውጪ ሕሙማን ክፍል", head: "Dr. Yonas Tesfaye", staff: 12, rooms: 6 },
  { id: "D02", name: "Internal Medicine", nameAm: "የውስጥ ደዌ", head: "Dr. Tigist Alemu", staff: 8, rooms: 4 },
  { id: "D03", name: "Pediatrics", nameAm: "ህጻናት ክፍል", head: "Dr. Abebe Girma", staff: 6, rooms: 3 },
  { id: "D04", name: "Surgery", nameAm: "ቀዶ ሕክምና", head: "Dr. Mulatu Bekele", staff: 10, rooms: 2 },
  { id: "D05", name: "Laboratory", nameAm: "ላቦራቶሪ", head: "Bereket Haile", staff: 5, rooms: 2 },
  { id: "D06", name: "Pharmacy", nameAm: "ፋርማሲ", head: "Selam Worku", staff: 4, rooms: 1 },
  { id: "D07", name: "Radiology", nameAm: "ራዲዮሎጂ", head: "Dr. Hana Alemu", staff: 3, rooms: 2 },
];

export const LAB_ORDERS = [
  { id: "LO001", patientId: "P001", patient: "Abebe Kebede", test: "CBC (Complete Blood Count)", orderedBy: "Dr. Tigist Alemu", ordered: "2026-09-05 08:30", status: "pending", priority: "routine" },
  { id: "LO002", patientId: "P006", patient: "Selamawit Girma", test: "Malaria RDT", orderedBy: "Dr. Yonas Tesfaye", ordered: "2026-09-05 09:10", status: "in-progress", priority: "urgent" },
  { id: "LO003", patientId: "P003", patient: "Mulugeta Haile", test: "Fasting Blood Sugar", orderedBy: "Dr. Tigist Alemu", ordered: "2026-09-05 07:50", status: "completed", priority: "routine" },
  { id: "LO004", patientId: "P002", patient: "Tigist Worku", test: "Urinalysis", orderedBy: "Dr. Yonas Tesfaye", ordered: "2026-09-05 10:00", status: "pending", priority: "routine" },
];

export const PRESCRIPTIONS = [
  { id: "RX001", patientId: "P001", patient: "Abebe Kebede", drug: "Amoxicillin 500mg", dose: "1 tablet", freq: "3x daily", days: 7, prescribedBy: "Dr. Tigist Alemu", date: "2026-09-05", status: "pending" },
  { id: "RX002", patientId: "P003", patient: "Mulugeta Haile", drug: "Metformin 500mg", dose: "1 tablet", freq: "2x daily", days: 30, prescribedBy: "Dr. Tigist Alemu", date: "2026-09-05", status: "dispensed" },
  { id: "RX003", patientId: "P006", patient: "Selamawit Girma", drug: "Artemether/Lumefantrine 80/480mg", dose: "4 tablets", freq: "2x daily", days: 3, prescribedBy: "Dr. Yonas Tesfaye", date: "2026-09-05", status: "pending" },
];

export const INVENTORY = [
  { id: "INV001", name: "Amoxicillin 500mg caps", category: "Antibiotic", qty: 1200, unit: "caps", rop: 500, maxLevel: 2000, expiry: "2027-06-30", status: "ok", supplier: "EPSA", uomBase: "cap", uomBox: "box", uomBoxQty: 100 },
  { id: "INV002", name: "Metformin 500mg tabs", category: "Antidiabetic", qty: 380, unit: "tabs", rop: 400, maxLevel: 1500, expiry: "2027-03-15", status: "low", supplier: "Addis Pharma", uomBase: "tab", uomBox: "strip", uomBoxQty: 10 },
  { id: "INV003", name: "Artemether/Lumefantrine 80/480mg", category: "Antimalarial", qty: 92, unit: "tabs", rop: 200, maxLevel: 800, expiry: "2026-12-01", status: "critical", supplier: "EPSA", uomBase: "tab", uomBox: "pack", uomBoxQty: 24 },
  { id: "INV004", name: "Paracetamol 500mg tabs", category: "Analgesic", qty: 3400, unit: "tabs", rop: 1000, maxLevel: 5000, expiry: "2028-01-20", status: "ok", supplier: "EPSA", uomBase: "tab", uomBox: "bottle", uomBoxQty: 1000 },
  { id: "INV005", name: "ORS Sachets", category: "Rehydration", qty: 250, unit: "sachets", rop: 300, maxLevel: 1000, expiry: "2027-09-10", status: "low", supplier: "UNICEF Supply", uomBase: "sachet", uomBox: "box", uomBoxQty: 50 },
  { id: "INV006", name: "IV Normal Saline 1L", category: "IV Fluid", qty: 45, unit: "bags", rop: 80, maxLevel: 300, expiry: "2026-11-30", status: "critical", supplier: "Addis Pharma", uomBase: "bag", uomBox: "carton", uomBoxQty: 12 },
  { id: "INV007", name: "Ciprofloxacin 500mg tabs", category: "Antibiotic", qty: 640, unit: "tabs", rop: 300, maxLevel: 1200, expiry: "2027-08-15", status: "ok", supplier: "EPSA", uomBase: "tab", uomBox: "strip", uomBoxQty: 10 },
  { id: "INV008", name: "Diazepam 5mg/ml Injection", category: "Sedative", qty: 28, unit: "amps", rop: 50, maxLevel: 200, expiry: "2026-10-20", status: "critical", supplier: "EPSA", uomBase: "amp", uomBox: "box", uomBoxQty: 10 },
  { id: "INV009", name: "Oxytocin 10IU Injection", category: "Obstetric", qty: 120, unit: "amps", rop: 100, maxLevel: 400, expiry: "2027-02-28", status: "ok", supplier: "UNFPA Supply", uomBase: "amp", uomBox: "box", uomBoxQty: 10 },
  { id: "INV010", name: "Surgical Gloves (M)", category: "Consumable", qty: 800, unit: "pairs", rop: 500, maxLevel: 2000, expiry: "2029-12-31", status: "ok", supplier: "Local Medical", uomBase: "pair", uomBox: "box", uomBoxQty: 100 },
];

export const LOCATIONS = [
  { id: "LOC001", name: "Main Pharmacy Store", type: "pharmacy", manager: "Pharm. Selam Worku" },
  { id: "LOC002", name: "Ward A Sub-Store", type: "ward", manager: "Nurse Mekdes Alemu" },
  { id: "LOC003", name: "Ward B Sub-Store", type: "ward", manager: "Nurse Hana Girma" },
  { id: "LOC004", name: "Operating Theatre Store", type: "or", manager: "Dr. Mulatu Bekele" },
  { id: "LOC005", name: "Emergency Store", type: "emergency", manager: "Dr. Yonas Tesfaye" },
  { id: "LOC006", name: "Maternity Store", type: "ward", manager: "Nurse Tigist Bekele" },
];

export const LOCATION_STOCK: { locationId: string; itemId: string; qty: number }[] = [
  { locationId: "LOC001", itemId: "INV001", qty: 800 },
  { locationId: "LOC001", itemId: "INV002", qty: 200 },
  { locationId: "LOC001", itemId: "INV003", qty: 60 },
  { locationId: "LOC001", itemId: "INV004", qty: 2000 },
  { locationId: "LOC001", itemId: "INV005", qty: 150 },
  { locationId: "LOC001", itemId: "INV006", qty: 30 },
  { locationId: "LOC001", itemId: "INV007", qty: 400 },
  { locationId: "LOC001", itemId: "INV008", qty: 18 },
  { locationId: "LOC001", itemId: "INV009", qty: 80 },
  { locationId: "LOC001", itemId: "INV010", qty: 500 },
  { locationId: "LOC002", itemId: "INV001", qty: 200 },
  { locationId: "LOC002", itemId: "INV004", qty: 800 },
  { locationId: "LOC002", itemId: "INV006", qty: 10 },
  { locationId: "LOC002", itemId: "INV009", qty: 20 },
  { locationId: "LOC003", itemId: "INV001", qty: 120 },
  { locationId: "LOC003", itemId: "INV004", qty: 400 },
  { locationId: "LOC003", itemId: "INV005", qty: 60 },
  { locationId: "LOC004", itemId: "INV008", qty: 8 },
  { locationId: "LOC004", itemId: "INV010", qty: 200 },
  { locationId: "LOC004", itemId: "INV006", qty: 5 },
  { locationId: "LOC005", itemId: "INV003", qty: 32 },
  { locationId: "LOC005", itemId: "INV006", qty: 0 },
  { locationId: "LOC005", itemId: "INV008", qty: 2 },
  { locationId: "LOC006", itemId: "INV009", qty: 20 },
  { locationId: "LOC006", itemId: "INV005", qty: 40 },
];

export const BATCHES = [
  { id: "BAT001", itemId: "INV001", lotNumber: "AMX-2024-0881", qty: 700, expiry: "2027-06-30", receivedDate: "2024-11-10", supplier: "EPSA", locationId: "LOC001" },
  { id: "BAT002", itemId: "INV001", lotNumber: "AMX-2025-0112", qty: 500, expiry: "2028-03-15", receivedDate: "2025-02-20", supplier: "EPSA", locationId: "LOC001" },
  { id: "BAT003", itemId: "INV002", lotNumber: "MET-2024-0445", qty: 180, expiry: "2027-03-15", receivedDate: "2024-09-05", supplier: "Addis Pharma", locationId: "LOC001" },
  { id: "BAT004", itemId: "INV002", lotNumber: "MET-2024-0890", qty: 200, expiry: "2026-11-20", receivedDate: "2024-12-01", supplier: "Addis Pharma", locationId: "LOC001" },
  { id: "BAT005", itemId: "INV003", lotNumber: "AL-2025-0033", qty: 60, expiry: "2026-12-01", receivedDate: "2025-01-15", supplier: "EPSA", locationId: "LOC001" },
  { id: "BAT006", itemId: "INV003", lotNumber: "AL-2025-0034", qty: 32, expiry: "2026-10-15", receivedDate: "2025-01-15", supplier: "EPSA", locationId: "LOC005" },
  { id: "BAT007", itemId: "INV004", lotNumber: "PCM-2024-1200", qty: 2000, expiry: "2028-01-20", receivedDate: "2024-08-01", supplier: "EPSA", locationId: "LOC001" },
  { id: "BAT008", itemId: "INV004", lotNumber: "PCM-2025-0300", qty: 1400, expiry: "2028-06-10", receivedDate: "2025-03-10", supplier: "EPSA", locationId: "LOC001" },
  { id: "BAT009", itemId: "INV006", lotNumber: "NS-2025-0088", qty: 45, expiry: "2026-11-30", receivedDate: "2025-04-20", supplier: "Addis Pharma", locationId: "LOC001" },
  { id: "BAT010", itemId: "INV008", lotNumber: "DZP-2024-0220", qty: 28, expiry: "2026-10-20", receivedDate: "2024-10-05", supplier: "EPSA", locationId: "LOC001" },
  { id: "BAT011", itemId: "INV009", lotNumber: "OXT-2025-0055", qty: 120, expiry: "2027-02-28", receivedDate: "2025-05-01", supplier: "UNFPA Supply", locationId: "LOC001" },
];

export const SUPPLIERS = [
  { id: "SUP001", name: "EPSA", fullName: "Ethiopian Pharmaceutical Supply Agency", contact: "epsa@gov.et", phone: "011-551-7400", leadDays: 14 },
  { id: "SUP002", name: "Addis Pharma", fullName: "Addis Pharmaceutical Factory", contact: "orders@addispharma.et", phone: "011-434-2200", leadDays: 7 },
  { id: "SUP003", name: "UNICEF Supply", fullName: "UNICEF Supply Division", contact: "supply@unicef.org", phone: "+45-35-27-35-27", leadDays: 30 },
  { id: "SUP004", name: "UNFPA Supply", fullName: "UNFPA Procurement Services", contact: "procurement@unfpa.org", phone: "+45-45-33-44-00", leadDays: 21 },
  { id: "SUP005", name: "Local Medical", fullName: "Local Medical Supplies PLC", contact: "info@localmed.et", phone: "011-662-3300", leadDays: 3 },
];

export const STOCK_MOVEMENTS: {
  id: string; itemId: string; batchId?: string; type: string;
  qty: number; locationId: string; toLocationId?: string;
  date: string; user: string; note: string; reference?: string;
}[] = [
  { id: "MOV001", itemId: "INV001", batchId: "BAT001", type: "received", qty: 700, locationId: "LOC001", date: "2024-11-10", user: "Pharm. Selam Worku", note: "EPSA delivery", reference: "PO-2024-0441" },
  { id: "MOV002", itemId: "INV001", batchId: "BAT001", type: "dispensed", qty: -50, locationId: "LOC001", date: "2026-09-01", user: "Pharm. Selam Worku", note: "Rx RX001", reference: "RX001" },
  { id: "MOV003", itemId: "INV001", batchId: "BAT001", type: "transferred", qty: -200, locationId: "LOC001", toLocationId: "LOC002", date: "2026-08-15", user: "Pharm. Selam Worku", note: "Ward A monthly top-up" },
  { id: "MOV004", itemId: "INV002", batchId: "BAT004", type: "received", qty: 200, locationId: "LOC001", date: "2024-12-01", user: "Pharm. Selam Worku", note: "Addis Pharma delivery", reference: "PO-2024-0512" },
  { id: "MOV005", itemId: "INV002", batchId: "BAT003", type: "dispensed", qty: -20, locationId: "LOC001", date: "2026-09-05", user: "Pharm. Selam Worku", note: "Rx RX002", reference: "RX002" },
  { id: "MOV006", itemId: "INV003", batchId: "BAT005", type: "received", qty: 60, locationId: "LOC001", date: "2025-01-15", user: "Pharm. Selam Worku", note: "EPSA emergency delivery", reference: "PO-2025-0033" },
  { id: "MOV007", itemId: "INV003", batchId: "BAT005", type: "dispensed", qty: -24, locationId: "LOC001", date: "2026-09-05", user: "Pharm. Selam Worku", note: "Rx RX003", reference: "RX003" },
  { id: "MOV008", itemId: "INV006", batchId: "BAT009", type: "received", qty: 60, locationId: "LOC001", date: "2025-04-20", user: "Pharm. Selam Worku", note: "Addis Pharma delivery", reference: "PO-2025-0188" },
  { id: "MOV009", itemId: "INV006", batchId: "BAT009", type: "expired", qty: -15, locationId: "LOC001", date: "2026-08-01", user: "Pharm. Selam Worku", note: "Batch expired — written off" },
  { id: "MOV010", itemId: "INV004", batchId: "BAT007", type: "received", qty: 2000, locationId: "LOC001", date: "2024-08-01", user: "Pharm. Selam Worku", note: "EPSA quarterly delivery", reference: "PO-2024-0300" },
  { id: "MOV011", itemId: "INV004", batchId: "BAT007", type: "transferred", qty: -800, locationId: "LOC001", toLocationId: "LOC002", date: "2026-08-01", user: "Pharm. Selam Worku", note: "Ward A top-up" },
  { id: "MOV012", itemId: "INV004", batchId: "BAT007", type: "transferred", qty: -400, locationId: "LOC001", toLocationId: "LOC003", date: "2026-08-01", user: "Pharm. Selam Worku", note: "Ward B top-up" },
  { id: "MOV013", itemId: "INV008", batchId: "BAT010", type: "received", qty: 30, locationId: "LOC001", date: "2024-10-05", user: "Pharm. Selam Worku", note: "EPSA delivery", reference: "PO-2024-0388" },
  { id: "MOV014", itemId: "INV008", batchId: "BAT010", type: "damaged", qty: -2, locationId: "LOC001", date: "2026-07-10", user: "Pharm. Selam Worku", note: "Broken ampoules on shelf check" },
  { id: "MOV015", itemId: "INV005", type: "received", qty: 300, locationId: "LOC001", date: "2025-06-01", user: "Pharm. Selam Worku", note: "UNICEF donation", reference: "GRANT-2025-ORS" },
  { id: "MOV016", itemId: "INV005", type: "dispensed", qty: -50, locationId: "LOC001", date: "2026-08-20", user: "Pharm. Selam Worku", note: "OPD bulk dispense" },
];

export const REQUISITIONS = [
  {
    id: "REQ001", date: "2026-09-05", requestedBy: "Pharm. Selam Worku", approvedBy: null,
    status: "pending", type: "routine", supplier: "EPSA",
    items: [
      { itemId: "INV003", name: "Artemether/Lumefantrine 80/480mg", qtyRequested: 500, unit: "tabs", unitCost: 12.5 },
      { itemId: "INV006", name: "IV Normal Saline 1L", qtyRequested: 120, unit: "bags", unitCost: 45 },
      { itemId: "INV008", name: "Diazepam 5mg/ml Injection", qtyRequested: 100, unit: "amps", unitCost: 18 },
    ],
  },
  {
    id: "REQ002", date: "2026-09-03", requestedBy: "Pharm. Selam Worku", approvedBy: "Hospital Admin",
    status: "approved", type: "emergency", supplier: "Addis Pharma",
    items: [
      { itemId: "INV002", name: "Metformin 500mg tabs", qtyRequested: 1000, unit: "tabs", unitCost: 2.8 },
      { itemId: "INV005", name: "ORS Sachets", qtyRequested: 500, unit: "sachets", unitCost: 5 },
    ],
  },
  {
    id: "REQ003", date: "2026-08-20", requestedBy: "Pharm. Selam Worku", approvedBy: "Hospital Admin",
    status: "fulfilled", type: "routine", supplier: "EPSA",
    items: [
      { itemId: "INV001", name: "Amoxicillin 500mg caps", qtyRequested: 1000, unit: "caps", unitCost: 3.5 },
      { itemId: "INV004", name: "Paracetamol 500mg tabs", qtyRequested: 2000, unit: "tabs", unitCost: 1.2 },
    ],
  },
];

export const CYCLE_COUNTS = [
  {
    id: "CC001", date: "2026-09-01", conductedBy: "Pharm. Selam Worku", status: "completed",
    items: [
      { itemId: "INV001", name: "Amoxicillin 500mg caps", systemQty: 1250, countedQty: 1200, variance: -50, varianceReason: "Unrecorded dispensing" },
      { itemId: "INV003", name: "Artemether/Lumefantrine 80/480mg", systemQty: 92, countedQty: 92, variance: 0, varianceReason: null },
      { itemId: "INV006", name: "IV Normal Saline 1L", systemQty: 50, countedQty: 45, variance: -5, varianceReason: "Damaged bags disposed" },
    ],
  },
  {
    id: "CC002", date: "2026-08-01", conductedBy: "Pharm. Selam Worku", status: "completed",
    items: [
      { itemId: "INV002", name: "Metformin 500mg tabs", systemQty: 400, countedQty: 380, variance: -20, varianceReason: "Unrecorded dispense" },
      { itemId: "INV004", name: "Paracetamol 500mg tabs", systemQty: 3400, countedQty: 3400, variance: 0, varianceReason: null },
      { itemId: "INV008", name: "Diazepam 5mg/ml Injection", systemQty: 30, countedQty: 28, variance: -2, varianceReason: "Broken ampoules" },
    ],
  },
];

export const CONSUMPTION_HISTORY: { itemId: string; month: string; qty: number }[] = [
  { itemId: "INV001", month: "2026-03", qty: 320 },
  { itemId: "INV001", month: "2026-04", qty: 290 },
  { itemId: "INV001", month: "2026-05", qty: 410 },
  { itemId: "INV001", month: "2026-06", qty: 380 },
  { itemId: "INV001", month: "2026-07", qty: 350 },
  { itemId: "INV001", month: "2026-08", qty: 420 },
  { itemId: "INV002", month: "2026-03", qty: 80 },
  { itemId: "INV002", month: "2026-04", qty: 95 },
  { itemId: "INV002", month: "2026-05", qty: 110 },
  { itemId: "INV002", month: "2026-06", qty: 100 },
  { itemId: "INV002", month: "2026-07", qty: 120 },
  { itemId: "INV002", month: "2026-08", qty: 130 },
  { itemId: "INV003", month: "2026-03", qty: 48 },
  { itemId: "INV003", month: "2026-04", qty: 72 },
  { itemId: "INV003", month: "2026-05", qty: 120 },
  { itemId: "INV003", month: "2026-06", qty: 180 },
  { itemId: "INV003", month: "2026-07", qty: 210 },
  { itemId: "INV003", month: "2026-08", qty: 240 },
  { itemId: "INV004", month: "2026-03", qty: 600 },
  { itemId: "INV004", month: "2026-04", qty: 580 },
  { itemId: "INV004", month: "2026-05", qty: 620 },
  { itemId: "INV004", month: "2026-06", qty: 590 },
  { itemId: "INV004", month: "2026-07", qty: 610 },
  { itemId: "INV004", month: "2026-08", qty: 640 },
  { itemId: "INV006", month: "2026-03", qty: 20 },
  { itemId: "INV006", month: "2026-04", qty: 18 },
  { itemId: "INV006", month: "2026-05", qty: 25 },
  { itemId: "INV006", month: "2026-06", qty: 22 },
  { itemId: "INV006", month: "2026-07", qty: 30 },
  { itemId: "INV006", month: "2026-08", qty: 28 },
];

export const BILLING_INVOICES = [
  { id: "INV-2026-0891", patientId: "P001", patient: "Abebe Kebede", date: "2026-09-05", services: ["OPD Consultation", "CBC Test", "Amoxicillin 500mg x7"], total: 185, cbhi: true, status: "paid" },
  { id: "INV-2026-0892", patientId: "P002", patient: "Tigist Worku", date: "2026-09-05", services: ["OPD Consultation", "Urinalysis"], total: 120, cbhi: false, status: "pending" },
  { id: "INV-2026-0893", patientId: "P006", patient: "Selamawit Girma", date: "2026-09-05", services: ["Emergency Consultation", "Malaria RDT", "AL Tabs x3days"], total: 210, cbhi: true, status: "pending" },
  { id: "INV-2026-0890", patientId: "P005", patient: "Dawit Bekele", date: "2026-09-04", services: ["Follow-up Visit", "Blood Sugar Test"], total: 95, cbhi: false, status: "waiver-requested" },
];

export const CBHI_CLAIMS = [
  { id: "CBHI-2026-0441", patient: "Abebe Kebede", invoiceId: "INV-2026-0891", amount: 185, submitted: "2026-09-05", status: "submitted" },
  { id: "CBHI-2026-0440", patient: "Birtukan Tadesse", invoiceId: "INV-2026-0880", amount: 320, submitted: "2026-09-04", status: "approved" },
  { id: "CBHI-2026-0439", patient: "Mulugeta Haile", invoiceId: "INV-2026-0875", amount: 140, submitted: "2026-09-03", status: "rejected" },
];

export const REFERRALS = [
  { id: "REF001", patient: "Mulugeta Haile", from: "Debre Markos Referral Hospital", to: "Tikur Anbessa Specialized Hospital", reason: "Cardiac evaluation", date: "2026-09-04", status: "in-transit", type: "out" },
  { id: "REF002", patient: "Meseret Arega", from: "Motta Primary Hospital", to: "Debre Markos Referral Hospital", reason: "High-risk obstetric case", date: "2026-09-05", status: "arrived", type: "in" },
  { id: "REF003", patient: "Yohannes Desta", from: "Debre Markos Referral Hospital", to: "Gondar University Hospital", reason: "Neurosurgery consult", date: "2026-09-03", status: "pending", type: "out" },
];

export const BEDS = [
  { id: "B01", ward: "Ward A", room: "101", status: "occupied", patient: "Mulugeta Haile", since: "2026-09-03" },
  { id: "B02", ward: "Ward A", room: "101", status: "occupied", patient: "Dawit Bekele", since: "2026-09-04" },
  { id: "B03", ward: "Ward A", room: "102", status: "available", patient: null, since: null },
  { id: "B04", ward: "Ward A", room: "102", status: "maintenance", patient: null, since: null },
  { id: "B05", ward: "Ward B", room: "201", status: "occupied", patient: "Selamawit Girma", since: "2026-09-05" },
  { id: "B06", ward: "Ward B", room: "201", status: "available", patient: null, since: null },
  { id: "B07", ward: "Ward B", room: "202", status: "available", patient: null, since: null },
  { id: "B08", ward: "Maternity", room: "301", status: "occupied", patient: "Birtukan Tadesse", since: "2026-09-05" },
];

export const NOTIFICATIONS = [
  { id: "N1", type: "in-app", title: "Lab result ready", body: "CBC for Abebe Kebede is ready.", time: "5 min ago", read: false },
  { id: "N2", type: "email", title: "CBHI claim approved", body: "Claim CBHI-2026-0440 approved. ETB 320.", time: "1 hr ago", read: false },
  { id: "N3", type: "sms-queued", title: "Appointment reminder queued", body: "SMS queued for Tigist Worku — will send when online.", time: "2 hrs ago", read: true },
  { id: "N4", type: "in-app", title: "Low stock alert", body: "Artemether/Lumefantrine below reorder point.", time: "3 hrs ago", read: true },
  { id: "N5", type: "email", title: "Referral arrived", body: "Patient Meseret Arega has arrived from Motta Primary Hospital.", time: "4 hrs ago", read: true },
];

export const AUDIT_LOG = [
  { id: "AL001", user: "Dr. Tigist Alemu", action: "Viewed patient record", target: "P003 — Mulugeta Haile", time: "2026-09-05 09:42", ip: "192.168.1.14" },
  { id: "AL002", user: "Ato Girma Tadesse", action: "Registered new patient", target: "P006 — Selamawit Girma", time: "2026-09-05 08:15", ip: "192.168.1.8" },
  { id: "AL003", user: "W/ro Hiwot Bekele", action: "Created invoice", target: "INV-2026-0893", time: "2026-09-05 10:05", ip: "192.168.1.22" },
  { id: "AL004", user: "Lab Tech Bereket Haile", action: "Entered lab result", target: "LO003 — Mulugeta Haile CBC", time: "2026-09-05 07:55", ip: "192.168.1.30" },
  { id: "AL005", user: "Pharm. Selam Worku", action: "Dispensed medication", target: "RX002 — Mulugeta Haile", time: "2026-09-05 08:40", ip: "192.168.1.18" },
];

export const FEE_WAIVERS = [
  { id: "FW001", patient: "Dawit Bekele", invoiceId: "INV-2026-0890", amount: 95, reason: "Indigent patient — no income", requestedBy: "Ato Girma Tadesse", date: "2026-09-04", status: "pending" },
  { id: "FW002", patient: "Almaz Yimer", invoiceId: "INV-2026-0870", amount: 230, reason: "Chronic illness hardship", requestedBy: "W/ro Hiwot Bekele", date: "2026-09-03", status: "approved" },
];

export const APPOINTMENTS = [
  { id: "APT001", patient: "Abebe Kebede", patientId: "P001", doctor: "Dr. Tigist Alemu", dept: "Internal Medicine", date: "2026-09-08", time: "09:00", status: "scheduled" },
  { id: "APT002", patient: "Tigist Worku", patientId: "P002", doctor: "Dr. Yonas Tesfaye", dept: "OPD", date: "2026-09-06", time: "10:30", status: "scheduled" },
  { id: "APT003", patient: "Dawit Bekele", patientId: "P005", doctor: "Dr. Tigist Alemu", dept: "Internal Medicine", date: "2026-09-10", time: "11:00", status: "scheduled" },
];

export const VITALS = [
  { date: "2026-09-05", bp: "130/85", hr: 88, temp: 37.2, spo2: 97, weight: 72 },
  { date: "2026-08-28", bp: "128/82", hr: 82, temp: 36.9, spo2: 98, weight: 71.5 },
  { date: "2026-07-15", bp: "135/88", hr: 90, temp: 37.0, spo2: 96, weight: 73 },
];

export const DIAGNOSES = [
  { date: "2026-09-05", icd: "J06.9", description: "Acute upper respiratory infection", notes: "Mild pharyngitis. 7-day Amoxicillin course prescribed.", doctor: "Dr. Tigist Alemu" },
  { date: "2026-08-28", icd: "E11.9", description: "Type 2 Diabetes Mellitus", notes: "FBS 8.4 mmol/L. Continue Metformin, dietary advice given.", doctor: "Dr. Tigist Alemu" },
];
