import type { DosingContext, EvidenceGrade, JurisdictionCode, RegulatoryStatus } from "@/lib/types";

export type StatusModel = "approved_global" | "investigational_all" | "non_us_approved_only";

export type ExpandedPeptideSeed = {
  slug: string;
  name: string;
  peptideClass: string;
  statusModel: StatusModel;
  intro: string;
  mechanism: string;
  effectivenessSummary: string;
  longDescription: string;
  useCase: {
    slug: string;
    name: string;
    evidenceGrade: EvidenceGrade;
    consumerSummary: string;
    clinicalSummary: string;
  };
  dosing: {
    context: DosingContext;
    population: string;
    route: string;
    startingDose: string;
    maintenanceDose: string;
    frequency: string;
    notes: string;
  };
  safety: {
    adverseEffects: string;
    contraindications: string;
    interactions: string;
    monitoring: string;
  };
  claim: {
    section: string;
    claimText: string;
    evidenceGrade: EvidenceGrade;
    sourceUrl: string;
    sourceTitle: string;
    publishedAt: string;
  };
  aliases?: string[];
};

const FDA_LABEL_SOURCE = "https://open.fda.gov/apis/drug/label/";
const TRIALS_SOURCE = "https://clinicaltrials.gov/data-api/api";

export function statusForJurisdiction(model: StatusModel, jurisdictionCode: JurisdictionCode): RegulatoryStatus {
  if (model === "investigational_all") {
    return "INVESTIGATIONAL";
  }
  if (model === "non_us_approved_only") {
    return jurisdictionCode === "US" ? "INVESTIGATIONAL" : "NON_US_APPROVED";
  }
  return jurisdictionCode === "US" ? "US_FDA_APPROVED" : "NON_US_APPROVED";
}

