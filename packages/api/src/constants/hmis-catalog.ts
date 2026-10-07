/**
 * Ethiopian Federal Ministry of Health (MoH) - National e-HMIS / DHIS2 Disease Catalog
 * Standard Top 20 Outpatient Morbidity Categories & Inpatient Health Indicators
 * Reference: Ethiopian National Health Data Dictionary (NHDD) & Information Revolution Roadmap
 */

export interface HmisDiseaseCategory {
  code: string;
  dhis2ElementId: string;
  name: string;
  nameAm: string;
  category: "Communicable" | "Non-Communicable" | "Maternal/Child" | "Injury" | "Other";
  keywords: string[];
  icdPrefixes: string[];
}

export const ETHIOPIAN_HMIS_MORBIDITY_CATALOG: HmisDiseaseCategory[] = [
  {
    code: "HMIS-OPD-01",
    dhis2ElementId: "DE_AURI_001",
    name: "Acute Upper Respiratory Infections (AURI)",
    nameAm: "አጣዳፊ የላይኛው የመተንፈሻ አካላት ኢንፌክሽን",
    category: "Communicable",
    keywords: ["upper respiratory", "auri", "common cold", "rhinitis", "pharyngitis", "sinusitis", "nasopharyngitis"],
    icdPrefixes: ["J00", "J01", "J02", "J06"],
  },
  {
    code: "HMIS-OPD-02",
    dhis2ElementId: "DE_PNEUMONIA_002",
    name: "Pneumonia (Severe & Non-Severe)",
    nameAm: "የሳንባ ምች (pneumonia)",
    category: "Communicable",
    keywords: ["pneumonia", "bronchopneumonia", "chest indrawing", "lobar pneumonia", "lower respiratory"],
    icdPrefixes: ["J12", "J13", "J14", "J15", "J18"],
  },
  {
    code: "HMIS-OPD-03",
    dhis2ElementId: "DE_DIARRHEA_003",
    name: "Diarrheal Diseases (with & without dehydration)",
    nameAm: "ተቅማጥ እና የሆድ ህመም",
    category: "Communicable",
    keywords: ["diarrhea", "diarrhoea", "gastroenteritis", "watery stool", "dehydration", "loose stool"],
    icdPrefixes: ["A08", "A09", "K52"],
  },
  {
    code: "HMIS-OPD-04",
    dhis2ElementId: "DE_MALARIA_PF_004",
    name: "Malaria (Plasmodium falciparum)",
    nameAm: "ወባ (ፋልሲፓረም)",
    category: "Communicable",
    keywords: ["malaria pf", "falciparum", "p. falciparum", "plasmodium falciparum"],
    icdPrefixes: ["B50"],
  },
  {
    code: "HMIS-OPD-05",
    dhis2ElementId: "DE_MALARIA_PV_005",
    name: "Malaria (Plasmodium vivax / Clinical / Mixed)",
    nameAm: "ወባ (ቫይቫክስ / ክሊኒካል)",
    category: "Communicable",
    keywords: ["malaria pv", "vivax", "p. vivax", "clinical malaria", "mixed malaria", "malaria"],
    icdPrefixes: ["B51", "B52", "B53", "B54"],
  },
  {
    code: "HMIS-OPD-06",
    dhis2ElementId: "DE_TYPHOID_006",
    name: "Typhoid & Paratyphoid Fever",
    nameAm: "ታይፎይድ ትኩሳት",
    category: "Communicable",
    keywords: ["typhoid", "paratyphoid", "enteric fever", "salmonella"],
    icdPrefixes: ["A01"],
  },
  {
    code: "HMIS-OPD-07",
    dhis2ElementId: "DE_DYSENTERY_007",
    name: "Dysentery (Amoebic & Bacillary)",
    nameAm: "አሜባ እና ደም የቀላቀለ ተቅማጥ",
    category: "Communicable",
    keywords: ["dysentery", "amoebic", "amebic", "bloody diarrhea", "shigellosis", "amoebiasis"],
    icdPrefixes: ["A03", "A06"],
  },
  {
    code: "HMIS-OPD-08",
    dhis2ElementId: "DE_HELMINTHS_008",
    name: "Helminthiasis & Intestinal Parasitosis",
    nameAm: "የሆድ ውስጥ ጥገኛ ትሎች (Helminths)",
    category: "Communicable",
    keywords: ["helminth", "parasite", "ascaris", "hookworm", "giardia", "giardiasis", "tapeworm", "pinworm"],
    icdPrefixes: ["B65", "B76", "B77", "B82"],
  },
  {
    code: "HMIS-OPD-09",
    dhis2ElementId: "DE_TRAUMA_009",
    name: "Trauma, Physical Injuries & Fractures",
    nameAm: "አደጋ፣ አጥንት ስብራት እና ቁስለት",
    category: "Injury",
    keywords: ["trauma", "fracture", "injury", "wound", "laceration", "burn", "accident", "rto", "fall"],
    icdPrefixes: ["S0", "S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9", "T0", "T1", "T2"],
  },
  {
    code: "HMIS-OPD-10",
    dhis2ElementId: "DE_HTN_010",
    name: "Hypertension & Cardiovascular Diseases",
    nameAm: "የደም ግፊት እና የልብ በሽታ",
    category: "Non-Communicable",
    keywords: ["hypertension", "htn", "high blood pressure", "cardiovascular", "heart failure", "ischemic"],
    icdPrefixes: ["I10", "I11", "I15", "I20", "I50"],
  },
  {
    code: "HMIS-OPD-11",
    dhis2ElementId: "DE_DIABETES_011",
    name: "Diabetes Mellitus (Type 1 & 2)",
    nameAm: "የስኳር በሽታ (Diabetes)",
    category: "Non-Communicable",
    keywords: ["diabetes", "dm", "type 1 diabetes", "type 2 diabetes", "hyperglycemia", "diabetic"],
    icdPrefixes: ["E10", "E11", "E14"],
  },
  {
    code: "HMIS-OPD-12",
    dhis2ElementId: "DE_UTI_012",
    name: "Urinary Tract Infection (UTI)",
    nameAm: "የሽንት ቱቦ ኢንፌክሽን (UTI)",
    category: "Communicable",
    keywords: ["urinary tract", "uti", "cystitis", "pyelonephritis", "dysuria"],
    icdPrefixes: ["N30", "N39"],
  },
  {
    code: "HMIS-OPD-13",
    dhis2ElementId: "DE_SKIN_013",
    name: "Skin Infection, Dermatitis & Scabies",
    nameAm: "የቆዳ ኢንፌክሽን እና እከክ",
    category: "Communicable",
    keywords: ["skin infection", "dermatitis", "eczema", "scabies", "cellulitis", "abscess", "fungal skin"],
    icdPrefixes: ["L01", "L02", "L03", "L20", "L30", "B86"],
  },
  {
    code: "HMIS-OPD-14",
    dhis2ElementId: "DE_EYE_014",
    name: "Eye & Ophthalmic Disorders",
    nameAm: "የአይን ህመም እና ኢንፌክሽን",
    category: "Other",
    keywords: ["eye", "conjunctivitis", "trachoma", "cataract", "blepharitis", "red eye"],
    icdPrefixes: ["H10", "H01", "A71", "H25"],
  },
  {
    code: "HMIS-OPD-15",
    dhis2ElementId: "DE_DENTAL_015",
    name: "Dental & Oral Cavity Conditions",
    nameAm: "የጥርስ እና የአፍ ውስጥ ህመም",
    category: "Other",
    keywords: ["dental", "caries", "tooth", "gingivitis", "periodontitis", "oral", "pulpitis"],
    icdPrefixes: ["K02", "K04", "K05"],
  },
  {
    code: "HMIS-OPD-16",
    dhis2ElementId: "DE_ARTHRITIS_016",
    name: "Musculoskeletal Disorders & Arthritis",
    nameAm: "የመገጣጠሚያ እና አጥንት ህመም",
    category: "Non-Communicable",
    keywords: ["arthritis", "joint pain", "musculoskeletal", "back pain", "osteoarthritis", "rheumatoid"],
    icdPrefixes: ["M05", "M15", "M19", "M54"],
  },
  {
    code: "HMIS-OPD-17",
    dhis2ElementId: "DE_ANEMIA_017",
    name: "Anemia & Nutritional Deficiencies",
    nameAm: "የደም ማነስ እና የተመጣጠነ ምግብ እጥረት",
    category: "Maternal/Child",
    keywords: ["anemia", "anaemia", "malnutrition", "iron deficiency", "sam", "mam", "rickets"],
    icdPrefixes: ["D50", "D64", "E40", "E46", "E55"],
  },
  {
    code: "HMIS-OPD-18",
    dhis2ElementId: "DE_PUD_018",
    name: "Peptic Ulcer Disease (PUD) & Dyspepsia",
    nameAm: "የጨጓራ ህመም እና ቁስለት (Gastritis/PUD)",
    category: "Non-Communicable",
    keywords: ["peptic ulcer", "pud", "gastritis", "dyspepsia", "gastric ulcer", "duodenal ulcer", "heartburn"],
    icdPrefixes: ["K25", "K26", "K27", "K29"],
  },
  {
    code: "HMIS-OPD-19",
    dhis2ElementId: "DE_ASTHMA_019",
    name: "Bronchial Asthma & Chronic Obstructive Airway",
    nameAm: "አስም እና ሥር የሰደደ የመተንፈሻ አካል ህመም",
    category: "Non-Communicable",
    keywords: ["asthma", "bronchial asthma", "wheezing", "copd", "chronic bronchitis"],
    icdPrefixes: ["J44", "J45"],
  },
  {
    code: "HMIS-OPD-20",
    dhis2ElementId: "DE_OTHER_020",
    name: "All Other Clinical Morbidities",
    nameAm: "ሌሎች ያልተጠቀሱ ክሊኒካዊ ህመሞች",
    category: "Other",
    keywords: ["other", "fever", "headache", "fatigue", "unspecified", "malaise"],
    icdPrefixes: ["R50", "R51", "Z00"],
  },
];

