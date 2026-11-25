export type ExamMode =
  | "medical"
  | "pediatric"
  | "obstetric"
  | "surgical"
  | "dental"
  | "ophthalmic";

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
  catalogId?: string;
}

export interface DepartmentConfig {
  id: string;
  name: string;
  shortLabel: string;
  code: string;
  badgeColor: string;
  bannerTitle: string;
  iconName: string;
  defaultRoom: string;
  examMode: ExamMode;
  queueSubtitle: string;
  queueColumnLabel: string;
  sidebarLabels: {
    queue: string;
    consult: string;
    labOrder: string;
    prescription: string;
  };
  rosSymptoms: string[];
  defaultDiagnosis: QuickDiagnosis;
  defaultAdvice: string;
  followUpOptions: string[];
  preferredLabIds: string[];
  preferredDrugIds: string[];
  assessmentFields: AssessmentField[];
  quickDiagnoses: QuickDiagnosis[];
  quickLabTests: QuickLabTest[];
}

export const DEPARTMENT_CONFIGS: Record<string, DepartmentConfig> = {
  general_opd: {
    id: "general_opd",
    name: "General OPD & Internal Medicine",
    shortLabel: "General OPD",
    code: "OPD",
    badgeColor: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800",
    bannerTitle: "General Outpatient & Internal Medicine",
    iconName: "Stethoscope",
    defaultRoom: "Room 102 — General OPD",
    examMode: "medical",
    queueSubtitle: "Adult Consultations, Chronic Care & Lab Review",
    queueColumnLabel: "Vitals & Note",
    sidebarLabels: {
      queue: "OPD Queue",
      consult: "Consultation",
      labOrder: "Lab Order",
      prescription: "e-Prescription",
    },
    rosSymptoms: [
      "Fever",
      "Cough",
      "Shortness of Breath",
      "Chest Pain",
      "Headache",
      "Vomiting",
      "Diarrhea",
      "Abdominal Pain",
      "Fatigue",
      "Painful Urination",
      "Skin Rash",
    ],
    defaultDiagnosis: { icd: "J06.9", name: "Acute Upper Respiratory Infection" },
    defaultAdvice: "Drink plenty of fluids, rest well, and return if fever or symptoms worsen.",
    followUpOptions: [
      "Return in 3 days",
      "Return in 1 week",
      "Return in 1 month (Chronic Care)",
      "If symptoms worsen",
    ],
    preferredLabIds: ["cbc", "malaria", "fbs", "urinalysis", "rft", "lft", "lipid", "widal", "hpylori_stool", "hba1c"],
    preferredDrugIds: ["amox", "pcm", "ibup", "omep", "coartem", "cipro", "metform", "amlo", "enala", "azith"],
    assessmentFields: [
      {
        key: "chronicDisease",
        label: "Chronic Condition",
        type: "select",
        category: "History",
        options: ["None", "High Blood Pressure (Stage 1)", "High Blood Pressure (Stage 2)", "Type 2 Diabetes", "Asthma / COPD", "Heart Disease", "Kidney Disease"],
        defaultValue: "None",
      },
      {
        key: "bpClassification",
        label: "Blood Pressure Level",
        type: "select",
        category: "Exam",
        options: ["Normal (<120/80)", "Elevated (120-139 / 80-89)", "High Stage 1 (140-159 / 90-99)", "High Stage 2 (≥160 / ≥100)", "Very High / Urgent (≥180/120)"],
        defaultValue: "Normal (<120/80)",
      },
      {
        key: "bloodGlucose",
        label: "Blood Sugar (Fasting / Random)",
        type: "number",
        category: "Exam",
        unit: "mg/dL",
        placeholder: "e.g. 110",
      },
      {
        key: "lifestyleAdvice",
        label: "Diet & Home Care Advice",
        type: "textarea",
        category: "Plan",
        placeholder: "e.g. Low-salt diet, light daily exercise, stop smoking.",
      },
    ],
    quickDiagnoses: [
      { icd: "I10", name: "High Blood Pressure (Hypertension)" },
      { icd: "E11.9", name: "Type 2 Diabetes" },
      { icd: "J06.9", name: "Upper Respiratory Infection" },
      { icd: "K29.7", name: "Gastritis / Stomach Acid" },
      { icd: "A09", name: "Gastroenteritis (Diarrhea)" },
      { icd: "N39.0", name: "Urinary Tract Infection (UTI)" },
      { icd: "B54", name: "Malaria" },
      { icd: "A01.0", name: "Typhoid Fever" },
      { icd: "M54.5", name: "Low Back Pain" },
      { icd: "J18.9", name: "Pneumonia" },
    ],
    quickLabTests: [
      { code: "LAB_CBC", name: "Complete Blood Count (CBC)", category: "Blood", catalogId: "cbc" },
      { code: "LAB_BS", name: "Fasting Blood Sugar (FBS)", category: "Biochemistry", catalogId: "fbs" },
      { code: "LAB_LIPID", name: "Lipid Profile", category: "Biochemistry", catalogId: "lipid" },
      { code: "LAB_RFT", name: "Kidney Function (RFT)", category: "Biochemistry", catalogId: "rft" },
      { code: "LAB_URINE", name: "Urinalysis", category: "Urine", catalogId: "urinalysis" },
      { code: "LAB_MALARIA", name: "Malaria Test / Blood Film", category: "Infections", catalogId: "malaria" },
    ],
  },

  pediatrics: {
    id: "pediatrics",
    name: "Pediatrics & Child Health",
    shortLabel: "Pediatrics",
    code: "PED",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800",
    bannerTitle: "Child Health & Pediatrics Clinic",
    iconName: "HeartPulse",
    defaultRoom: "Room 205 — Pediatrics Suite",
    examMode: "pediatric",
    queueSubtitle: "Child Visits, Growth Checks, Nutrition & Weight-Based Rx",
    queueColumnLabel: "Age & Weight",
    sidebarLabels: {
      queue: "Child Queue",
      consult: "Child Exam",
      labOrder: "Child Labs",
      prescription: "Pediatric Rx",
    },
    rosSymptoms: [
      "Fever",
      "Cough / Fast Breathing",
      "Diarrhea",
      "Vomiting",
      "Poor Feeding",
      "Ear Pain / Pulling",
      "Skin Rash",
      "Convulsions / Lethargy",
      "Weight Loss",
    ],
    defaultDiagnosis: { icd: "J20.9", name: "Acute Bronchiolitis / Cough" },
    defaultAdvice: "Keep child hydrated, continue breastfeeding or fluids, and return immediately if breathing gets fast or child cannot drink.",
    followUpOptions: [
      "Return in 2 days (Danger check)",
      "Return in 5 days",
      "Return in 2 weeks (Nutrition/Growth)",
      "Next EPI Vaccine Visit",
    ],
    preferredLabIds: ["cbc", "stool_exam", "malaria", "crp", "urinalysis", "bf", "rbs"],
    preferredDrugIds: ["pcm_syp", "ibup_syp", "amox_syp", "ors", "alben", "coartem", "azith", "salbut"],
    assessmentFields: [
      {
        key: "ageCategory",
        label: "Child Age Group",
        type: "select",
        category: "Growth",
        options: ["Newborn (<28 days)", "Infant (1–12 months)", "Toddler (1–3 years)", "Child (4–11 years)", "Teen (12+ years)"],
        defaultValue: "Child (4–11 years)",
      },
      {
        key: "dangerSigns",
        label: "IMNCI Danger Signs",
        type: "select",
        category: "Safety Check",
        options: ["None (Child alert & drinking)", "Unable to drink / breastfeed", "Vomiting everything", "Convulsions / Fitting", "Lethargic or unconscious", "Chest indrawing / Stridor"],
        defaultValue: "None (Child alert & drinking)",
      },
      {
        key: "muac",
        label: "Arm Size (MUAC)",
        type: "number",
        category: "Nutrition",
        unit: "cm",
        placeholder: "e.g. 13.5",
        helpText: "Normal: >12.5 cm | Moderate: 11.5–12.5 cm | Severe: <11.5 cm",
      },
      {
        key: "weightPercentile",
        label: "Weight Growth",
        type: "select",
        category: "Growth",
        options: ["Normal Growth", "Mild Underweight", "Severe Underweight", "Overweight"],
        defaultValue: "Normal Growth",
      },
      {
        key: "immunizationStatus",
        label: "Vaccines (EPI)",
        type: "select",
        category: "Prevention",
        options: ["Up to date for age", "Missed some doses", "Not vaccinated", "Due today (BCG / Penta / Measles)"],
        defaultValue: "Up to date for age",
      },
      {
        key: "infantFeeding",
        label: "Feeding",
        type: "select",
        category: "Nutrition",
        options: ["Breast milk only (<6 months)", "Breast milk + soft food", "Formula milk", "Family food"],
        defaultValue: "Family food",
      },
      {
        key: "dehydrationLevel",
        label: "Hydration Check",
        type: "select",
        category: "Exam",
        options: ["No dehydration (Normal)", "Some dehydration (Thirsty, dry mouth)", "Severe dehydration (Very weak, slow skin pinch)"],
        defaultValue: "No dehydration (Normal)",
      },
      {
        key: "milestones",
        label: "Child Development",
        type: "select",
        category: "Growth",
        options: ["Normal for age", "Walking / movement delay", "Speech delay", "Social delay"],
        defaultValue: "Normal for age",
      },
    ],
    quickDiagnoses: [
      { icd: "J20.9", name: "Acute Bronchiolitis" },
      { icd: "J05.0", name: "Croup (Barking Cough)" },
      { icd: "A08.4", name: "Diarrhea with Dehydration" },
      { icd: "E43", name: "Severe Malnutrition (SAM)" },
      { icd: "E55.0", name: "Rickets (Vitamin D Deficiency)" },
      { icd: "P59.9", name: "Newborn Jaundice" },
      { icd: "H66.9", name: "Ear Infection (Otitis Media)" },
      { icd: "J45.9", name: "Childhood Asthma" },
      { icd: "B05.9", name: "Measles" },
    ],
    quickLabTests: [
      { code: "LAB_CBC", name: "Pediatric Blood Count (CBC)", category: "Blood", catalogId: "cbc" },
      { code: "LAB_STOOL", name: "Stool Exam (Parasites)", category: "Urine & Stool", catalogId: "stool_exam" },
      { code: "LAB_BILI", name: "Bilirubin (Jaundice)", category: "Biochemistry", catalogId: "lft" },
      { code: "LAB_CRP", name: "CRP Infection Check", category: "Infections", catalogId: "crp" },
      { code: "LAB_MALARIA", name: "Malaria Blood Film", category: "Infections", catalogId: "malaria" },
    ],
  },

  ob_gyn: {
    id: "ob_gyn",
    name: "OB/GYN & Maternal Health",
    shortLabel: "OB/GYN",
    code: "OB/GYN",
    badgeColor: "bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/50 dark:text-pink-300 dark:border-pink-800",
    bannerTitle: "Women's Health, Pregnancy & ANC Clinic",
    iconName: "Activity",
    defaultRoom: "Room 208 — Women's Health Clinic",
    examMode: "obstetric",
    queueSubtitle: "Antenatal Visits, High-Risk Pregnancy & Gynecology Care",
    queueColumnLabel: "Pregnancy & BP",
    sidebarLabels: {
      queue: "Maternal Queue",
      consult: "ANC & OB Exam",
      labOrder: "ANC Labs",
      prescription: "Maternal Rx",
    },
    rosSymptoms: [
      "Routine ANC Check",
      "Lower Belly Pain",
      "Vaginal Bleeding",
      "Vaginal Discharge",
      "Severe Headache / Blurry Vision",
      "Leg / Face Swelling",
      "Reduced Baby Movement",
      "Morning Sickness",
      "Painful Urination",
    ],
    defaultDiagnosis: { icd: "Z34.8", name: "Normal Antenatal Check-up" },
    defaultAdvice: "Take daily Iron + Folic Acid, attend all ANC visits, and come immediately if bleeding, severe headache, or baby movement drops.",
    followUpOptions: [
      "Next ANC visit in 4 weeks",
      "Next ANC visit in 2 weeks",
      "Weekly High-Risk check",
      "Return immediately for labor signs",
    ],
    preferredLabIds: ["anc_panel", "upt", "urinalysis", "cbc", "blood_group", "beta_hcg", "ogtt", "wet_mount", "hiv", "hbsag", "syphilis"],
    preferredDrugIds: ["fe_folic", "calc_d3", "methyldopa", "nifedipine", "clotri", "amox", "metoclo", "pcm"],
    assessmentFields: [
      {
        key: "gpal",
        label: "Pregnancy History (GPAL)",
        type: "text",
        category: "Pregnancy",
        placeholder: "e.g. G2 P1 A0 L1",
        defaultValue: "G1 P0 A0 L0",
        helpText: "Pregnancies (G), Births (P), Loss (A), Living (L)",
      },
      {
        key: "lmpDate",
        label: "Last Period Date (LMP)",
        type: "text",
        category: "Pregnancy",
        placeholder: "YYYY-MM-DD",
      },
      {
        key: "gestationalAge",
        label: "Weeks Pregnant",
        type: "number",
        category: "Pregnancy",
        unit: "wks",
        placeholder: "e.g. 28",
      },
      {
        key: "fundalHeight",
        label: "Belly Size (Fundal Height)",
        type: "number",
        category: "OB Exam",
        unit: "cm",
        placeholder: "e.g. 28",
      },
      {
        key: "fetalHeartRate",
        label: "Baby Heartbeat (FHR)",
        type: "number",
        category: "OB Exam",
        unit: "bpm",
        placeholder: "e.g. 142",
        helpText: "Normal range: 120–160 bpm",
      },
      {
        key: "fetalPresentation",
        label: "Baby Position",
        type: "select",
        category: "OB Exam",
        options: ["Head Down (Normal)", "Breech (Bottom Down)", "Sideways (Transverse)", "Early Pregnancy (Too early)"],
        defaultValue: "Head Down (Normal)",
      },
      {
        key: "ancRiskLevel",
        label: "Pregnancy Risk Level",
        type: "select",
        category: "Risk",
        options: ["Normal / Low Risk ANC", "High Risk — High Blood Pressure", "High Risk — Pregnancy Diabetes", "Previous C-Section Scar", "Twins / Multiple", "Bleeding / Placenta Low"],
        defaultValue: "Normal / Low Risk ANC",
      },
      {
        key: "pelvicExam",
        label: "Pelvic / Cervical Exam Notes",
        type: "textarea",
        category: "OB Exam",
        placeholder: "Cervix closed/open, discharge, membranes intact, tenderness…",
      },
    ],
    quickDiagnoses: [
      { icd: "Z34.8", name: "Normal Pregnancy Check (ANC)" },
      { icd: "O14.9", name: "Pre-eclampsia (Pregnancy High BP)" },
      { icd: "O21.0", name: "Severe Pregnancy Vomiting" },
      { icd: "N73.9", name: "Pelvic Infection (PID)" },
      { icd: "O20.0", name: "Early Pregnancy Bleeding" },
      { icd: "O24.4", name: "Pregnancy Diabetes (GDM)" },
      { icd: "N76.0", name: "Vaginal Yeast / Infection" },
      { icd: "O60.0", name: "Preterm Labor Signs" },
    ],
    quickLabTests: [
      { code: "LAB_ANC_PROFILE", name: "Full ANC Panel (CBC, Blood Group, HIV, VDRL, HBsAg)", category: "Antenatal", catalogId: "anc_panel" },
      { code: "LAB_URINE_PROT", name: "Urine Protein Check (Pre-eclampsia)", category: "Urine", catalogId: "urinalysis" },
      { code: "LAB_OGTT", name: "Pregnancy Sugar Test (OGTT)", category: "Biochemistry", catalogId: "ogtt" },
      { code: "LAB_HCG", name: "Pregnancy Blood Test (Beta-hCG)", category: "Hormones", catalogId: "beta_hcg" },
      { code: "LAB_VAGINAL_SWAB", name: "Vaginal Swab Microscopy", category: "Urine & Stool", catalogId: "wet_mount" },
    ],
  },

  dental: {
    id: "dental",
    name: "Dental Clinic & Oral Surgery",
    shortLabel: "Dental",
    code: "DENT",
    badgeColor: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/50 dark:text-cyan-300 dark:border-cyan-800",
    bannerTitle: "Dental Suite & Oral Care",
    iconName: "Sparkles",
    defaultRoom: "Room 105 — Dental Suite",
    examMode: "dental",
    queueSubtitle: "Tooth Care, Fillings, Extractions & Dental X-Rays",
    queueColumnLabel: "Teeth / Care",
    sidebarLabels: {
      queue: "Dental Queue",
      consult: "Tooth Chart & Care",
      labOrder: "Dental X-Ray & Lab",
      prescription: "Dental Rx",
    },
    rosSymptoms: [
      "Toothache",
      "Gum Swelling",
      "Bleeding Gums",
      "Hot/Cold Sensitivity",
      "Jaw / Cheek Pain",
      "Broken Tooth",
      "Wisdom Tooth Pain",
      "Bad Taste / Pus",
    ],
    defaultDiagnosis: { icd: "K02.9", name: "Tooth Decay (Dental Caries)" },
    defaultAdvice: "Bite firmly on gauze for 30 minutes after extraction, eat soft cool food today, and do not spit or rinse hard for 24 hours.",
    followUpOptions: [
      "Return in 7 days (Check healing / sutures)",
      "Return in 3 days (Root canal next step)",
      "Return in 6 months (Routine cleaning)",
      "If severe bleeding or swelling occurs",
    ],
    preferredLabIds: ["dental_iopa", "dental_opg", "cbc", "pt_inr", "rbs"],
    preferredDrugIds: ["chlorhex", "amox", "metron", "ibup", "diclo", "aug", "pcm"],
    assessmentFields: [
      {
        key: "affectedTeeth",
        label: "Selected Teeth (FDI)",
        type: "text",
        category: "Tooth Chart",
        placeholder: "Click teeth above (e.g. 16, 36)",
        helpText: "Upper Right: 18–11 | Upper Left: 21–28 | Lower Left: 31–38 | Lower Right: 41–48",
      },
      {
        key: "toothCondition",
        label: "Tooth Problem",
        type: "select",
        category: "Oral Exam",
        options: ["Tooth Cavity (Caries)", "Deep Nerve Pain (Pulpitis)", "Tooth Root Abscess (Swelling)", "Broken / Cracked Tooth", "Leftover Tooth Root", "Impacted Wisdom Tooth", "Loose / Worn Tooth", "Broken Old Filling"],
        defaultValue: "Tooth Cavity (Caries)",
      },
      {
        key: "gingivalHealth",
        label: "Gum Health",
        type: "select",
        category: "Oral Exam",
        options: ["Healthy Pink Gums", "Mild Gum Redness", "Bleeding Gums (Gingivitis)", "Deep Gum Disease (Periodontitis)", "Severe Gum Infection"],
        defaultValue: "Mild Gum Redness",
      },
      {
        key: "calculusGrade",
        label: "Tartar / Plaque Level",
        type: "select",
        category: "Oral Exam",
        options: ["Clean (None)", "Light Tartar", "Moderate Tartar", "Heavy Tartar"],
        defaultValue: "Light Tartar",
      },
      {
        key: "plannedProcedure",
        label: "Dental Treatment Done / Planned",
        type: "select",
        category: "Treatment",
        options: ["Teeth Cleaning (Scaling)", "Tooth-Colored Filling (Composite)", "GIC Filling", "Simple Tooth Extraction", "Surgical Tooth Extraction", "Root Canal Step 1 (Nerve Relief)", "Temporary Sedative Dressing"],
        defaultValue: "Tooth-Colored Filling (Composite)",
      },
      {
        key: "localAnesthesia",
        label: "Numbing Medicine Used",
        type: "text",
        category: "Treatment",
        placeholder: "e.g. Lidocaine 2% + Adrenaline 1.8ml",
        defaultValue: "Lidocaine 2% with Adrenaline 1:100,000 (1.8ml)",
      },
    ],
    quickDiagnoses: [
      { icd: "K02.9", name: "Tooth Cavity (Caries)" },
      { icd: "K04.0", name: "Tooth Nerve Pain (Pulpitis)" },
      { icd: "K04.7", name: "Dental Abscess / Gum Boil" },
      { icd: "K05.1", name: "Gum Inflammation (Gingivitis)" },
      { icd: "K01.1", name: "Impacted Wisdom Tooth" },
      { icd: "K05.3", name: "Chronic Gum Disease" },
      { icd: "K08.1", name: "Missing Teeth" },
      { icd: "K03.0", name: "Tooth Grinding / Wear" },
    ],
    quickLabTests: [
      { code: "PROC_DENTAL_XRAY", name: "Single Tooth X-Ray (IOPA)", category: "Dental X-Ray", catalogId: "dental_iopa" },
      { code: "PROC_OPG", name: "Full Jaw Panoramic X-Ray (OPG)", category: "Dental X-Ray", catalogId: "dental_opg" },
      { code: "LAB_CBC_COAG", name: "Pre-Extraction Blood & Clotting Check", category: "Blood", catalogId: "pt_inr" },
    ],
  },

  ophthalmology: {
    id: "ophthalmology",
    name: "Ophthalmology / Eye Clinic",
    shortLabel: "Eye Clinic",
    code: "EYE",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800",
    bannerTitle: "Eye Care & Vision Clinic",
    iconName: "Eye",
    defaultRoom: "Room 106 — Eye Clinic",
    examMode: "ophthalmic",
    queueSubtitle: "Vision Checks, Eye Pressure, Cataract & Red-Eye Care",
    queueColumnLabel: "Vision & Eye",
    sidebarLabels: {
      queue: "Eye Queue",
      consult: "Eye Exam & Vision",
      labOrder: "Eye Tests & Lab",
      prescription: "Eye Drops & Rx",
    },
    rosSymptoms: [
      "Blurry Vision",
      "Red Eye",
      "Eye Pain",
      "Itchy / Watery Eyes",
      "Yellow / Pus Discharge",
      "Light Sensitivity",
      "Halos Around Lights",
      "Foreign Body / Dust in Eye",
      "Headache / Eye Strain",
    ],
    defaultDiagnosis: { icd: "H10.1", name: "Allergic / Red Conjunctivitis" },
    defaultAdvice: "Do not rub your eyes, wash hands before putting in eye drops, and wear sunglasses outdoors.",
    followUpOptions: [
      "Return in 3 days (Infection check)",
      "Return in 2 weeks (Pressure check)",
      "Return in 1 month (Glaucoma / Glasses)",
      "If vision suddenly drops or pain worsens",
    ],
    preferredLabIds: ["eye_refraction", "eye_tonometry", "fbs", "hba1c", "cbc", "wound_cs"],
    preferredDrugIds: ["eye_cipro", "eye_tetra", "eye_timolol", "eye_pred", "eye_tears", "eye_cromo", "cetir", "pcm"],
    assessmentFields: [
      {
        key: "visualAcuityOD",
        label: "Vision — Right Eye (OD)",
        type: "select",
        category: "Vision",
        options: ["20/20 (Normal)", "20/25", "20/30", "20/40", "20/50", "20/70", "20/100", "20/200 (Low Vision)", "Counting Fingers", "Hand Motion", "Light Only", "No Light"],
        defaultValue: "20/20 (Normal)",
      },
      {
        key: "visualAcuityOS",
        label: "Vision — Left Eye (OS)",
        type: "select",
        category: "Vision",
        options: ["20/20 (Normal)", "20/25", "20/30", "20/40", "20/50", "20/70", "20/100", "20/200 (Low Vision)", "Counting Fingers", "Hand Motion", "Light Only", "No Light"],
        defaultValue: "20/20 (Normal)",
      },
      {
        key: "iopOD",
        label: "Eye Pressure — Right (OD)",
        type: "number",
        category: "Eye Pressure",
        unit: "mmHg",
        placeholder: "e.g. 16",
        helpText: "Normal eye pressure: 10–21 mmHg",
      },
      {
        key: "iopOS",
        label: "Eye Pressure — Left (OS)",
        type: "number",
        category: "Eye Pressure",
        unit: "mmHg",
        placeholder: "e.g. 17",
      },
      {
        key: "anteriorSegment",
        label: "Front Eye / Slit Lamp",
        type: "select",
        category: "Eye Exam",
        options: ["Clear & Normal", "Early Cataract", "Dense / Mature Cataract", "Pterygium Growth", "Corneal Scratch / Ulcer", "Blood in Front Chamber"],
        defaultValue: "Clear & Normal",
      },
      {
        key: "fundoscopyExam",
        label: "Back of Eye (Retina / Optic Nerve)",
        type: "select",
        category: "Eye Exam",
        options: ["Normal Retina & Nerve", "Glaucoma Nerve Cupping", "Diabetic Retinopathy Changes", "High BP Vessel Changes", "Macular Changes"],
        defaultValue: "Normal Retina & Nerve",
      },
    ],
    quickDiagnoses: [
      { icd: "H25.9", name: "Cataract (Cloudy Lens)" },
      { icd: "H40.1", name: "Glaucoma (High Eye Pressure)" },
      { icd: "H10.1", name: "Allergic Eye (Itchy / Red)" },
      { icd: "H52.1", name: "Nearsightedness (Needs Glasses)" },
      { icd: "H11.0", name: "Pterygium (Eye Surface Growth)" },
      { icd: "H16.0", name: "Corneal Ulcer" },
      { icd: "H10.0", name: "Bacterial Eye Infection" },
    ],
    quickLabTests: [
      { code: "PROC_REFRACTION", name: "Glasses & Vision Check (Refraction)", category: "Eye Procedure", catalogId: "eye_refraction" },
      { code: "PROC_TONOMETRY", name: "Eye Pressure Test (Tonometry)", category: "Eye Procedure", catalogId: "eye_tonometry" },
      { code: "LAB_BS_EYE", name: "Blood Sugar (Diabetic Eye Check)", category: "Biochemistry", catalogId: "fbs" },
    ],
  },

  surgery: {
    id: "surgery",
    name: "General Surgery & Minor OR",
    shortLabel: "Surgery",
    code: "SURG",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800",
    bannerTitle: "Surgery & Minor Procedure Room",
    iconName: "ShieldCheck",
    defaultRoom: "Room 110 — Surgical Consult",
    examMode: "surgical",
    queueSubtitle: "Surgical Checks, Minor Procedures, Pre-Op & Ward Admit",
    queueColumnLabel: "Case Urgency",
    sidebarLabels: {
      queue: "Surgical Queue",
      consult: "Surgical & Pre-Op",
      labOrder: "Pre-Op Labs",
      prescription: "Surgical Rx",
    },
    rosSymptoms: [
      "Belly Pain (Acute)",
      "Lump / Swelling",
      "Wound / Cut",
      "Boil / Abscess",
      "Groin Bulge (Hernia)",
      "Vomiting / Constipation",
      "Burn Injury",
      "Post-Op Wound Check",
    ],
    defaultDiagnosis: { icd: "L02.9", name: "Skin Abscess / Wound Care" },
    defaultAdvice: "Keep surgical dressing clean and dry, watch for redness or pus, and return for wound check or stitch removal.",
    followUpOptions: [
      "Wound dressing in 2 days",
      "Stitch removal in 7 days",
      "Pre-Op review with lab results",
      "Admit for surgery today",
    ],
    preferredLabIds: ["cbc", "pt_inr", "aptt", "blood_group", "rft", "electrolytes", "hbsag", "hcv", "hiv", "wound_cs"],
    preferredDrugIds: ["ceftri", "metron", "aug", "tramad", "diclo", "pcm", "genta", "cipro"],
    assessmentFields: [
      {
        key: "surgicalUrgency",
        label: "How Urgent",
        type: "select",
        category: "Pre-Op",
        options: ["Planned / Elective", "Urgent (Within 24 hrs)", "Emergency (Immediate)"],
        defaultValue: "Planned / Elective",
      },
      {
        key: "asaClass",
        label: "Patient Fitness (ASA)",
        type: "select",
        category: "Pre-Op",
        options: ["ASA I: Healthy", "ASA II: Mild controlled illness", "ASA III: Serious illness", "ASA IV: Life-threatening", "ASA V: Critical"],
        defaultValue: "ASA I: Healthy",
      },
      {
        key: "fastingHours",
        label: "Hours Without Food (NPO)",
        type: "number",
        category: "Pre-Op",
        unit: "hrs",
        placeholder: "e.g. 8",
        helpText: "Usually 6+ hrs for food, 2+ hrs for clear water",
      },
      {
        key: "siteLaterality",
        label: "Body Side Marked",
        type: "select",
        category: "Safety",
        options: ["Right Side", "Left Side", "Both Sides", "Midline / Center", "Not Needed"],
        defaultValue: "Not Needed",
      },
      {
        key: "consentStatus",
        label: "Signed Surgery Consent",
        type: "select",
        category: "Safety",
        options: ["Signed by Patient", "Signed by Parent / Guardian", "Emergency Rule Applied"],
        defaultValue: "Signed by Patient",
      },
      {
        key: "woundClassification",
        label: "Wound Type",
        type: "select",
        category: "Exam",
        options: ["Clean Wound", "Clean-Contaminated", "Contaminated (Fresh Trauma)", "Infected / Pus"],
        defaultValue: "Clean Wound",
      },
      {
        key: "operativePlan",
        label: "Procedure & Dressing Plan",
        type: "textarea",
        category: "Plan",
        placeholder: "Type of cut/stitching, local/spinal/general numbing, tissue sent to lab, stitch removal day…",
      },
    ],
    quickDiagnoses: [
      { icd: "K40.9", name: "Inguinal Hernia" },
      { icd: "K35.8", name: "Acute Appendicitis" },
      { icd: "D17.9", name: "Lipoma (Fatty Lump)" },
      { icd: "L72.1", name: "Skin Cyst" },
      { icd: "K80.2", name: "Gallstones" },
      { icd: "L02.9", name: "Skin Abscess / Boil" },
      { icd: "S82.9", name: "Bone Fracture / Trauma" },
    ],
    quickLabTests: [
      { code: "LAB_PREOP_CBC", name: "Pre-Op Blood Count (CBC)", category: "Blood", catalogId: "cbc" },
      { code: "LAB_COAG_PT", name: "Clotting Check (PT / INR)", category: "Blood", catalogId: "pt_inr" },
      { code: "LAB_BLOOD_GROUP", name: "Blood Group & Cross-Match", category: "Blood", catalogId: "blood_group" },
      { code: "LAB_SEROLOGY_PREOP", name: "Hepatitis & HIV Pre-Op Check", category: "Infections", catalogId: "hbsag" },
      { code: "LAB_RFT_PREOP", name: "Kidney & Salt Check (RFT / Electrolytes)", category: "Biochemistry", catalogId: "rft" },
    ],
  },
};