export const expandedPeptideDataset: ExpandedPeptideSeed[] = [
  {
    slug: "semaglutide",
    name: "Semaglutide",
    peptideClass: "GLP-1 receptor agonist peptide",
    statusModel: "approved_global",
    intro:
      "Semaglutide is a GLP-1 analog peptide used for glycemic control and chronic weight management in indicated populations.",
    mechanism:
      "Semaglutide activates GLP-1 receptors to improve insulin secretion, suppress glucagon, slow gastric emptying, and increase satiety.",
    effectivenessSummary:
      "High-quality randomized evidence supports clinically meaningful glycemic and weight outcomes in approved populations.",
    longDescription:
      "Semaglutide is a long acting GLP-1 receptor agonist with strong outcome data in type 2 diabetes and chronic weight management. Clinical benefits include reductions in A1c, meaningful weight change, and cardiometabolic improvements when used in the indicated population and paired with lifestyle care. Tolerability is often limited by dose escalation related gastrointestinal effects, so gradual titration and adherence counseling are central to long term success. The evidence base is mature, but real world response still varies by baseline metabolic status, concurrent medications, and persistence with therapy. Monitoring generally focuses on treatment response, adverse effects, and contraindication screening rather than complex laboratory protocols in most outpatient settings.",
    useCase: {
      slug: "weight-management",
      name: "Weight Management",
      evidenceGrade: "A",
      consumerSummary: "Consistent studies show meaningful benefit in indicated obesity and metabolic risk populations.",
      clinicalSummary: "Robust RCT evidence with clinically relevant endpoints and reproducible effect sizes."
    },
    dosing: {
      context: "APPROVED_LABEL",
      population: "Adults with approved indication",
      route: "Subcutaneous",
      startingDose: "Low initial dose per approved label",
      maintenanceDose: "Escalate to labeled target dose",
      frequency: "Weekly",
      notes: "Use exact product label for titration schedule and interruption guidance."
    },
    safety: {
      adverseEffects: "Nausea, vomiting, constipation, and reduced appetite are common during escalation.",
      contraindications: "Avoid use in labeled contraindicated populations and assess relevant endocrine history.",
      interactions: "Review concurrent glucose lowering therapy and delayed gastric emptying related absorption concerns.",
      monitoring: "Track tolerability, adherence, body weight trend, glycemic response, and symptom flags."
    },
    claim: {
      section: "Effectiveness",
      claimText: "Randomized trials demonstrate clinically meaningful weight and glycemic improvements in approved populations.",
      evidenceGrade: "A",
      sourceUrl: FDA_LABEL_SOURCE,
      sourceTitle: "openFDA drug label data",
      publishedAt: "2024-01-15"
    },
    aliases: ["Ozempic", "Wegovy", "Rybelsus"]
  },
  {
    slug: "tirzepatide",
    name: "Tirzepatide",
    peptideClass: "Dual GIP and GLP-1 receptor agonist peptide",
    statusModel: "approved_global",
    intro:
      "Tirzepatide is a dual incretin peptide used for glycemic management and chronic weight management in indicated groups.",
    mechanism:
      "Tirzepatide co-activates GIP and GLP-1 receptors, amplifying satiety and insulinotropic effects while reducing glucagon output.",
    effectivenessSummary:
      "Evidence is strong for substantial weight and glycemic reductions in approved populations compared with older comparators.",
    longDescription:
      "Tirzepatide extends incretin therapy by targeting both GIP and GLP-1 pathways, producing strong efficacy across metabolic endpoints in indicated adults. Comparative trials have shown robust A1c reduction and pronounced weight change, with durability tied to continued treatment and follow up care. As with other incretin therapies, gastrointestinal symptoms often drive early discontinuation risk, so escalation pacing and expectation setting are clinically important. Population selection remains central, including review of contraindications, comorbidity profile, and concomitant glucose lowering therapy. In practice, treatment outcomes depend on consistent adherence, dose progression, and coordinated nutrition and activity planning rather than medication alone.",
    useCase: {
      slug: "type-2-diabetes",
      name: "Type 2 Diabetes",
      evidenceGrade: "A",
      consumerSummary: "Major trials show strong blood glucose and weight benefits in indicated adults.",
      clinicalSummary: "High quality multicenter RCTs with reproducible superiority across key metabolic endpoints."
    },
    dosing: {
      context: "APPROVED_LABEL",
      population: "Adults with approved indication",
      route: "Subcutaneous",
      startingDose: "Label defined low starting dose",
      maintenanceDose: "Escalate by label increments to tolerated target",
      frequency: "Weekly",
      notes: "Exact dosing and escalation depend on approved product label."
    },
    safety: {
      adverseEffects: "Gastrointestinal effects are frequent early in treatment and dose escalation.",
      contraindications: "Screen for contraindications and caution factors from current product labeling.",
      interactions: "Adjust concomitant glucose lowering agents as needed to reduce hypoglycemia risk.",
      monitoring: "Monitor response, tolerability, hydration status, and treatment persistence."
    },
    claim: {
      section: "Effectiveness",
      claimText: "Pivotal studies support substantial A1c and body weight reduction in approved indications.",
      evidenceGrade: "A",
      sourceUrl: FDA_LABEL_SOURCE,
      sourceTitle: "openFDA drug label data",
      publishedAt: "2024-03-01"
    },
    aliases: ["Mounjaro", "Zepbound"]
  },
  {
    slug: "liraglutide",
    name: "Liraglutide",
    peptideClass: "GLP-1 receptor agonist peptide",
    statusModel: "approved_global",
    intro: "Liraglutide is a daily GLP-1 analog used in approved diabetes and weight related indications.",
    mechanism:
      "It activates GLP-1 receptors to increase glucose dependent insulin response, reduce glucagon, and enhance satiety.",
    effectivenessSummary:
      "Strong evidence supports benefit in approved indications, with outcomes dependent on continued therapy.",
    longDescription:
      "Liraglutide has one of the longest post marketing experience records in the GLP-1 class and remains clinically relevant where daily dosing is acceptable. Trial data support improvements in glycemic control and body weight for indicated patients, though effect magnitude is generally smaller than some newer weekly options. Practical use requires attention to dose escalation tolerance, long term adherence, and realistic expectations around plateau phases. Safety experience is broad, but adverse effect counseling remains important, especially for gastrointestinal symptoms and early discontinuation. In routine care, outcomes improve when drug therapy is paired with behavioral and cardiometabolic risk management.",
    useCase: {
      slug: "type-2-diabetes",
      name: "Type 2 Diabetes",
      evidenceGrade: "A",
      consumerSummary: "Strong long term evidence supports glucose and weight benefits in indicated adults.",
      clinicalSummary: "Mature evidence base with consistent endpoint improvement and extensive safety follow up."
    },
    dosing: {
      context: "APPROVED_LABEL",
      population: "Adults with approved indication",
      route: "Subcutaneous",
      startingDose: "Daily low starting dose per label",
      maintenanceDose: "Escalate to labeled daily target",
      frequency: "Daily",
      notes: "Use exact product specific titration schedule from label."
    },
    safety: {
      adverseEffects: "Nausea and other gastrointestinal effects are common early in therapy.",
      contraindications: "Review labeled endocrine and hypersensitivity contraindications.",
      interactions: "Assess interactions with other diabetes drugs and monitor hypoglycemia risk where relevant.",
      monitoring: "Monitor glycemic endpoints, weight response, and tolerability."
    },
    claim: {
      section: "Effectiveness",
      claimText: "Clinical trials consistently show meaningful glycemic control improvements in indicated populations.",
      evidenceGrade: "A",
      sourceUrl: FDA_LABEL_SOURCE,
      sourceTitle: "openFDA drug label data",
      publishedAt: "2023-09-10"
    },
    aliases: ["Victoza", "Saxenda"]
  },
  {
    slug: "dulaglutide",
    name: "Dulaglutide",
    peptideClass: "Long acting GLP-1 receptor agonist peptide",
    statusModel: "approved_global",
    intro: "Dulaglutide is a weekly GLP-1 receptor agonist used for approved diabetes management pathways.",
    mechanism:
      "It activates GLP-1 receptors to improve insulin release in a glucose dependent manner and reduce glucagon signaling.",
    effectivenessSummary: "Evidence supports reliable A1c reduction with weekly administration and acceptable durability.",
    longDescription:
      "Dulaglutide provides a once weekly GLP-1 option with broad clinical use and strong glycemic endpoint data in type 2 diabetes care. Its weekly schedule can improve adherence in patients who struggle with daily injection routines, though tolerability and escalation counseling remain important. Comparative efficacy is favorable versus older agents for many patients, while newer dual incretin drugs may show larger weight effects in selected populations. Safety management generally follows class patterns, with gastrointestinal adverse effects most common and contraindication review still required. Long term treatment success depends on persistence, individualized goals, and integration with broader metabolic risk reduction strategies.",
    useCase: {
      slug: "type-2-diabetes",
      name: "Type 2 Diabetes",
      evidenceGrade: "A",
      consumerSummary: "Weekly treatment can improve blood sugar outcomes with strong supporting trial evidence.",
      clinicalSummary: "Large studies demonstrate consistent glycemic benefit with manageable class typical tolerability profile."
    },
    dosing: {
      context: "APPROVED_LABEL",
      population: "Adults with approved indication",
      route: "Subcutaneous",
      startingDose: "Weekly label starting dose",
      maintenanceDose: "Escalate to label based weekly maintenance",
      frequency: "Weekly",
      notes: "Follow product label for escalation and missed dose handling."
    },
    safety: {
      adverseEffects: "Gastrointestinal adverse events remain the most common class issue.",
      contraindications: "Use only after contraindication screening per approved labeling.",
      interactions: "Review glucose lowering co-therapy and delayed gastric emptying related considerations.",
      monitoring: "Assess A1c trend, body weight, and tolerability over follow up."
    },
    claim: {
      section: "Effectiveness",
      claimText: "Weekly dulaglutide has consistent randomized trial evidence for improved glycemic control.",
      evidenceGrade: "A",
      sourceUrl: FDA_LABEL_SOURCE,
      sourceTitle: "openFDA drug label data",
      publishedAt: "2023-11-05"
    },
    aliases: ["Trulicity"]
  },
  {
    slug: "exenatide",
    name: "Exenatide",
    peptideClass: "GLP-1 receptor agonist peptide",
    statusModel: "approved_global",
    intro: "Exenatide is an earlier GLP-1 analog with approved use in type 2 diabetes care.",
    mechanism:
      "It stimulates GLP-1 receptors to support glucose dependent insulin activity and appetite regulation.",
    effectivenessSummary:
      "Evidence supports glycemic benefit, though efficacy and convenience may differ from newer incretin options.",
    longDescription:
      "Exenatide established early proof of clinical utility for GLP-1 based diabetes care and remains a reference agent in the class history. It provides meaningful glycemic benefit and modest weight support in appropriate patients, but treatment burden and comparative efficacy have shifted many users toward newer options. Clinical positioning often reflects formulary access, patient preference, and prior response to incretin therapies. Safety issues are generally class aligned, with gastrointestinal adverse effects requiring counseling and monitoring. Where used, careful adherence planning and realistic expectations help maintain persistence and therapeutic value.",
    useCase: {
      slug: "type-2-diabetes",
      name: "Type 2 Diabetes",
      evidenceGrade: "B",
      consumerSummary: "Evidence supports better glucose control, although newer alternatives may offer stronger outcomes.",
      clinicalSummary: "Established efficacy with mature data, but comparative performance varies against newer agents."
    },
    dosing: {
      context: "APPROVED_LABEL",
      population: "Adults with approved indication",
      route: "Subcutaneous",
      startingDose: "Label low starting regimen",
      maintenanceDose: "Escalate per product formulation label",
      frequency: "Twice daily or weekly formulation dependent",
      notes: "Route frequency depends on immediate release versus extended release formulation."
    },
    safety: {
      adverseEffects: "Gastrointestinal symptoms are common during initiation and dose escalation.",
      contraindications: "Review product specific contraindications and renal use considerations.",
      interactions: "Consider timing with oral medications due to gastric emptying effects.",
      monitoring: "Track glycemic outcomes, tolerability, and persistence."
    },
    claim: {
      section: "Effectiveness",
      claimText: "Clinical programs demonstrate improved glycemic outcomes in adults with type 2 diabetes.",
      evidenceGrade: "B",
      sourceUrl: FDA_LABEL_SOURCE,
      sourceTitle: "openFDA drug label data",
      publishedAt: "2022-12-20"
    },
    aliases: ["Byetta", "Bydureon"]
  },
  {
    slug: "octreotide",
    name: "Octreotide",
    peptideClass: "Somatostatin analog peptide",
    statusModel: "approved_global",
    intro: "Octreotide is a somatostatin analog used in selected endocrine and neuroendocrine conditions.",
    mechanism:
      "It suppresses hormone secretion through somatostatin receptor activity, especially receptor subtype pathways.",
    effectivenessSummary:
      "Strong clinical use supports symptom control and hormonal suppression in approved settings.",
    longDescription:
      "Octreotide is a foundational somatostatin analog with broad specialist use across endocrine and neuroendocrine indications. Therapeutic goals often focus on hormonal symptom reduction, biochemical control, and disease management support depending on indication. Practical management includes route selection, interval planning, and surveillance for gallbladder, glucose, and gastrointestinal effects during long term treatment. Efficacy is well established for symptom control in several approved conditions, though response can vary by tumor biology and receptor profile. Ongoing follow up with endocrine or oncology teams is usually necessary for sustained benefit and risk monitoring.",
    useCase: {
      slug: "neuroendocrine-tumors",
      name: "Neuroendocrine Tumors",
      evidenceGrade: "A",
      consumerSummary: "Used to reduce hormone related symptoms and support disease control in specific conditions.",
      clinicalSummary: "Established efficacy for hormonal control with extensive specialist clinical experience."
    },
    dosing: {
      context: "APPROVED_LABEL",
      population: "Adults with approved indication",
      route: "Subcutaneous or intramuscular formulation dependent",
      startingDose: "Label defined initiation protocol",
      maintenanceDose: "Adjusted by symptom and biochemical response",
      frequency: "Daily to monthly formulation dependent",
      notes: "Formulation and indication determine route and interval."
    },
    safety: {
      adverseEffects: "Injection site reactions, gastrointestinal symptoms, and biliary effects can occur.",
      contraindications: "Review hypersensitivity and indication specific warnings.",
      interactions: "Assess interactions with glycemic therapies and cardiovascular medications.",
      monitoring: "Monitor symptom response, endocrine markers, and metabolic tolerance."
    },
    claim: {
      section: "Use cases",
      claimText: "Octreotide is a standard somatostatin analog in approved hormone excess and neuroendocrine contexts.",
      evidenceGrade: "A",
      sourceUrl: FDA_LABEL_SOURCE,
      sourceTitle: "openFDA drug label data",
      publishedAt: "2023-08-01"
    },
    aliases: ["Sandostatin"]
  },
  {
    slug: "lanreotide",
    name: "Lanreotide",
    peptideClass: "Long acting somatostatin analog peptide",
    statusModel: "approved_global",
    intro: "Lanreotide is a long acting somatostatin analog used in endocrine and neuroendocrine indications.",
    mechanism:
      "It binds somatostatin receptors to suppress pathologic hormone secretion and related symptom burden.",
    effectivenessSummary:
      "Clinical evidence supports sustained symptom and biochemical control in approved specialist indications.",
    longDescription:
      "Lanreotide provides long interval somatostatin analog therapy for selected endocrine and neuroendocrine indications with established specialist use. Its dosing profile supports ongoing outpatient management where monthly treatment cadence is practical and tolerated. Clinical goals typically include symptom reduction, hormonal control, and disease stabilization metrics depending on diagnosis. Response is influenced by disease biology, baseline marker levels, and adherence to longitudinal follow up. Safety monitoring parallels class expectations and often includes gastrointestinal tolerance, biliary assessment, and metabolic observation over time.",
    useCase: {
      slug: "acromegaly",
      name: "Acromegaly",
      evidenceGrade: "A",
      consumerSummary: "Long acting therapy can support hormonal control with specialist monitoring.",
      clinicalSummary: "Strong specialist evidence for sustained biochemical control in selected patients."
    },
    dosing: {
      context: "APPROVED_LABEL",
      population: "Adults with approved indication",
      route: "Deep subcutaneous",
      startingDose: "Label based initiation interval",
      maintenanceDose: "Adjusted by clinical and biochemical response",
      frequency: "Every 4 weeks or label defined interval",
      notes: "Interval and dose can be modified per approved treatment goals."
    },
    safety: {
      adverseEffects: "Gastrointestinal effects and injection site reactions are common.",
      contraindications: "Assess contraindications and specialist caution notes per label.",
      interactions: "Review endocrine co-therapies and relevant metabolism interactions.",
      monitoring: "Follow endocrine biomarkers, symptom burden, and tolerability."
    },
    claim: {
      section: "Use cases",
      claimText: "Lanreotide has established evidence for endocrine control in approved specialist indications.",
      evidenceGrade: "A",
      sourceUrl: FDA_LABEL_SOURCE,
      sourceTitle: "openFDA drug label data",
      publishedAt: "2023-10-03"
    },
    aliases: ["Somatuline Depot"]
  },
  {
    slug: "pasireotide",
    name: "Pasireotide",
    peptideClass: "Multireceptor somatostatin analog peptide",
    statusModel: "approved_global",
    intro: "Pasireotide is a somatostatin analog with broad receptor activity used in selected endocrine conditions.",
    mechanism:
      "It targets multiple somatostatin receptor subtypes to suppress excess endocrine signaling.",
    effectivenessSummary:
      "Evidence supports benefit in approved endocrine indications, with monitoring needs that can be more intensive.",
    longDescription:
      "Pasireotide expands somatostatin analog therapy through broader receptor subtype activity and is used in selected endocrine conditions where other options may be insufficient. Treatment planning is specialist led and frequently requires closer metabolic monitoring, especially glucose related effects. Clinical efficacy has been shown in approved settings, but individual response and tolerability can vary substantially. Care pathways emphasize tailored dosing, endocrine marker tracking, and proactive adverse effect management. Because of its monitoring profile, patient education and coordinated follow up are central to safe and effective long term use.",
    useCase: {
      slug: "cushing-disease",
      name: "Cushing Disease",
      evidenceGrade: "B",
      consumerSummary: "Can help control hormone excess in selected endocrine conditions with close monitoring.",
      clinicalSummary: "Evidence supports endocrine control with known metabolic monitoring requirements."
    },
    dosing: {
      context: "APPROVED_LABEL",
      population: "Adults with approved indication",
      route: "Subcutaneous or intramuscular formulation dependent",
      startingDose: "Per label initiation guidance",
      maintenanceDose: "Adjusted based on endocrine response and tolerance",
      frequency: "Twice daily or monthly formulation dependent",
      notes: "Dosing pathway depends on product formulation and indication."
    },
    safety: {
      adverseEffects: "Hyperglycemia risk, gastrointestinal effects, and injection site events may occur.",
      contraindications: "Review cardiac, hepatic, and endocrine cautions from labeling.",
      interactions: "Assess interactions affecting glycemic control and QT risk profile.",
      monitoring: "Monitor glucose metrics, endocrine markers, and ECG related parameters as indicated."
    },
    claim: {
      section: "Safety",
      claimText: "Use requires structured metabolic and endocrine monitoring due to class specific risks.",
      evidenceGrade: "B",
      sourceUrl: FDA_LABEL_SOURCE,
      sourceTitle: "openFDA drug label data",
      publishedAt: "2023-05-14"
    },
    aliases: ["Signifor"]
  },
  {
    slug: "tesamorelin",
    name: "Tesamorelin",
    peptideClass: "Growth hormone releasing factor analog peptide",
    statusModel: "approved_global",
    intro: "Tesamorelin is a GHRH analog approved for selected adiposity related indications.",
    mechanism:
      "It stimulates endogenous growth hormone signaling through pituitary GHRH receptor activation.",
    effectivenessSummary:
      "Evidence supports targeted body composition improvements in approved populations with ongoing treatment.",
    longDescription:
      "Tesamorelin is a synthetic GHRH analog used in specific adiposity related contexts with defined therapeutic endpoints. The treatment pathway focuses on changes in body composition rather than broad weight loss goals, so patient counseling should align expectations with indication specific outcomes. Clinical benefit has been demonstrated in approved settings, but durability depends on ongoing use and comprehensive metabolic care. Safety monitoring often includes glucose related metrics and symptom surveillance. In specialist practice, tesamorelin is best used with clear endpoint planning and follow up intervals.",
    useCase: {
      slug: "hiv-lipodystrophy",
      name: "HIV Lipodystrophy",
      evidenceGrade: "B",
      consumerSummary: "Can reduce specific visceral adiposity measures in indicated populations.",
      clinicalSummary: "Evidence supports body composition endpoint improvement in approved HIV related settings."
    },
    dosing: {
      context: "APPROVED_LABEL",
      population: "Adults with approved indication",
      route: "Subcutaneous",
      startingDose: "Label standard starting regimen",
      maintenanceDose: "Continue approved daily regimen",
      frequency: "Daily",
      notes: "Use indication specific endpoint review during follow up."
    },
    safety: {
      adverseEffects: "Injection site effects and fluid related symptoms can occur.",
      contraindications: "Assess active malignancy history and endocrine caution statements.",
      interactions: "Review medications influencing glucose metabolism and endocrine axis.",
      monitoring: "Track body composition endpoints and metabolic safety labs."
    },
    claim: {
      section: "Effectiveness",
      claimText: "Studies support visceral adiposity improvement in approved HIV related indication contexts.",
      evidenceGrade: "B",
      sourceUrl: FDA_LABEL_SOURCE,
      sourceTitle: "openFDA drug label data",
      publishedAt: "2022-10-08"
    },
    aliases: ["Egrifta"]
  },
  {
    slug: "glucagon",
    name: "Glucagon",
    peptideClass: "Endogenous counterregulatory hormone peptide",
    statusModel: "approved_global",
    intro: "Glucagon is used for emergency treatment of severe hypoglycemia and selected diagnostic settings.",
    mechanism:
      "It raises blood glucose through hepatic glycogen mobilization and gluconeogenic pathway activation.",
    effectivenessSummary: "Strong evidence supports rapid rescue utility in severe hypoglycemia protocols.",
    longDescription:
      "Glucagon is a core emergency peptide used for severe hypoglycemia rescue when oral carbohydrate is not feasible. Modern delivery formats have improved practicality in community and caregiver settings, though education on recognition and administration remains essential. Effectiveness depends on adequate hepatic glycogen reserve and timely administration, so follow on carbohydrate intake and medical review are part of standard protocols. In specialized contexts, glucagon may also support selected diagnostic procedures. For routine preparedness, device familiarity, expiration checks, and emergency plan rehearsal are as important as prescription access.",
    useCase: {
      slug: "severe-hypoglycemia",
      name: "Severe Hypoglycemia",
      evidenceGrade: "A",
      consumerSummary: "Emergency glucagon can rapidly raise blood sugar during severe hypoglycemia events.",
      clinicalSummary: "Established rescue efficacy with broad emergency protocol integration."
    },
    dosing: {
      context: "APPROVED_LABEL",
      population: "Adults and children per approved products",
      route: "Intramuscular, subcutaneous, or intranasal product dependent",
      startingDose: "Administer approved emergency dose",
      maintenanceDose: "Single rescue dose with protocol based repeat guidance",
      frequency: "As needed for emergency event",
      notes: "Follow emergency care protocol after administration."
    },
    safety: {
      adverseEffects: "Nausea and vomiting can occur after administration.",
      contraindications: "Review product specific contraindications such as selected endocrine tumors.",
      interactions: "Assess interactions in chronic use contexts though emergency use is primary.",
      monitoring: "Observe recovery, airway safety, and follow on carbohydrate replacement."
    },
    claim: {
      section: "Use cases",
      claimText: "Glucagon is a standard emergency rescue treatment for severe hypoglycemia.",
      evidenceGrade: "A",
      sourceUrl: FDA_LABEL_SOURCE,
      sourceTitle: "openFDA drug label data",
      publishedAt: "2024-02-11"
    }
  },
  {
    slug: "desmopressin",
    name: "Desmopressin",
    peptideClass: "Vasopressin analog peptide",
    statusModel: "approved_global",
    intro: "Desmopressin is a vasopressin analog used in central diabetes insipidus and other approved indications.",
    mechanism:
      "It selectively activates renal V2 receptors to increase water reabsorption and reduce urine output.",
    effectivenessSummary: "Strong evidence supports symptom control in approved antidiuretic indications.",
    longDescription:
      "Desmopressin is a well established vasopressin analog with central importance in diabetes insipidus management and selected additional indications. Treatment goals include reducing polyuria and nocturia while avoiding water intoxication and sodium imbalance. Clinical management requires careful fluid counseling and individualized dose timing, especially in patients with variable intake patterns or comorbid risk factors. Multiple formulations support flexible administration but also require clear patient instruction to avoid dosing confusion. Regular sodium monitoring and symptom review are key safety anchors during maintenance therapy.",
    useCase: {
      slug: "diabetes-insipidus",
      name: "Diabetes Insipidus",
      evidenceGrade: "A",
      consumerSummary: "Effectively reduces excessive urination in central diabetes insipidus when monitored correctly.",
      clinicalSummary: "Longstanding evidence base with predictable antidiuretic response and clear monitoring requirements."
    },
    dosing: {
      context: "APPROVED_LABEL",
      population: "Adults and pediatric patients per indication",
      route: "Intranasal, oral, or injectable product dependent",
      startingDose: "Label based individualized initiation",
      maintenanceDose: "Titrate to symptom control and sodium safety",
      frequency: "Daily or twice daily product dependent",
      notes: "Fluid guidance and sodium checks are integral to safe use."
    },
    safety: {
      adverseEffects: "Hyponatremia is the major safety risk if fluid intake is not managed appropriately.",
      contraindications: "Avoid in patients with contraindicated hyponatremia risk profiles.",
      interactions: "Review medications that influence sodium balance and antidiuretic effect.",
      monitoring: "Monitor sodium, symptoms of water imbalance, and dose timing adherence."
    },
    claim: {
      section: "Safety",
      claimText: "Safe use depends on sodium focused monitoring and fluid management counseling.",
      evidenceGrade: "A",
      sourceUrl: FDA_LABEL_SOURCE,
      sourceTitle: "openFDA drug label data",
      publishedAt: "2023-07-19"
    },
    aliases: ["DDAVP"]
  },
  {
    slug: "oxytocin",
    name: "Oxytocin",
    peptideClass: "Uterotonic hormone peptide",
    statusModel: "approved_global",
    intro: "Oxytocin is used in obstetric care for labor and postpartum indications under clinical supervision.",
    mechanism: "It stimulates uterine smooth muscle contraction via oxytocin receptor mediated signaling pathways.",
    effectivenessSummary: "Extensive clinical evidence supports obstetric use within monitored protocol settings.",
    longDescription:
      "Oxytocin is a high importance obstetric peptide used for labor induction, augmentation, and postpartum hemorrhage prevention or treatment in protocol guided settings. It is not a casual therapy and requires continuous maternal and fetal monitoring when used for labor management. Clinical effectiveness is well established, but safe administration depends on infusion control, indication clarity, and rapid response to uterine tachysystole or fetal distress signs. Postpartum use is similarly protocol driven with focus on uterine tone and bleeding reduction. Oxytocin administration should remain within trained clinical teams with immediate access to escalation resources.",
    useCase: {
      slug: "labor-management",
      name: "Labor Management",
      evidenceGrade: "A",
      consumerSummary: "Used in hospital obstetric care to support labor and manage postpartum uterine tone.",
      clinicalSummary: "Established obstetric standard with protocol based effectiveness and safety controls."
    },
    dosing: {
      context: "APPROVED_LABEL",
      population: "Obstetric patients in supervised care",
      route: "Intravenous infusion or intramuscular postpartum protocol",
      startingDose: "Protocol based low initiation rate",
      maintenanceDose: "Titrate to uterine response under continuous monitoring",
      frequency: "Continuous infusion or protocol dose",
      notes: "Use only in monitored obstetric settings."
    },
    safety: {
      adverseEffects: "Excess uterine activity and related fetal distress risks require close monitoring.",
      contraindications: "Contraindicated where vaginal delivery is not appropriate.",
      interactions: "Coordinate with concurrent obstetric medications and anesthesia plans.",
      monitoring: "Continuous maternal and fetal monitoring during labor use."
    },
    claim: {
      section: "Use cases",
      claimText: "Oxytocin is an established obstetric protocol medication for labor and postpartum care.",
      evidenceGrade: "A",
      sourceUrl: FDA_LABEL_SOURCE,
      sourceTitle: "openFDA drug label data",
      publishedAt: "2022-04-28"
    }
  },
  {
    slug: "bivalirudin",
    name: "Bivalirudin",
    peptideClass: "Direct thrombin inhibitor peptide",
    statusModel: "approved_global",
    intro: "Bivalirudin is an anticoagulant peptide used in selected procedural and cardiovascular contexts.",
    mechanism: "It directly inhibits thrombin activity to reduce clot propagation in high risk procedural settings.",
    effectivenessSummary: "Evidence supports anticoagulation utility during specific cardiovascular interventions.",
    longDescription:
      "Bivalirudin is a parenteral direct thrombin inhibitor used in procedural anticoagulation pathways where rapid, controlled anticoagulant effect is required. It is commonly integrated into cardiology protocols with dosing adjusted to procedural context and renal function considerations. Clinical evidence supports efficacy in reducing thrombotic complications during selected interventions, with bleeding risk requiring close balancing and monitoring. Compared with some alternatives, its pharmacologic profile can be advantageous in specific patient groups under specialist management. Successful use depends on protocol adherence, real time coagulation oversight, and transition planning after procedure completion.",
    useCase: {
      slug: "procedural-anticoagulation",
      name: "Procedural Anticoagulation",
      evidenceGrade: "A",
      consumerSummary: "Used during certain cardiovascular procedures to reduce clot risk under specialist care.",
      clinicalSummary: "Strong procedural evidence with protocol driven risk balancing for bleeding and thrombosis."
    },
    dosing: {
      context: "APPROVED_LABEL",
      population: "Adults in approved procedural indications",
      route: "Intravenous",
      startingDose: "Label bolus and infusion initiation",
      maintenanceDose: "Protocol infusion adjusted by clinical context",
      frequency: "Continuous during procedure",
      notes: "Dosing and duration are procedure specific."
    },
    safety: {
      adverseEffects: "Bleeding is the primary safety concern in anticoagulation therapy.",
      contraindications: "Use caution in active bleeding states and contraindicated scenarios.",
      interactions: "Coordinate with antiplatelet and anticoagulant co-therapy.",
      monitoring: "Monitor procedural anticoagulation parameters and bleeding signs."
    },
    claim: {
      section: "Use cases",
      claimText: "Bivalirudin has strong evidence for anticoagulation in selected procedural cardiology settings.",
      evidenceGrade: "A",
      sourceUrl: FDA_LABEL_SOURCE,
      sourceTitle: "openFDA drug label data",
      publishedAt: "2023-03-22"
    },
    aliases: ["Angiomax"]
  },
  {
    slug: "enfuvirtide",
    name: "Enfuvirtide",
    peptideClass: "HIV fusion inhibitor peptide",
    statusModel: "approved_global",
    intro: "Enfuvirtide is an antiretroviral peptide used in selected multidrug resistant HIV treatment pathways.",
    mechanism: "It blocks viral fusion with host cells by binding gp41 mediated entry machinery.",
    effectivenessSummary:
      "Evidence supports virologic benefit in treatment experienced populations when integrated into optimized regimens.",
    longDescription:
      "Enfuvirtide is a fusion inhibitor peptide used in specific HIV treatment scenarios, especially treatment experienced populations with resistance constraints. Its role is generally specialist directed and tied to individualized regimen construction rather than broad first line use. Clinical efficacy is linked to combination with active background therapy and resistance informed planning. Practical barriers include injection burden and injection site reactions, which can affect adherence if not proactively managed. In modern care, enfuvirtide remains an important option for selected complex cases where oral regimen flexibility is limited.",
    useCase: {
      slug: "hiv-treatment-experienced",
      name: "HIV Treatment Experienced Care",
      evidenceGrade: "B",
      consumerSummary: "Can improve viral control in selected resistant HIV treatment contexts.",
      clinicalSummary: "Specialist evidence supports use when combined with optimized background antiretroviral therapy."
    },
    dosing: {
      context: "APPROVED_LABEL",
      population: "Adults and pediatric patients per indication",
      route: "Subcutaneous",
      startingDose: "Label standard dose",
      maintenanceDose: "Continue fixed dose in combination regimen",
      frequency: "Twice daily",
      notes: "Use in specialist guided combination HIV treatment plans."
    },
    safety: {
      adverseEffects: "Injection site reactions are common and may affect persistence.",
      contraindications: "Review hypersensitivity and indication specific warnings.",
      interactions: "Coordinate with full antiretroviral regimen planning.",
      monitoring: "Monitor virologic response, tolerance, and adherence barriers."
    },
    claim: {
      section: "Effectiveness",
      claimText: "Enfuvirtide improves outcomes in selected treatment experienced HIV populations when regimen optimized.",
      evidenceGrade: "B",
      sourceUrl: FDA_LABEL_SOURCE,
      sourceTitle: "openFDA drug label data",
      publishedAt: "2021-11-17"
    },
    aliases: ["Fuzeon"]
  },
  {
    slug: "leuprolide",
    name: "Leuprolide",
    peptideClass: "GnRH agonist peptide",
    statusModel: "approved_global",
    intro: "Leuprolide is a GnRH agonist used in hormone sensitive conditions under specialist care.",
    mechanism: "Continuous GnRH receptor stimulation suppresses gonadal steroid production after initial flare phase.",
    effectivenessSummary:
      "Strong evidence supports endocrine suppression in approved oncologic and reproductive indications.",
    longDescription:
      "Leuprolide is a central GnRH agonist used across oncology, gynecology, and selected endocrine treatment pathways. After an initial hormone flare period, ongoing receptor stimulation suppresses downstream gonadal hormone production and supports disease control goals in approved settings. Clinical utility is well established, but management requires attention to flare mitigation strategies, injection scheduling, and long term adverse effect monitoring. Treatment selection should account for bone health, metabolic context, and symptom burden over extended courses. Multidisciplinary follow up is common because care goals differ by indication and treatment duration.",
    useCase: {
      slug: "hormone-sensitive-cancers",
      name: "Hormone Sensitive Cancers",
      evidenceGrade: "A",
      consumerSummary: "Widely used to reduce hormone signaling in specific cancer care pathways.",
      clinicalSummary: "Established endocrine suppression therapy with broad evidence in approved indications."
    },
    dosing: {
      context: "APPROVED_LABEL",
      population: "Adults in approved indications",
      route: "Intramuscular or subcutaneous depot",
      startingDose: "Label depot initiation by indication",
      maintenanceDose: "Repeat depot at approved interval",
      frequency: "Monthly to multi month interval",
      notes: "Interval and formulation depend on indication."
    },
    safety: {
      adverseEffects: "Hot flashes, mood changes, and musculoskeletal effects may occur with long term suppression.",
      contraindications: "Contraindicated in pregnancy in relevant indications.",
      interactions: "Coordinate with adjunct endocrine and oncologic therapies.",
      monitoring: "Monitor symptom burden, hormone suppression targets, and bone health where indicated."
    },
    claim: {
      section: "Use cases",
      claimText: "Leuprolide has strong evidence for hormone suppression in approved oncology related indications.",
      evidenceGrade: "A",
      sourceUrl: FDA_LABEL_SOURCE,
      sourceTitle: "openFDA drug label data",
      publishedAt: "2023-02-09"
    },
    aliases: ["Lupron"]
  },
  {
    slug: "triptorelin",
    name: "Triptorelin",
    peptideClass: "GnRH agonist peptide",
    statusModel: "approved_global",
    intro: "Triptorelin is a depot GnRH agonist used for endocrine suppression in approved indications.",
    mechanism:
      "It suppresses pituitary gonadotropin signaling after initial receptor stimulation and flare period.",
    effectivenessSummary:
      "Evidence supports effective endocrine suppression in approved specialist treatment pathways.",
    longDescription:
      "Triptorelin is a long acting GnRH agonist used for endocrine suppression across selected oncologic and endocrine indications. Its depot administration supports sustained hormone suppression when interval adherence is maintained. Clinical outcomes depend on indication specific endpoints and may require combination with additional therapies. As with other GnRH agonists, initial flare management and long term adverse effect monitoring are part of standard care planning. Specialist follow up focuses on suppression adequacy, symptom burden, and overall treatment goals over time.",
    useCase: {
      slug: "endocrine-suppression",
      name: "Endocrine Suppression",
      evidenceGrade: "A",
      consumerSummary: "Provides sustained hormone suppression in approved specialist treatment settings.",
      clinicalSummary: "Robust evidence in approved endocrine suppression indications with depot delivery convenience."
    },
    dosing: {
      context: "APPROVED_LABEL",
      population: "Adults with approved indication",
      route: "Intramuscular depot",
      startingDose: "Label depot initiation regimen",
      maintenanceDose: "Repeat depot at approved interval",
      frequency: "Monthly to quarterly formulation dependent",
      notes: "Interval depends on product and indication."
    },
    safety: {
      adverseEffects: "Class typical hypoestrogenic or hypoandrogenic symptoms can occur.",
      contraindications: "Review pregnancy and hypersensitivity contraindications.",
      interactions: "Assess concomitant endocrine and oncologic medication plans.",
      monitoring: "Monitor endocrine suppression effect, symptom profile, and long term risk markers."
    },
    claim: {
      section: "Use cases",
      claimText: "Triptorelin provides sustained endocrine suppression in approved specialist use cases.",
      evidenceGrade: "A",
      sourceUrl: FDA_LABEL_SOURCE,
      sourceTitle: "openFDA drug label data",
      publishedAt: "2022-06-06"
    }
  },
  {
    slug: "thymosin-alpha-1",
    name: "Thymosin Alpha-1",
    peptideClass: "Immunomodulatory thymic peptide",
    statusModel: "non_us_approved_only",
    intro: "Thymosin alpha-1 is an immunomodulatory peptide with country specific regulatory status.",
    mechanism:
      "It is proposed to modulate innate and adaptive immune signaling pathways through thymic related mechanisms.",
    effectivenessSummary:
      "Evidence is mixed by indication, with stronger support in selected non US regulatory contexts.",
    longDescription:
      "Thymosin alpha-1 is an immunomodulatory peptide used in selected regions under indication specific frameworks, while US status remains investigational for most broad consumer claims. The evidence profile is heterogeneous, with signal strength varying by disease context, trial design quality, and endpoint selection. It is often discussed in immune support contexts, but interpretation should remain anchored to indication level data rather than generalized claims. Regulatory status differs substantially across jurisdictions, so country specific labeling and legal pathways must guide availability and use. Where considered, specialist oversight and source quality scrutiny are essential.",
    useCase: {
      slug: "immune-modulation",
      name: "Immune Modulation",
      evidenceGrade: "C",
      consumerSummary: "Evidence varies by indication and country, so broad claims should be interpreted cautiously.",
      clinicalSummary: "Mixed study quality with indication dependent signal strength and regional regulatory differences."
    },
    dosing: {
      context: "STUDY_REPORTED",
      population: "Indication specific cohorts",
      route: "Subcutaneous",
      startingDose: "Protocol dependent",
      maintenanceDose: "Protocol dependent",
      frequency: "Several times weekly in many study designs",
      notes: "Use is region and indication specific; verify local regulation."
    },
    safety: {
      adverseEffects: "Injection site effects and mild systemic symptoms are reported in some studies.",
      contraindications: "Contraindications vary by country specific labeling and indication.",
      interactions: "Assess interaction risk with immunotherapies and immunosuppressive regimens.",
      monitoring: "Monitor indication specific endpoints and adverse effects under specialist guidance."
    },
    claim: {
      section: "Regulatory status",
      claimText: "Regulatory status differs by jurisdiction, with broader non US use than current US pathways.",
      evidenceGrade: "C",
      sourceUrl: TRIALS_SOURCE,
      sourceTitle: "ClinicalTrials.gov API",
      publishedAt: "2024-04-01"
    }
  },
  {
    slug: "bpc-157",
    name: "BPC-157",
    peptideClass: "Synthetic gastric peptide fragment",
    statusModel: "investigational_all",
    intro:
      "BPC-157 is widely discussed for recovery purposes, but high quality human evidence remains limited.",
    mechanism:
      "Proposed mechanisms include tissue signaling and angiogenic effects, but translational certainty in humans is low.",
    effectivenessSummary:
      "Current evidence is insufficient for broad clinical claims and remains mostly investigational.",
    longDescription:
      "BPC-157 is a research oriented peptide with significant consumer interest and limited high quality human data. Many public claims are extrapolated from preclinical or low certainty sources, so interpretation requires careful separation of hypothesis from clinical evidence. Regulatory pathways are generally investigational and do not support broad therapeutic positioning in mainstream care. Product quality variability is an additional risk because sourcing often lacks standardized manufacturing transparency. In this database, BPC-157 content should be read as evidence tracking rather than treatment endorsement.",
    useCase: {
      slug: "tissue-repair",
      name: "Tissue Repair",
      evidenceGrade: "C",
      consumerSummary: "Human evidence remains early and uncertain despite high online visibility.",
      clinicalSummary: "Most support is preclinical or low certainty, with limited robust human endpoint data."
    },
    dosing: {
      context: "STUDY_REPORTED",
      population: "Small investigational cohorts",
      route: "Varies by study",
      startingDose: "Protocol specific",
      maintenanceDose: "Protocol specific",
      frequency: "Varies",
      notes: "Investigational context only and not treatment guidance."
    },
    safety: {
      adverseEffects: "Safety profile remains incompletely characterized in controlled human studies.",
      contraindications: "No comprehensive, validated contraindication framework currently established.",
      interactions: "Interaction profile remains uncertain due to limited clinical data.",
      monitoring: "If studied, use protocol based monitoring and source quality verification."
    },
    claim: {
      section: "Research",
      claimText: "Current human evidence is limited and does not establish broad clinical effectiveness claims.",
      evidenceGrade: "C",
      sourceUrl: TRIALS_SOURCE,
      sourceTitle: "ClinicalTrials.gov API",
      publishedAt: "2024-02-20"
    },
    aliases: ["Body Protection Compound"]
  },
  {
    slug: "tb-500",
    name: "TB-500",
    peptideClass: "Thymosin beta-4 fragment research peptide",
    statusModel: "investigational_all",
    intro: "TB-500 is a research peptide with limited controlled human data for health related claims.",
    mechanism:
      "Proposed actions involve cell migration and tissue remodeling pathways based mainly on preclinical research.",
    effectivenessSummary:
      "Evidence quality remains low for most consumer discussed use cases, and clinical confidence is limited.",
    longDescription:
      "TB-500 is typically marketed in research or performance recovery discussions, but rigorous human evidence remains sparse. Biological plausibility is often inferred from preclinical observations rather than definitive clinical endpoint trials. Regulatory status is generally investigational, and data quality is not sufficient for broad therapeutic conclusions in mainstream practice. As with many research peptides, source quality variation and labeling inconsistency introduce additional uncertainty. This reference treats TB-500 as an evidence tracking topic and flags the gap between public claims and validated clinical data.",
    useCase: {
      slug: "recovery-support",
      name: "Recovery Support",
      evidenceGrade: "C",
      consumerSummary: "Claims are common online, but robust human evidence remains limited.",
      clinicalSummary: "Evidence base is low certainty with major translation gaps from preclinical findings."
    },
    dosing: {
      context: "STUDY_REPORTED",
      population: "Investigational cohorts",
      route: "Varies by protocol",
      startingDose: "Protocol specific",
      maintenanceDose: "Protocol specific",
      frequency: "Varies",
      notes: "Investigational context only and not treatment guidance."
    },
    safety: {
      adverseEffects: "Comprehensive human safety characterization is not established.",
      contraindications: "Contraindication framework remains unclear in current evidence.",
      interactions: "Interaction data are limited and non definitive.",
      monitoring: "Protocol based monitoring required in formal research settings."
    },
    claim: {
      section: "Research",
      claimText: "Current TB-500 evidence is predominantly preclinical and low certainty for clinical translation.",
      evidenceGrade: "C",
      sourceUrl: TRIALS_SOURCE,
      sourceTitle: "ClinicalTrials.gov API",
      publishedAt: "2024-03-10"
    }
  },
  {
    slug: "ipamorelin",
    name: "Ipamorelin",
    peptideClass: "Growth hormone secretagogue research peptide",
    statusModel: "investigational_all",
    intro: "Ipamorelin is a research secretagogue peptide with limited clinical evidence for broad health claims.",
    mechanism:
      "It is designed to stimulate growth hormone release through ghrelin receptor mediated pathways.",
    effectivenessSummary:
      "Human evidence remains limited and does not support broad claims seen in consumer marketing channels.",
    longDescription:
      "Ipamorelin is commonly referenced as a selective growth hormone secretagogue in performance and wellness discussions. Most claims exceed the strength of current controlled human evidence and rely on small studies or mechanistic rationale. Regulatory status remains investigational in major jurisdictions for broad use case claims. Any interpretation should consider confounding from multi compound protocols often used in non controlled settings. This database classifies ipamorelin as investigational and emphasizes evidence quality limitations and sourcing risks.",
    useCase: {
      slug: "growth-hormone-secretagogue",
      name: "Growth Hormone Secretagogue",
      evidenceGrade: "C",
      consumerSummary: "Evidence remains limited and does not support broad consumer level effectiveness claims.",
      clinicalSummary: "Low certainty human evidence with substantial external validity limitations."
    },
    dosing: {
      context: "STUDY_REPORTED",
      population: "Small investigational cohorts",
      route: "Subcutaneous",
      startingDose: "Protocol specific",
      maintenanceDose: "Protocol specific",
      frequency: "Daily or protocol dependent",
      notes: "Investigational context only and not treatment guidance."
    },
    safety: {
      adverseEffects: "Safety characterization remains incomplete in robust long term human studies.",
      contraindications: "Contraindication standards are not fully established for broad non trial use.",
      interactions: "Potential interaction with endocrine active therapies requires caution.",
      monitoring: "Research protocols should include endocrine and adverse event monitoring."
    },
    claim: {
      section: "Research",
      claimText: "Ipamorelin remains investigational with low certainty human evidence for broad health outcomes.",
      evidenceGrade: "C",
      sourceUrl: TRIALS_SOURCE,
      sourceTitle: "ClinicalTrials.gov API",
      publishedAt: "2024-01-31"
    }
  },
  {
    slug: "cjc-1295",
    name: "CJC-1295",
    peptideClass: "GHRH analog research peptide",
    statusModel: "investigational_all",
    intro: "CJC-1295 is an investigational GHRH analog discussed in growth hormone related research contexts.",
    mechanism:
      "It is engineered to prolong growth hormone releasing hormone signaling through extended pharmacokinetics.",
    effectivenessSummary: "Human evidence remains limited, with insufficient data for broad therapeutic conclusions.",
    longDescription:
      "CJC-1295 is a modified GHRH analog studied for prolonged endocrine signaling effects, but its evidence base is still limited for broad health applications. Public interest often outpaces clinical trial quality, and many claims are extrapolated from small or heterogeneous studies. Regulatory status is generally investigational across major jurisdictions. Safety and efficacy interpretation is complicated by co-administration with other compounds in non controlled contexts. This reference treats CJC-1295 as a research area and prioritizes caution around certainty, legal status, and source quality.",
    useCase: {
      slug: "growth-hormone-secretagogue",
      name: "Growth Hormone Secretagogue",
      evidenceGrade: "C",
      consumerSummary: "Evidence is still early and does not justify broad consumer treatment claims.",
      clinicalSummary: "Low certainty and limited controlled data for clinically actionable conclusions."
    },
    dosing: {
      context: "STUDY_REPORTED",
      population: "Investigational endocrine cohorts",
      route: "Subcutaneous",
      startingDose: "Protocol specific",
      maintenanceDose: "Protocol specific",
      frequency: "Protocol dependent",
      notes: "Investigational context only and not treatment guidance."
    },
    safety: {
      adverseEffects: "Long term safety remains incompletely defined in high quality clinical studies.",
      contraindications: "Validated contraindication frameworks are limited in current evidence.",
      interactions: "Potential endocrine interaction concerns require protocol level oversight.",
      monitoring: "Monitor endocrine markers and adverse effects in formal research settings."
    },
    claim: {
      section: "Research",
      claimText: "CJC-1295 currently has limited high quality human evidence for broad clinical claims.",
      evidenceGrade: "C",
      sourceUrl: TRIALS_SOURCE,
      sourceTitle: "ClinicalTrials.gov API",
      publishedAt: "2024-02-25"
    }
  }
];
