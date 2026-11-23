export interface AssessmentField {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "multiselect" | "textarea";
  category: string;
  options?: string[];
  placeholder?: string;
  unit?: string;
  defaultValue?: any;
  helpText?: string;
}

export interface QuickDiagnosis {
  icd: string;
  name: string;
}

export interface QuickLabTest {
  code: string;
  name: string;
  category: string;
}

export interface DepartmentConfig {
  id: string;
  name: string;
  code: string;
  badgeColor: string;
  bannerTitle: string;
  iconName: string;
  defaultRoom: string;
  assessmentFields: AssessmentField[];
  quickDiagnoses: QuickDiagnosis[];
  quickLabTests: QuickLabTest[];
}

export const DEPARTMENT_CONFIGS: Record<string, DepartmentConfig> = {
  general_opd: {
    id: "general_opd",
    name: "General OPD & Internal Medicine",
    code: "OPD",
    badgeColor: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800",
    bannerTitle: "General Outpatient & Internal Medicine Clinic",
    iconName: "Stethoscope",
    defaultRoom: "Room 102 — General OPD",
    assessmentFields: [
      {
        key: "chronicDisease",
        label: "Chronic Disease Profile",
        type: "select",
        category: "History & Risk",
        options: ["None", "Hypertension Stage 1", "Hypertension Stage 2", "Type 2 Diabetes", "Asthma / COPD", "Ischemic Heart Disease", "Chronic Kidney Disease"],
        defaultValue: "None",
      },
      {
        key: "bpClassification",
        label: "Blood Pressure Category",
        type: "select",
        category: "Specialty Assessment",
        options: ["Optimal (<120/80)", "Prehypertension (120-139 / 80-89)", "Stage 1 HTN (140-159 / 90-99)", "Stage 2 HTN (≥160 / ≥100)", "Hypertensive Urgency (≥180/120)"],
        defaultValue: "Optimal (<120/80)",
      },
      {
        key: "bloodGlucose",
        label: "Blood Glucose (Fasting or Random)",
        type: "number",
        category: "Specialty Assessment",
        unit: "mg/dL",
        placeholder: "e.g. 110",
      },
      {
        key: "lifestyleAdvice",
        label: "Dietary & Lifestyle Counseling",
        type: "textarea",
        category: "Care Plan",
        placeholder: "e.g. Low sodium DASH diet, regular aerobic exercise, smoking cessation advised.",
      },
    ],
    quickDiagnoses: [
      { icd: "I10", name: "Essential Primary Hypertension" },
      { icd: "E11.9", name: "Type 2 Diabetes Mellitus" },
      { icd: "J06.9", name: "Acute Upper Respiratory Infection" },
      { icd: "K29.7", name: "Gastritis / Dyspepsia" },
      { icd: "A09", name: "Infectious Gastroenteritis" },
      { icd: "N39.0", name: "Urinary Tract Infection" },
      { icd: "B54", name: "Unspecified Malaria" },
      { icd: "A01.0", name: "Typhoid Fever" },
      { icd: "M54.5", name: "Low Back Pain" },
      { icd: "J18.9", name: "Community-Acquired Pneumonia" },
    ],
    quickLabTests: [
      { code: "LAB_CBC", name: "Complete Blood Count (CBC)", category: "Hematology" },
      { code: "LAB_BS", name: "Fasting Blood Sugar (FBS)", category: "Biochemistry" },
      { code: "LAB_LIPID", name: "Lipid Profile Panel", category: "Biochemistry" },
      { code: "LAB_RFT", name: "Renal Function Test (Creatinine/BUN)", category: "Biochemistry" },
      { code: "LAB_URINE", name: "Urinalysis Routine", category: "Microscopy" },
      { code: "LAB_MALARIA", name: "Malaria Blood Film / RDT", category: "Parasitology" },
    ],
  },

  pediatrics: {
    id: "pediatrics",
    name: "Pediatrics & Child Health",
    code: "PED",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800",
    bannerTitle: "Pediatric Clinic & Child Developmental Health",
    iconName: "HeartPulse",
    defaultRoom: "Room 205 — Pediatrics Suite",
    assessmentFields: [
      {
        key: "ageCategory",
        label: "Pediatric Age Group",
        type: "select",
        category: "Vitals & Milestones",
        options: ["Neonate (<28 days)", "Infant (1–12 months)", "Toddler (1–3 years)", "Child (4–11 years)", "Adolescent (12+ years)"],
        defaultValue: "Child (4–11 years)",
      },
      {
        key: "muac",
        label: "Mid-Upper Arm Circumference (MUAC)",
        type: "number",
        category: "Vitals & Milestones",
        unit: "cm",
        placeholder: "e.g. 13.5",
        helpText: "Normal: >12.5 cm | MAM: 11.5–12.5 cm | SAM: <11.5 cm",
      },
      {
        key: "weightPercentile",
        label: "Weight-for-Age Growth",
        type: "select",
        category: "Vitals & Milestones",
        options: ["Normal Growth (15th–85th percentile)", "Mild Underweight (3rd–15th)", "Severe Underweight (<3rd percentile)", "Overweight (>85th percentile)"],
        defaultValue: "Normal Growth (15th–85th percentile)",
      },
      {
        key: "immunizationStatus",
        label: "EPI Immunization Status",
        type: "select",
        category: "Specialty Assessment",
        options: ["Fully Vaccinated for Age", "Partially Vaccinated / Defaulter", "Not Vaccinated", "Pending BCG / Pentavalent / Measles"],
        defaultValue: "Fully Vaccinated for Age",
      },
      {
        key: "infantFeeding",
        label: "Feeding Mode",
        type: "select",
        category: "Specialty Assessment",
        options: ["Exclusive Breastfeeding (<6 months)", "Complementary Feeding (Breast + Solids)", "Formula / Cow's Milk", "Family Diet"],
        defaultValue: "Family Diet",
      },
      {
        key: "dehydrationLevel",
        label: "IMNCI Dehydration Grade",
        type: "select",
        category: "Specialty Assessment",
        options: ["No Dehydration (Active, moist mouth)", "Some Dehydration (Restless, thirsty)", "Severe Dehydration (Lethargic, skin pinch >2s)"],
        defaultValue: "No Dehydration (Active, moist mouth)",
      },
      {
        key: "milestones",
        label: "Developmental Milestones",
        type: "select",
        category: "Specialty Assessment",
        options: ["Age-Appropriate Milestones Met", "Gross Motor Delay", "Speech & Language Delay", "Social Interaction Delay", "Global Delay"],
        defaultValue: "Age-Appropriate Milestones Met",
      },
    ],
    quickDiagnoses: [
      { icd: "J20.9", name: "Acute Bronchiolitis in Children" },
      { icd: "J05.0", name: "Acute Laryngotracheitis (Croup)" },
      { icd: "A08.4", name: "Viral Gastroenteritis with Dehydration" },
      { icd: "E43", name: "Severe Acute Malnutrition (SAM)" },
      { icd: "E55.0", name: "Active Nutritional Rickets" },
      { icd: "P59.9", name: "Neonatal Hyperbilirubinemia (Jaundice)" },
      { icd: "H66.9", name: "Acute Otitis Media" },
      { icd: "J45.9", name: "Pediatric Bronchial Asthma" },
      { icd: "B05.9", name: "Measles without Complication" },
    ],
    quickLabTests: [
      { code: "LAB_CBC", name: "Pediatric CBC with Platelets", category: "Hematology" },
      { code: "LAB_STOOL", name: "Stool Wet Mount / Ova & Parasites", category: "Parasitology" },
      { code: "LAB_BILI", name: "Total & Direct Bilirubin", category: "Biochemistry" },
      { code: "LAB_CRP", name: "C-Reactive Protein (CRP)", category: "Serology" },
      { code: "LAB_MALARIA", name: "Malaria Blood Film", category: "Parasitology" },
    ],
  },

  ob_gyn: {
    id: "ob_gyn",
    name: "OB/GYN & Maternal Health",
    code: "OB/GYN",
    badgeColor: "bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/50 dark:text-pink-300 dark:border-pink-800",
    bannerTitle: "Obstetrics, Gynecology & Antenatal Care",
    iconName: "Activity",
    defaultRoom: "Room 208 — Women's Health Clinic",
    assessmentFields: [
      {
        key: "gpal",
        label: "Obstetric History (GPAL)",
        type: "text",
        category: "Obstetric Profile",
        placeholder: "e.g. G2 P1 A0 L1",
        defaultValue: "G1 P0 A0 L0",
        helpText: "Gravida, Para, Abortions, Living Children",
      },
      {
        key: "lmpDate",
        label: "Last Menstrual Period (LMP)",
        type: "text",
        category: "Obstetric Profile",
        placeholder: "YYYY-MM-DD or e.g. 12 weeks ago",
      },
      {
        key: "gestationalAge",
        label: "Gestational Age (weeks)",
        type: "number",
        category: "Obstetric Profile",
        unit: "wks",
        placeholder: "e.g. 28",
      },
      {
        key: "fundalHeight",
        label: "Fundal Height",
        type: "number",
        category: "Specialty Assessment",
        unit: "cm",
        placeholder: "e.g. 28",
      },
      {
        key: "fetalHeartRate",
        label: "Fetal Heart Rate (FHR)",
        type: "number",
        category: "Specialty Assessment",
        unit: "bpm",
        placeholder: "e.g. 142",
        helpText: "Normal FHR range: 120–160 bpm",
      },
      {
        key: "fetalPresentation",
        label: "Fetal Presentation / Lie",
        type: "select",
        category: "Specialty Assessment",
        options: ["Cephalic / Vertex (Normal)", "Breech Presentation", "Transverse Lie", "Oblique Lie", "Not Applicable (Early Gestation)"],
        defaultValue: "Cephalic / Vertex (Normal)",
      },
      {
        key: "ancRiskLevel",
        label: "Antenatal Risk Classification",
        type: "select",
        category: "Specialty Assessment",
        options: ["Low Risk — Routine ANC", "High Risk — Preeclampsia / Gestational HTN", "High Risk — Gestational Diabetes (GDM)", "Previous Cesarean Section Scar", "Multiple Gestation (Twins)", "Placenta Previa / Antepartum Hemorrhage"],
        defaultValue: "Low Risk — Routine ANC",
      },
      {
        key: "pelvicExam",
        label: "Pelvic / Speculum Exam Notes",
        type: "textarea",
        category: "Specialty Assessment",
        placeholder: "Cervix status, discharge appearance, membranes intact/ruptured, tenderness…",
      },
    ],
    quickDiagnoses: [
      { icd: "Z34.8", name: "Normal Antenatal Supervision" },
      { icd: "O14.9", name: "Pre-eclampsia (Mild / Moderate)" },
      { icd: "O21.0", name: "Hyperemesis Gravidarum (NVP)" },
      { icd: "N73.9", name: "Pelvic Inflammatory Disease (PID)" },
      { icd: "O20.0", name: "Threatened Abortion / Early Bleeding" },
      { icd: "O24.4", name: "Gestational Diabetes Mellitus" },
      { icd: "N76.0", name: "Acute Vaginitis / Candidiasis" },
      { icd: "O60.0", name: "Preterm Labor without Delivery" },
    ],
    quickLabTests: [
      { code: "LAB_ANC_PROFILE", name: "ANC Panel (CBC, Blood Group, Rh, VDRL, HIV, HBsAg)", category: "Antenatal" },
      { code: "LAB_URINE_PROT", name: "Urinary Protein / Dipstick (Preeclampsia Screen)", category: "Microscopy" },
      { code: "LAB_OGTT", name: "Oral Glucose Tolerance Test (OGTT)", category: "Biochemistry" },
      { code: "LAB_HCG", name: "Beta-hCG Serum Quantitative", category: "Serology" },
      { code: "LAB_VAGINAL_SWAB", name: "High Vaginal Swab (HVS) Wet Mount", category: "Microbiology" },
    ],
  },

  dental: {
    id: "dental",
    name: "Dental Clinic & Oral Surgery",
    code: "DENT",
    badgeColor: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/50 dark:text-cyan-300 dark:border-cyan-800",
    bannerTitle: "Dental Operatory & Oral Health Suite",
    iconName: "Sparkles",
    defaultRoom: "Room 105 — Dental Suite",
    assessmentFields: [
      {
        key: "affectedTeeth",
        label: "Affected Tooth Number(s) — FDI System",
        type: "text",
        category: "Dental Chart",
        placeholder: "e.g. 16, 26 (UR6, UL6) or 36, 46",
        helpText: "Upper Right: 18-11 | Upper Left: 21-28 | Lower Left: 31-38 | Lower Right: 41-48",
      },
      {
        key: "toothCondition",
        label: "Primary Tooth Pathology",
        type: "select",
        category: "Dental Chart",
        options: ["Dental Caries (Enamel / Dentin)", "Acute Irreversible Pulpitis", "Chronic Periapical Abscess", "Fractured Crown / Trauma", "Retained Root Fragment", "Impacted Third Molar (Wisdom Tooth)", "Attrition / Severe Tooth Wear", "Failed Restoration"],
        defaultValue: "Dental Caries (Enamel / Dentin)",
      },
      {
        key: "gingivalHealth",
        label: "Gingival & Periodontal Index",
        type: "select",
        category: "Specialty Assessment",
        options: ["Healthy Pink Gingiva (Normal)", "Mild Marginal Gingivitis", "Moderate Gingivitis with Bleeding on Probing", "Chronic Periodontitis (Pocket >4mm)", "Acute Necrotizing Ulcerative Gingivitis"],
        defaultValue: "Mild Marginal Gingivitis",
      },
      {
        key: "calculusGrade",
        label: "Plaque & Calculus Deposit",
        type: "select",
        category: "Specialty Assessment",
        options: ["Class 0: Clean / No Calculus", "Class 1: Supragingival Calculus Only", "Class 2: Subgingival Calculus Deposits", "Class 3: Heavy Circumferential Deposits"],
        defaultValue: "Class 1: Supragingival Calculus Only",
      },
      {
        key: "plannedProcedure",
        label: "Planned Dental Procedure",
        type: "select",
        category: "Procedure & Plan",
        options: ["Scaling & Root Planing (Ultrasonic)", "Composite Resin Light-Cure Filling", "Glass Ionomer Cement (GIC) Restoration", "Simple Closed Tooth Extraction", "Surgical Transalveolar Extraction", "Root Canal Therapy (RCT Step 1 - Extirpation)", "Pulpotomy / Pulp Capping", "Temporary Dressing / Sedative Filling"],
        defaultValue: "Composite Resin Light-Cure Filling",
      },
      {
        key: "localAnesthesia",
        label: "Local Anesthesia Administered",
        type: "text",
        category: "Procedure & Plan",
        placeholder: "e.g. Lidocaine 2% with Adrenaline 1:100k, 1.8ml cartridge, IAN block",
        defaultValue: "Lidocaine 2% with Adrenaline 1:100,000, 1.8ml",
      },
    ],
    quickDiagnoses: [
      { icd: "K02.9", name: "Dental Caries (Cavity)" },
      { icd: "K04.0", name: "Acute Irreversible Pulpitis" },
      { icd: "K04.7", name: "Periapical Abscess without Sinus" },
      { icd: "K05.1", name: "Chronic Marginal Gingivitis" },
      { icd: "K01.1", name: "Impacted Mandibular Third Molar" },
      { icd: "K05.3", name: "Chronic Periodontitis" },
      { icd: "K08.1", name: "Partial Tooth Loss / Missing Teeth" },
      { icd: "K03.0", name: "Severe Tooth Attrition / Bruxism" },
    ],
    quickLabTests: [
      { code: "PROC_DENTAL_XRAY", name: "Intraoral Periapical X-Ray (IOPA)", category: "Radiology" },
      { code: "PROC_OPG", name: "Orthopantomogram (OPG Panoramic X-Ray)", category: "Radiology" },
      { code: "LAB_CBC_COAG", name: "CBC & Bleeding / Clotting Time (Pre-Extraction)", category: "Hematology" },
    ],
  },

  ophthalmology: {
    id: "ophthalmology",
    name: "Ophthalmology / Eye Clinic",
    code: "EYE",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800",
    bannerTitle: "Eye Examination & Vision Assessment Suite",
    iconName: "Eye",
    defaultRoom: "Room 106 — Eye Clinic",
    assessmentFields: [
      {
        key: "visualAcuityOD",
        label: "Visual Acuity Right Eye (OD)",
        type: "select",
        category: "Visual Acuity",
        options: ["20/20 (Normal 6/6)", "20/25", "20/30", "20/40", "20/50", "20/70", "20/100", "20/200 (Legal Blindness)", "Counting Fingers at 1m", "Hand Motion", "Light Perception Only", "No Light Perception"],
        defaultValue: "20/20 (Normal 6/6)",
      },
      {
        key: "visualAcuityOS",
        label: "Visual Acuity Left Eye (OS)",
        type: "select",
        category: "Visual Acuity",
        options: ["20/20 (Normal 6/6)", "20/25", "20/30", "20/40", "20/50", "20/70", "20/100", "20/200 (Legal Blindness)", "Counting Fingers at 1m", "Hand Motion", "Light Perception Only", "No Light Perception"],
        defaultValue: "20/20 (Normal 6/6)",
      },
      {
        key: "iopOD",
        label: "Intraocular Pressure OD (Right)",
        type: "number",
        category: "Tonometry",
        unit: "mmHg",
        placeholder: "e.g. 16",
        helpText: "Normal IOP: 10–21 mmHg",
      },
      {
        key: "iopOS",
        label: "Intraocular Pressure OS (Left)",
        type: "number",
        category: "Tonometry",
        unit: "mmHg",
        placeholder: "e.g. 17",
      },
      {
        key: "anteriorSegment",
        label: "Slit Lamp Anterior Segment",
        type: "select",
        category: "Specialty Assessment",
        options: ["Clear Cornea & Anterior Chamber", "Immature Senile Cataract", "Mature / Hypermature Cataract", "Pterygium Crossing Limbus", "Corneal Ulcer / Keratitis", "Hyphema / Anterior Chamber Blood"],
        defaultValue: "Clear Cornea & Anterior Chamber",
      },
      {
        key: "fundoscopyExam",
        label: "Fundoscopy & Optic Nerve",
        type: "select",
        category: "Specialty Assessment",
        options: ["Normal Fundus (Cup-to-Disc 0.3, Sharp Margins)", "Glaucomatous Cupping (C/D > 0.6)", "Diabetic Retinopathy Microaneurysms", "Hypertensive Arteriolar Narrowing", "Macular Degeneration Drusen"],
        defaultValue: "Normal Fundus (Cup-to-Disc 0.3, Sharp Margins)",
      },
    ],
    quickDiagnoses: [
      { icd: "H25.9", name: "Senile Cataract (Unspecified)" },
      { icd: "H40.1", name: "Primary Open-Angle Glaucoma" },
      { icd: "H10.1", name: "Acute Allergic / Vernal Conjunctivitis" },
      { icd: "H52.1", name: "Myopia (Nearsightedness)" },
      { icd: "H11.0", name: "Pterygium" },
      { icd: "H16.0", name: "Corneal Ulcer" },
      { icd: "H10.0", name: "Mucopurulent Bacterial Conjunctivitis" },
    ],
    quickLabTests: [
      { code: "PROC_REFRACTION", name: "Autorefraction & Subjective Vision Test", category: "Optometry" },
      { code: "PROC_TONOMETRY", name: "Goldmann Applanation Tonometry", category: "Ophthalmology" },
      { code: "LAB_BS_EYE", name: "Fasting Blood Sugar (Diabetic Eye Check)", category: "Biochemistry" },
    ],
  },

  surgery: {
    id: "surgery",
    name: "General Surgery & Minor OR",
    code: "SURG",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800",
    bannerTitle: "Surgical Assessment & Minor Procedure Operatory",
    iconName: "ShieldCheck",
    defaultRoom: "Room 110 — Surgical Consult",
    assessmentFields: [
      {
        key: "surgicalUrgency",
        label: "Surgical Case Urgency",
        type: "select",
        category: "Pre-Op Evaluation",
        options: ["Elective Scheduled Procedure", "Urgent Case (within 24 hours)", "Emergency / Immediate Intervention"],
        defaultValue: "Elective Scheduled Procedure",
      },
      {
        key: "asaClass",
        label: "ASA Physical Status Score",
        type: "select",
        category: "Pre-Op Evaluation",
        options: ["ASA I: Normal Healthy Patient", "ASA II: Mild Systemic Disease (Controlled HTN/DM)", "ASA III: Severe Systemic Disease (Limits activity)", "ASA IV: Severe Disease In Constant Threat to Life", "ASA V: Moribund Patient"],
        defaultValue: "ASA I: Normal Healthy Patient",
      },
      {
        key: "fastingHours",
        label: "Fasting Duration (NPO)",
        type: "number",
        category: "Pre-Op Evaluation",
        unit: "hours",
        placeholder: "e.g. 8",
        helpText: "Minimum 6h for solids, 2h for clear fluids",
      },
      {
        key: "siteLaterality",
        label: "Surgical Site Laterality Marking",
        type: "select",
        category: "Surgical Safety",
        options: ["Right Side (Marked)", "Left Side (Marked)", "Bilateral (Marked)", "Midline / Single Organ", "Not Applicable"],
        defaultValue: "Not Applicable",
      },
      {
        key: "consentStatus",
        label: "Informed Surgical Consent",
        type: "select",
        category: "Surgical Safety",
        options: ["Signed & Verified by Patient", "Signed by Parent / Legal Guardian", "Emergency Exemption Protocol"],
        defaultValue: "Signed & Verified by Patient",
      },
      {
        key: "woundClassification",
        label: "Surgical Wound Class",
        type: "select",
        category: "Specialty Assessment",
        options: ["Class I: Clean Wound", "Class II: Clean-Contaminated (GI/Resp entered)", "Class III: Contaminated (Open fresh trauma)", "Class IV: Dirty / Infected (Pre-existing infection)"],
        defaultValue: "Class I: Clean Wound",
      },
      {
        key: "operativePlan",
        label: "Operative Technique & Procedure Notes",
        type: "textarea",
        category: "Surgical Plan",
        placeholder: "Planned incision, anesthesia modality (Local/Spinal/GA), suture material, specimen to histopathology…",
      },
    ],
    quickDiagnoses: [
      { icd: "K40.9", name: "Unilateral Inguinal Hernia" },
      { icd: "K35.8", name: "Acute Appendicitis" },
      { icd: "D17.9", name: "Subcutaneous Lipoma" },
      { icd: "L72.1", name: "Epidermoid / Sebaceous Cyst" },
      { icd: "K80.2", name: "Calculus of Gallbladder (Cholelithiasis)" },
      { icd: "L02.9", name: "Cutaneous Abscess / Furuncle" },
      { icd: "S82.9", name: "Closed Fracture of Extremity" },
    ],
    quickLabTests: [
      { code: "LAB_PREOP_CBC", name: "Pre-Op CBC with Differential & Platelets", category: "Hematology" },
      { code: "LAB_COAG_PT", name: "Prothrombin Time & INR (PT/INR)", category: "Coagulation" },
      { code: "LAB_BLOOD_GROUP", name: "Blood Group & Rh Cross-match", category: "Immunohematology" },
      { code: "LAB_SEROLOGY_PREOP", name: "Viral Hepatitis (HBsAg, HCV) & HIV Screen", category: "Serology" },
      { code: "LAB_RFT_PREOP", name: "Serum Creatinine & Electrolytes", category: "Biochemistry" },
    ],
  },
};