export const ALL_DEPARTMENTS = [
  { id: "general_opd", name: "General OPD & Internal Medicine", shortLabel: "General OPD", code: "OPD" },
  { id: "pediatrics", name: "Pediatrics & Child Health", shortLabel: "Pediatrics", code: "PED" },
  { id: "ob_gyn", name: "OB/GYN & Maternal Health", shortLabel: "OB/GYN", code: "OB/GYN" },
  { id: "dental", name: "Dental Clinic & Oral Surgery", shortLabel: "Dental", code: "DENT" },
  { id: "ophthalmology", name: "Ophthalmology / Eye Clinic", shortLabel: "Eye Clinic", code: "EYE" },
  { id: "surgery", name: "General Surgery & Minor OR", shortLabel: "Surgery", code: "SURG" },
];

/**
 * Fuzzy matcher to resolve department config by string name or ID.
 */
export function getDepartmentConfig(dept?: string | null): DepartmentConfig {
  if (!dept) return DEPARTMENT_CONFIGS.general_opd!;

  const normalized = dept.toLowerCase().trim();

  if (normalized.includes("pediat") || normalized.includes("child") || normalized === "ped") {
    return DEPARTMENT_CONFIGS.pediatrics!;
  }
  if (normalized.includes("gyn") || normalized.includes("matern") || normalized.includes("mch") || normalized.includes("ob") || normalized.includes("women")) {
    return DEPARTMENT_CONFIGS.ob_gyn!;
  }
  if (normalized.includes("dent") || normalized.includes("oral") || normalized.includes("tooth")) {
    return DEPARTMENT_CONFIGS.dental!;
  }
  if (normalized.includes("eye") || normalized.includes("ophthalm") || normalized.includes("vision")) {
    return DEPARTMENT_CONFIGS.ophthalmology!;
  }
  if (normalized.includes("surg") || normalized.includes("minor or") || normalized.includes("operat")) {
    return DEPARTMENT_CONFIGS.surgery!;
  }

  return DEPARTMENT_CONFIGS.general_opd!;
}

/**
 * Checks whether a queue ticket's department belongs to the active doctor department.
 * Unassigned/generic "OPD" tickets match General OPD so nothing gets orphaned.
 */
export function doesTicketBelongToDepartment(ticketDepartment: string | null | undefined, activeConfigId: string): boolean {
  const ticketDept = (ticketDepartment || "").toLowerCase().trim();
  if (!ticketDept || ticketDept === "opd" || ticketDept === "general" || ticketDept.includes("triage")) {
    return activeConfigId === "general_opd";
  }
  if (ticketDept.includes("emerg")) {
    // Emergency tickets are visible to General OPD & Surgery
    return activeConfigId === "general_opd" || activeConfigId === "surgery";
  }
  const matched = getDepartmentConfig(ticketDepartment);
  return matched.id === activeConfigId;
}