/**
 * Maps a clinical diagnosis string or ICD code to an official Ethiopian HMIS disease code.
 */
export function matchHmisCategory(diagnosisName: string, icdCode?: string): HmisDiseaseCategory {
  const normDiag = (diagnosisName || "").toLowerCase().trim();
  const normIcd = (icdCode || "").toUpperCase().trim();

  // 1. Try exact or prefix ICD matching first
  if (normIcd) {
    for (const cat of ETHIOPIAN_HMIS_MORBIDITY_CATALOG) {
      if (cat.icdPrefixes.some((prefix) => normIcd.startsWith(prefix))) {
        return cat;
      }
    }
  }

  // 2. Try keyword matching on description
  if (normDiag) {
    for (const cat of ETHIOPIAN_HMIS_MORBIDITY_CATALOG) {
      if (cat.keywords.some((kw) => normDiag.includes(kw))) {
        return cat;
      }
    }
  }

  // 3. Fallback to catch-all category
  return ETHIOPIAN_HMIS_MORBIDITY_CATALOG[ETHIOPIAN_HMIS_MORBIDITY_CATALOG.length - 1];
}

/**
 * Ethiopian Calendar Month Definitions (Ge'ez months)
 */
export const ETHIOPIAN_CALENDAR_MONTHS = [
  { id: "1", nameAm: "መስከረም", nameEn: "Meskerem", gregRange: "Sep 11 – Oct 10" },
  { id: "2", nameAm: "ጥቅምት", nameEn: "Tikimt", gregRange: "Oct 11 – Nov 09" },
  { id: "3", nameAm: "ኅዳር", nameEn: "Hidar", gregRange: "Nov 10 – Dec 09" },
  { id: "4", nameAm: "ታኅሣሥ", nameEn: "Tahsas", gregRange: "Dec 10 – Jan 08" },
  { id: "5", nameAm: "ጥር", nameEn: "Tir", gregRange: "Jan 09 – Feb 07" },
  { id: "6", nameAm: "የካቲት", nameEn: "Yakatit", gregRange: "Feb 08 – Mar 09" },
  { id: "7", nameAm: "መጋቢት", nameEn: "Megabit", gregRange: "Mar 10 – Apr 08" },
  { id: "8", nameAm: "ሚያዝያ", nameEn: "Miyazya", gregRange: "Apr 09 – May 08" },
  { id: "9", nameAm: "ግንቦት", nameEn: "Ginbot", gregRange: "May 09 – Jun 07" },
  { id: "10", nameAm: "ሰኔ", nameEn: "Sene", gregRange: "Jun 08 – Jul 07" },
  { id: "11", nameAm: "ሐምሌ", nameEn: "Hamle", gregRange: "Jul 08 – Aug 06" },
  { id: "12", nameAm: "ነሐሴ", nameEn: "Nehase", gregRange: "Aug 07 – Sep 05" },
  { id: "13", nameAm: "ጳጉሜ", nameEn: "Pagume", gregRange: "Sep 06 – Sep 10" },
];