export const ALL_DEPARTMENTS = [
  { id: "general_opd", name: "General OPD & Internal Medicine", code: "OPD" },
  { id: "pediatrics", name: "Pediatrics & Child Health", code: "PED" },
  { id: "ob_gyn", name: "OB/GYN & Maternal Health", code: "OB/GYN" },
  { id: "dental", name: "Dental Clinic & Oral Surgery", code: "DENT" },
  { id: "ophthalmology", name: "Ophthalmology / Eye Clinic", code: "EYE" },
  { id: "surgery", name: "General Surgery & Minor OR", code: "SURG" },
];

/**
 * Fuzzy matcher to resolve department config by string name or ID.
 */
export function getDepartmentConfig(dept?: string | null): DepartmentConfig {
  if (!dept) return DEPARTMENT_CONFIGS.general_opd;

  const normalized = dept.toLowerCase().trim();

  if (normalized.includes("pediat") || normalized.includes("child") || normalized === "ped") {
    return DEPARTMENT_CONFIGS.pediatrics;
  }
  if (normalized.includes("gyn") || normalized.includes("matern") || normalized.includes("ob") || normalized.includes("women")) {
    return DEPARTMENT_CONFIGS.ob_gyn;
  }
  if (normalized.includes("dent") || normalized.includes("oral") || normalized.includes("tooth")) {
    return DEPARTMENT_CONFIGS.dental;
  }
  if (normalized.includes("eye") || normalized.includes("ophthalm") || normalized.includes("vision")) {
    return DEPARTMENT_CONFIGS.ophthalmology;
  }
  if (normalized.includes("surg") || normalized.includes("or") || normalized.includes("operat")) {
    return DEPARTMENT_CONFIGS.surgery;
  }

  return DEPARTMENT_CONFIGS.general_opd;
}
