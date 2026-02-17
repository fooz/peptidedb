import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

type JurisdictionCode = "US" | "EU" | "UK" | "CA" | "AU";
type RegulatoryStatus = "US_FDA_APPROVED" | "NON_US_APPROVED" | "INVESTIGATIONAL" | "RESEARCH_ONLY";
type DosingContext = "APPROVED_LABEL" | "STUDY_REPORTED" | "EXPERT_CONSENSUS";

type StatusModel = "approved_global" | "investigational_all" | "non_us_approved_only" | "research_only";

type ReferenceSeed = {
  name: string;
  aliases?: string[];
  aliasToSlug?: string;
  peptideClass: string;
  useCaseSlug: string;
  useCaseName: string;
  statusModel: StatusModel;
};

const SOURCE_URL = "https://thepeptidelist.com/peptides";
const JURISDICTIONS: JurisdictionCode[] = ["US", "EU", "UK", "CA", "AU"];

const REFERENCE_PEPTIDES: ReferenceSeed[] = [
  {
    name: "Retatrutide",
    peptideClass: "Triple agonist peptide",
    useCaseSlug: "weight-management",
    useCaseName: "Weight Management",
    statusModel: "investigational_all"
  },
  {
    name: "Tirzepatide",
    aliases: ["Mounjaro", "Zepbound"],
    peptideClass: "Dual incretin peptide",
    useCaseSlug: "type-2-diabetes",
    useCaseName: "Type 2 Diabetes",
    statusModel: "approved_global"
  },
  {
    name: "BPC-157",
    peptideClass: "Synthetic peptide fragment",
    useCaseSlug: "tissue-repair",
    useCaseName: "Tissue Repair",
    statusModel: "investigational_all"
  },
  {
    name: "CJC-1295",
    peptideClass: "Growth hormone releasing hormone analog",
    useCaseSlug: "growth-hormone-secretagogue",
    useCaseName: "Growth Hormone Secretagogue",
    statusModel: "investigational_all"
  },
  {
    name: "CJC-1295 DAC",
    aliases: ["CJC-1295 with DAC"],
    aliasToSlug: "cjc-1295",
    peptideClass: "Growth hormone releasing hormone analog",
    useCaseSlug: "growth-hormone-secretagogue",
    useCaseName: "Growth Hormone Secretagogue",
    statusModel: "investigational_all"
  },
  {
    name: "Cagrilintide",
    peptideClass: "Amylin analog peptide",
    useCaseSlug: "weight-management",
    useCaseName: "Weight Management",
    statusModel: "investigational_all"
  },
  {
    name: "DSIP",
    aliases: ["Delta sleep-inducing peptide"],
    peptideClass: "Neuropeptide",
    useCaseSlug: "neurology-cognition",
    useCaseName: "Neurology & Cognition",
    statusModel: "investigational_all"
  },
  {
    name: "Copper Peptide (GHK-Cu)",
    aliases: ["GHK-Cu", "Copper tripeptide-1"],
    aliasToSlug: "ghk-cu",
    peptideClass: "Copper-binding tripeptide",
    useCaseSlug: "dermatology-aesthetics",
    useCaseName: "Dermatology & Aesthetics",
    statusModel: "investigational_all"
  },
  {
    name: "Follistatin",
    aliases: ["FST-344", "FST-315"],
    peptideClass: "Glycoprotein signaling peptide",
    useCaseSlug: "recovery-support",
    useCaseName: "Recovery Support",
    statusModel: "investigational_all"
  },
  {
    name: "Glutathione",
    peptideClass: "Tripeptide antioxidant",
    useCaseSlug: "immune-modulation",
    useCaseName: "Immune Modulation",
    statusModel: "investigational_all"
  },
  {
    name: "HCG",
    aliases: ["Human chorionic gonadotropin"],
    peptideClass: "Glycoprotein hormone",
    useCaseSlug: "reproductive-health",
    useCaseName: "Reproductive Health",
    statusModel: "approved_global"
  },
  {
    name: "HGH Fragment 176-191",
    aliases: ["AOD 9604 fragment"],
    peptideClass: "Growth hormone fragment peptide",
    useCaseSlug: "weight-management",
    useCaseName: "Weight Management",
    statusModel: "investigational_all"
  },
  {
    name: "HMG",
    aliases: ["Human menopausal gonadotropin", "Menotropins"],
    peptideClass: "Gonadotropin complex",
    useCaseSlug: "reproductive-health",
    useCaseName: "Reproductive Health",
    statusModel: "approved_global"
  },
  {
    name: "Hexarelin",
    peptideClass: "Growth hormone secretagogue peptide",
    useCaseSlug: "growth-hormone-secretagogue",
    useCaseName: "Growth Hormone Secretagogue",
    statusModel: "investigational_all"
  },
  {
    name: "Human Growth Hormone (hGH)",
    aliases: ["hGH", "Somatropin", "Growth hormone"],
    peptideClass: "Growth hormone peptide",
    useCaseSlug: "growth-hormone-deficiency",
    useCaseName: "Growth Hormone Deficiency",
    statusModel: "approved_global"
  },
  {
    name: "IGF-1 LR3",
    aliases: ["Long R3 IGF-1"],
    peptideClass: "Insulin-like growth factor analog peptide",
    useCaseSlug: "recovery-support",
    useCaseName: "Recovery Support",
    statusModel: "investigational_all"
  },
  {
    name: "Ipamorelin",
    peptideClass: "Growth hormone secretagogue peptide",
    useCaseSlug: "growth-hormone-secretagogue",
    useCaseName: "Growth Hormone Secretagogue",
    statusModel: "investigational_all"
  },
  {
    name: "KPV",
    aliases: ["Lys-Pro-Val", "Alpha-MSH fragment"],
    peptideClass: "Anti-inflammatory tripeptide fragment",
    useCaseSlug: "inflammatory-immune-modulation",
    useCaseName: "Inflammatory & Immune Modulation",
    statusModel: "investigational_all"
  },
  {
    name: "Kisspeptin-10",
    aliases: ["Kp-10"],
    aliasToSlug: "kisspeptin",
    peptideClass: "Neuroendocrine signaling peptide",
    useCaseSlug: "reproductive-health",
    useCaseName: "Reproductive Health",
    statusModel: "investigational_all"
  },
  {
    name: "LL-37",
    peptideClass: "Antimicrobial host-defense peptide",
    useCaseSlug: "immune-modulation",
    useCaseName: "Immune Modulation",
    statusModel: "investigational_all"
  },
  {
    name: "Melanotan I (Afamelanotide)",
    aliases: ["Afamelanotide", "Melanotan I"],
    peptideClass: "Alpha-MSH analog peptide",
    useCaseSlug: "dermatology-aesthetics",
    useCaseName: "Dermatology & Aesthetics",
    statusModel: "non_us_approved_only"
  },
  {
    name: "Melanotan II",
    peptideClass: "Alpha-MSH analog peptide",
    useCaseSlug: "sexual-health",
    useCaseName: "Sexual Health",
    statusModel: "investigational_all"
  },
  {
    name: "Methylsulfonylmethane",
    aliases: ["MSM"],
    peptideClass: "Non-peptide sulfur compound",
    useCaseSlug: "evidence-tracking",
    useCaseName: "Evidence Tracking",
    statusModel: "research_only"
  },
  {
    name: "MOTS-c",
    aliases: ["MOTS-c peptide"],
    aliasToSlug: "mots-c",
    peptideClass: "Mitochondrial-derived peptide",
    useCaseSlug: "cardiometabolic-risk-reduction",
    useCaseName: "Cardiometabolic Risk Reduction",
    statusModel: "investigational_all"
  },
  {
    name: "NAD+",
    aliases: ["Nicotinamide adenine dinucleotide"],
    peptideClass: "Coenzyme (non-peptide reference entry)",
    useCaseSlug: "evidence-tracking",
    useCaseName: "Evidence Tracking",
    statusModel: "research_only"
  },
  {
    name: "PEG-MGF",
    aliases: ["Pegylated mechano growth factor"],
    peptideClass: "IGF-1 splice variant analog",
    useCaseSlug: "recovery-support",
    useCaseName: "Recovery Support",
    statusModel: "investigational_all"
  },
  {
    name: "PT-141 (Bremelanotide)",
    aliases: ["Bremelanotide", "PT-141"],
    aliasToSlug: "pt-141",
    peptideClass: "Melanocortin receptor agonist peptide",
    useCaseSlug: "sexual-health",
    useCaseName: "Sexual Health",
    statusModel: "approved_global"
  },
  {
    name: "Selank",
    peptideClass: "Tuftsin analog neuropeptide",
    useCaseSlug: "neurology-cognition",
    useCaseName: "Neurology & Cognition",
    statusModel: "investigational_all"
  },
  {
    name: "Sermorelin",
    peptideClass: "Growth hormone releasing hormone analog",
    useCaseSlug: "growth-hormone-secretagogue",
    useCaseName: "Growth Hormone Secretagogue",
    statusModel: "investigational_all"
  },
  {
    name: "Snap-8",
    aliases: ["Acetyl octapeptide-3"],
    peptideClass: "Cosmeceutical peptide",
    useCaseSlug: "dermatology-aesthetics",
    useCaseName: "Dermatology & Aesthetics",
    statusModel: "research_only"
  },
  {
    name: "Tesamorelin",
    peptideClass: "Growth hormone releasing hormone analog",
    useCaseSlug: "hiv-lipodystrophy",
    useCaseName: "HIV Lipodystrophy",
    statusModel: "approved_global"
  },
  {
    name: "Thymalin",
    peptideClass: "Thymic peptide complex",
    useCaseSlug: "immune-modulation",
    useCaseName: "Immune Modulation",
    statusModel: "investigational_all"
  },
  {
    name: "Thymogen",
    aliases: ["Thymogen peptide"],
    peptideClass: "Thymic dipeptide",
    useCaseSlug: "immune-modulation",
    useCaseName: "Immune Modulation",
    statusModel: "investigational_all"
  },
  {
    name: "Adipotide (FTP)",
    aliases: ["FTPP", "Prohibitin-targeting adipotide"],
    peptideClass: "Pro-apoptotic targeting peptide",
    useCaseSlug: "weight-management",
    useCaseName: "Weight Management",
    statusModel: "investigational_all"
  },
  {
    name: "AOD 9604",
    aliases: ["HGH Fragment 176-191", "AOD9604"],
    aliasToSlug: "aod-9604",
    peptideClass: "Growth hormone fragment peptide",
    useCaseSlug: "weight-management",
    useCaseName: "Weight Management",
    statusModel: "investigational_all"
  },
  {
    name: "ARA-290 (Cibinetide)",
    aliases: ["Cibinetide", "ARA 290"],
    peptideClass: "Erythropoietin-derived tissue-protective peptide",
    useCaseSlug: "tissue-repair",
    useCaseName: "Tissue Repair",
    statusModel: "investigational_all"
  },
  {
    name: "ACE-031 (ActRIIB-Fc)",
    aliases: ["ActRIIB-Fc", "ACE-031"],
    peptideClass: "Myostatin pathway fusion protein",
    useCaseSlug: "recovery-support",
    useCaseName: "Recovery Support",
    statusModel: "investigational_all"
  },
  {
    name: "Adamax",
    peptideClass: "Experimental neuropeptide",
    useCaseSlug: "neurology-cognition",
    useCaseName: "Neurology & Cognition",
    statusModel: "investigational_all"
  },
  {
    name: "B7-33",
    peptideClass: "Relaxin receptor biased agonist peptide",
    useCaseSlug: "tissue-repair",
    useCaseName: "Tissue Repair",
    statusModel: "investigational_all"
  },
  {
    name: "B7-34",
    peptideClass: "Relaxin receptor biased agonist peptide",
    useCaseSlug: "tissue-repair",
    useCaseName: "Tissue Repair",
    statusModel: "investigational_all"
  },
  {
    name: "Cartalax",
    peptideClass: "Short regulatory peptide",
    useCaseSlug: "evidence-tracking",
    useCaseName: "Evidence Tracking",
    statusModel: "investigational_all"
  },
  {
    name: "DS5",
    peptideClass: "Experimental short peptide",
    useCaseSlug: "evidence-tracking",
    useCaseName: "Evidence Tracking",
    statusModel: "investigational_all"
  },
  {
    name: "Epitalon",
    aliases: ["Epithalon"],
    peptideClass: "Telomerase-associated short peptide",
    useCaseSlug: "evidence-tracking",
    useCaseName: "Evidence Tracking",
    statusModel: "investigational_all"
  },
  {
    name: "Gonadorelin",
    aliases: ["GnRH", "LHRH"],
    peptideClass: "Gonadotropin releasing hormone peptide",
    useCaseSlug: "reproductive-health",
    useCaseName: "Reproductive Health",
    statusModel: "approved_global"
  },
  {
    name: "GHRP-2",
    peptideClass: "Growth hormone releasing peptide",
    useCaseSlug: "growth-hormone-secretagogue",
    useCaseName: "Growth Hormone Secretagogue",
    statusModel: "investigational_all"
  },
  {
    name: "GHRP-6",
    peptideClass: "Growth hormone releasing peptide",
    useCaseSlug: "growth-hormone-secretagogue",
    useCaseName: "Growth Hormone Secretagogue",
    statusModel: "investigational_all"
  },
  {
    name: "Kisspeptin-54",
    aliases: ["Metastin", "Kp-54"],
    aliasToSlug: "kisspeptin",
    peptideClass: "Neuroendocrine signaling peptide",
    useCaseSlug: "reproductive-health",
    useCaseName: "Reproductive Health",
    statusModel: "investigational_all"
  },
  {
    name: "Larazotide Acetate",
    aliases: ["AT-1001", "Larazotide"],
    peptideClass: "Tight-junction modulating peptide",
    useCaseSlug: "gi-symptoms",
    useCaseName: "GI Symptoms",
    statusModel: "investigational_all"
  },
  {
    name: "P21",
    peptideClass: "Experimental neurotrophic peptide",
    useCaseSlug: "neurology-cognition",
    useCaseName: "Neurology & Cognition",
    statusModel: "investigational_all"
  },
  {
    name: "PE-22-28",
    peptideClass: "Experimental neuroactive peptide",
    useCaseSlug: "neurology-cognition",
    useCaseName: "Neurology & Cognition",
    statusModel: "investigational_all"
  },
  {
    name: "Pinealon",
    peptideClass: "Short regulatory peptide",
    useCaseSlug: "neurology-cognition",
    useCaseName: "Neurology & Cognition",
    statusModel: "investigational_all"
  },
  {
    name: "PNC-27",
    peptideClass: "Anticancer membrane-targeting peptide",
    useCaseSlug: "hormone-sensitive-cancers",
    useCaseName: "Hormone Sensitive Cancers",
    statusModel: "investigational_all"
  },
  {
    name: "SS-31 (Elamipretide)",
    aliases: ["Elamipretide", "MTP-131", "SS-31"],
    peptideClass: "Mitochondria-targeting tetrapeptide",
    useCaseSlug: "recovery-support",
    useCaseName: "Recovery Support",
    statusModel: "investigational_all"
  },
  {
    name: "Testagen",
    peptideClass: "Short regulatory peptide",
    useCaseSlug: "evidence-tracking",
    useCaseName: "Evidence Tracking",
    statusModel: "investigational_all"
  },
  {
    name: "Thymosin Alpha-1",
    aliases: ["Thymalfasin", "Tα1", "Ta1"],
    aliasToSlug: "thymalfasin-thymosin-alpha-1",
    peptideClass: "Immunomodulatory peptide",
    useCaseSlug: "immune-modulation",
    useCaseName: "Immune Modulation",
    statusModel: "non_us_approved_only"
  },
  {
    name: "Vilon",
    peptideClass: "Short regulatory peptide",
    useCaseSlug: "evidence-tracking",
    useCaseName: "Evidence Tracking",
    statusModel: "investigational_all"
  },
  {
    name: "VIP",
    aliases: ["Vasoactive intestinal peptide"],
    peptideClass: "Neuropeptide",
    useCaseSlug: "immune-modulation",
    useCaseName: "Immune Modulation",
    statusModel: "investigational_all"
  },
  {
    name: "5-Amino-1MQ",
    peptideClass: "Metabolic small-molecule reference entry",
    useCaseSlug: "weight-management",
    useCaseName: "Weight Management",
    statusModel: "research_only"
  },
  {
    name: "AHK-Cu",
    aliases: ["Copper peptide AHK-Cu"],
    peptideClass: "Copper-binding peptide",
    useCaseSlug: "dermatology-aesthetics",
    useCaseName: "Dermatology & Aesthetics",
    statusModel: "investigational_all"
  },
  {
    name: "AICAR",
    peptideClass: "AMPK pathway activator reference entry",
    useCaseSlug: "weight-management",
    useCaseName: "Weight Management",
    statusModel: "research_only"
  },
  {
    name: "Argireline",
    aliases: ["Acetyl hexapeptide-8"],
    peptideClass: "Cosmetic peptide",
    useCaseSlug: "dermatology-aesthetics",
    useCaseName: "Dermatology & Aesthetics",
    statusModel: "research_only"
  },
  {
    name: "Bioregulators",
    peptideClass: "Reference grouping entry",
    useCaseSlug: "evidence-tracking",
    useCaseName: "Evidence Tracking",
    statusModel: "research_only"
  },
  {
    name: "BPC157-TB500",
    aliases: ["BPC-157 + TB-500"],
    peptideClass: "Combination peptide protocol",
    useCaseSlug: "tissue-repair",
    useCaseName: "Tissue Repair",
    statusModel: "investigational_all"
  },
  {
    name: "Bronchogen",
    peptideClass: "Short bioregulator peptide",
    useCaseSlug: "evidence-tracking",
    useCaseName: "Evidence Tracking",
    statusModel: "investigational_all"
  },
  {
    name: "Cardiogen",
    peptideClass: "Short bioregulator peptide",
    useCaseSlug: "cardiometabolic-risk-reduction",
    useCaseName: "Cardiometabolic Risk Reduction",
    statusModel: "investigational_all"
  },
  {
    name: "Cerebrolysin",
    peptideClass: "Neurotrophic peptide mixture",
    useCaseSlug: "neurology-cognition",
    useCaseName: "Neurology & Cognition",
    statusModel: "investigational_all"
  },
  {
    name: "Chonluten",
    peptideClass: "Short bioregulator peptide",
    useCaseSlug: "tissue-repair",
    useCaseName: "Tissue Repair",
    statusModel: "investigational_all"
  },
  {
    name: "Cortagen",
    peptideClass: "Short neuropeptide bioregulator",
    useCaseSlug: "neurology-cognition",
    useCaseName: "Neurology & Cognition",
    statusModel: "investigational_all"
  },
  {
    name: "Decapeptide-12",
    peptideClass: "Cosmetic peptide",
    useCaseSlug: "dermatology-aesthetics",
    useCaseName: "Dermatology & Aesthetics",
    statusModel: "research_only"
  },
  {
    name: "Dermorphin",
    peptideClass: "Opioid receptor peptide",
    useCaseSlug: "evidence-tracking",
    useCaseName: "Evidence Tracking",
    statusModel: "investigational_all"
  },
  {
    name: "Dihexa",
    peptideClass: "Neuroactive peptide mimetic",
    useCaseSlug: "neurology-cognition",
    useCaseName: "Neurology & Cognition",
    statusModel: "investigational_all"
  },
  {
    name: "Eloralintide",
    peptideClass: "Amylin analog peptide",
    useCaseSlug: "weight-management",
    useCaseName: "Weight Management",
    statusModel: "investigational_all"
  },
  {
    name: "Enclomiphene",
    peptideClass: "Non-peptide endocrine modulator reference entry",
    useCaseSlug: "reproductive-health",
    useCaseName: "Reproductive Health",
    statusModel: "research_only"
  },
  {
    name: "FOXO4-DRI",
    aliases: ["FOX04"],
    peptideClass: "Senolytic peptide",
    useCaseSlug: "evidence-tracking",
    useCaseName: "Evidence Tracking",
    statusModel: "investigational_all"
  },
  {
    name: "Humanin",
    peptideClass: "Mitochondrial-derived peptide",
    useCaseSlug: "neurology-cognition",
    useCaseName: "Neurology & Cognition",
    statusModel: "investigational_all"
  },
  {
    name: "IGF-1 DES",
    aliases: ["Des(1-3) IGF-1"],
    peptideClass: "Insulin-like growth factor analog peptide",
    useCaseSlug: "recovery-support",
    useCaseName: "Recovery Support",
    statusModel: "investigational_all"
  },
  {
    name: "Livagen",
    peptideClass: "Short bioregulator peptide",
    useCaseSlug: "evidence-tracking",
    useCaseName: "Evidence Tracking",
    statusModel: "investigational_all"
  },
  {
    name: "LL37",
    aliases: ["LL-37"],
    aliasToSlug: "ll-37",
    peptideClass: "Antimicrobial host-defense peptide",
    useCaseSlug: "immune-modulation",
    useCaseName: "Immune Modulation",
    statusModel: "investigational_all"
  },
  {
    name: "Matrixyl",
    aliases: ["Palmitoyl pentapeptide-4"],
    peptideClass: "Cosmetic peptide complex",
    useCaseSlug: "dermatology-aesthetics",
    useCaseName: "Dermatology & Aesthetics",
    statusModel: "research_only"
  },
  {
    name: "Mazdutide",
    peptideClass: "Dual incretin peptide agonist",
    useCaseSlug: "weight-management",
    useCaseName: "Weight Management",
    statusModel: "investigational_all"
  },
  {
    name: "MK-677",
    aliases: ["Ibutamoren"],
    peptideClass: "Growth hormone secretagogue receptor agonist reference entry",
    useCaseSlug: "growth-hormone-secretagogue",
    useCaseName: "Growth Hormone Secretagogue",
    statusModel: "research_only"
  },
  {
    name: "Nonapeptide-1",
    peptideClass: "Skin pigmentation peptide",
    useCaseSlug: "dermatology-aesthetics",
    useCaseName: "Dermatology & Aesthetics",
    statusModel: "research_only"
  },
  {
    name: "Orforglipron",
    peptideClass: "Non-peptide GLP-1 receptor agonist reference entry",
    useCaseSlug: "weight-management",
    useCaseName: "Weight Management",
    statusModel: "research_only"
  },
  {
    name: "Ovagen",
    peptideClass: "Short bioregulator peptide",
    useCaseSlug: "reproductive-health",
    useCaseName: "Reproductive Health",
    statusModel: "investigational_all"
  },
  {
    name: "Pal-AHK",
    aliases: ["Palmitoyl tripeptide AHK"],
    peptideClass: "Cosmetic peptide",
    useCaseSlug: "dermatology-aesthetics",
    useCaseName: "Dermatology & Aesthetics",
    statusModel: "research_only"
  },
  {
    name: "Pal-GHK",
    aliases: ["Palmitoyl tripeptide GHK"],
    peptideClass: "Cosmetic peptide",
    useCaseSlug: "dermatology-aesthetics",
    useCaseName: "Dermatology & Aesthetics",
    statusModel: "research_only"
  },
  {
    name: "Palmitoyl-Dipeptide-6",
    peptideClass: "Cosmetic peptide",
    useCaseSlug: "dermatology-aesthetics",
    useCaseName: "Dermatology & Aesthetics",
    statusModel: "research_only"
  },
  {
    name: "Pancragen",
    peptideClass: "Short bioregulator peptide",
    useCaseSlug: "evidence-tracking",
    useCaseName: "Evidence Tracking",
    statusModel: "investigational_all"
  },
  {
    name: "Pentapeptide-18",
    aliases: ["Leuphasyl"],
    peptideClass: "Cosmetic peptide",
    useCaseSlug: "dermatology-aesthetics",
    useCaseName: "Dermatology & Aesthetics",
    statusModel: "research_only"
  },
  {
    name: "PGPIPN",
    peptideClass: "Immunomodulatory peptide fragment",
    useCaseSlug: "immune-modulation",
    useCaseName: "Immune Modulation",
    statusModel: "investigational_all"
  },
  {
    name: "Prostamax",
    peptideClass: "Short bioregulator peptide",
    useCaseSlug: "reproductive-health",
    useCaseName: "Reproductive Health",
    statusModel: "investigational_all"
  },
  {
    name: "SLU-PP-322",
    peptideClass: "Experimental metabolic compound reference entry",
    useCaseSlug: "weight-management",
    useCaseName: "Weight Management",
    statusModel: "research_only"
  },
  {
    name: "Survodutide",
    peptideClass: "Dual agonist peptide",
    useCaseSlug: "weight-management",
    useCaseName: "Weight Management",
    statusModel: "investigational_all"
  },
  {
    name: "Syn-Ake",
    aliases: ["Dipeptide diaminobutyroyl benzylamide diacetate"],
    peptideClass: "Cosmetic peptide mimic",
    useCaseSlug: "dermatology-aesthetics",
    useCaseName: "Dermatology & Aesthetics",
    statusModel: "research_only"
  },
  {
    name: "Syn-Coll",
    aliases: ["Palmitoyl tripeptide-5"],
    peptideClass: "Cosmetic peptide",
    useCaseSlug: "dermatology-aesthetics",
    useCaseName: "Dermatology & Aesthetics",
    statusModel: "research_only"
  },
  {
    name: "Tesofensine",
    peptideClass: "Non-peptide weight-management reference entry",
    useCaseSlug: "weight-management",
    useCaseName: "Weight Management",
    statusModel: "research_only"
  },
  {
    name: "Thymagen",
    peptideClass: "Short immunoregulatory peptide",
    useCaseSlug: "immune-modulation",
    useCaseName: "Immune Modulation",
    statusModel: "investigational_all"
  },
  {
    name: "Tripeptide-29",
    peptideClass: "Cosmetic peptide",
    useCaseSlug: "dermatology-aesthetics",
    useCaseName: "Dermatology & Aesthetics",
    statusModel: "research_only"
  },
  {
    name: "Vesilute",
    peptideClass: "Short bioregulator peptide",
    useCaseSlug: "evidence-tracking",
    useCaseName: "Evidence Tracking",
    statusModel: "investigational_all"
  },
  {
    name: "Vesugen",
    peptideClass: "Short bioregulator peptide",
    useCaseSlug: "evidence-tracking",
    useCaseName: "Evidence Tracking",
    statusModel: "investigational_all"
  },
  {
    name: "Vialox",
    aliases: ["Pentapeptide-3"],
    peptideClass: "Cosmetic peptide",
    useCaseSlug: "dermatology-aesthetics",
    useCaseName: "Dermatology & Aesthetics",
    statusModel: "research_only"
  }
];

function loadEnvFile(path: string): Record<string, string> {
  if (!fs.existsSync(path)) {
    return {};
  }
  const env: Record<string, string> = {};
  const text = fs.readFileSync(path, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const idx = trimmed.indexOf("=");
    if (idx === -1) {
      continue;
    }
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    env[key] = value;
  }
  return env;
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9+]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function statusForJurisdiction(model: StatusModel, code: JurisdictionCode): RegulatoryStatus {
  if (model === "research_only") {
    return "RESEARCH_ONLY";
  }
  if (model === "investigational_all") {
    return "INVESTIGATIONAL";
  }
  if (model === "non_us_approved_only") {
    return code === "US" ? "INVESTIGATIONAL" : "NON_US_APPROVED";
  }
  return code === "US" ? "US_FDA_APPROVED" : "NON_US_APPROVED";
}

function evidenceGradeForModel(model: StatusModel): "A" | "B" | "C" | "D" | "I" {
  if (model === "approved_global") {
    return "B";
  }
  if (model === "non_us_approved_only") {
    return "C";
  }
  if (model === "research_only") {
    return "D";
  }
  return "C";
}

function introFor(seed: ReferenceSeed): string {
  return `${seed.name} is listed for ${seed.useCaseName.toLowerCase()} in consumer peptide catalogs, and this profile summarizes current context for evidence-first review.`;
}

function mechanismFor(seed: ReferenceSeed): string {
  return `Mechanistic activity is described as ${seed.peptideClass.toLowerCase()}, but certainty varies by indication and study quality.`;
}

function effectivenessFor(seed: ReferenceSeed): string {
  if (seed.statusModel === "approved_global") {
    return "Evidence includes regulated clinical use in at least some jurisdictions, but indication-specific efficacy still depends on formulation and protocol.";
  }
  if (seed.statusModel === "non_us_approved_only") {
    return "Evidence supports selective regional use, while broader global adoption remains constrained by jurisdiction and indication limits.";
  }
  return "Human evidence remains mixed and often early-stage; outcomes should be interpreted with conservative clinical standards.";
}

function longDescriptionFor(seed: ReferenceSeed): string {
  return `${seed.name} is commonly discussed in peptide communities for ${seed.useCaseName.toLowerCase()}. Available literature ranges from exploratory studies to selective clinical experience, with major differences in formulation quality, study design, and endpoint rigor. For practical decision-making, this entry prioritizes an evidence-first stance: confirm jurisdiction status, evaluate source quality, and avoid extrapolating outcomes from anecdotal reports. Treatment suitability and risk tolerance should be clinician-guided, especially for endocrine, cardiometabolic, neurologic, and reproductive contexts.`;
}

function safetyFor(seed: ReferenceSeed): {
  adverseEffects: string;
  contraindications: string;
  interactions: string;
  monitoring: string;
} {
  return {
    adverseEffects:
      "Adverse effects vary by formulation and protocol; commonly discussed issues include GI symptoms, headache, fatigue, mood changes, and injection-site reactions.",
    contraindications:
      "Contraindications are indication-specific and should be screened clinically, including endocrine, oncologic, pregnancy, and allergy-related risk factors.",
    interactions:
      "Potential interactions with endocrine, metabolic, cardiovascular, or CNS-active therapies should be assessed before use.",
    monitoring:
      `Monitoring should be individualized for ${seed.useCaseName.toLowerCase()} goals, with symptom tracking, relevant labs, and protocol-aligned follow-up.`
  };
}

function dosingFor(seed: ReferenceSeed): {
  context: DosingContext;
  population: string;
  route: string;
  startingDose: string;
  maintenanceDose: string;
  frequency: string;
  notes: string;
} {
  const approved = seed.statusModel === "approved_global" || seed.statusModel === "non_us_approved_only";
  return {
    context: approved ? "APPROVED_LABEL" : "STUDY_REPORTED",
    population: approved ? "Adults in approved or protocol-defined use" : "Adults in investigational or protocol-defined use",
    route: "Route depends on formulation",
    startingDose: approved ? "Use region-specific label starting dose" : "Protocol-specific starting dose",
    maintenanceDose: approved ? "Use region-specific maintenance range" : "Protocol-specific maintenance dose",
    frequency: "Varies by protocol",
    notes: "Dosing should follow current local regulation, product labeling, and clinician-directed protocol."
  };
}

async function main() {
  const fileEnv = loadEnvFile(".env.local");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || fileEnv.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || fileEnv.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const { data: jurisdictionRows, error: jurisdictionError } = await supabase
    .from("jurisdictions")
    .select("id,code")
    .in("code", JURISDICTIONS);
  if (jurisdictionError || !jurisdictionRows) {
    throw new Error(jurisdictionError?.message ?? "Failed to load jurisdictions.");
  }

  const jurisdictionIdByCode = new Map<JurisdictionCode, number>();
  for (const row of jurisdictionRows) {
    jurisdictionIdByCode.set(row.code as JurisdictionCode, Number(row.id));
  }
  const usJurisdictionId = jurisdictionIdByCode.get("US");
  if (!usJurisdictionId) {
    throw new Error("US jurisdiction not found.");
  }

  const useCaseMap = new Map<string, number>();
  for (const seed of REFERENCE_PEPTIDES) {
    if (useCaseMap.has(seed.useCaseSlug)) {
      continue;
    }
    const { data: useCaseRow, error } = await supabase
      .from("use_cases")
      .upsert({ slug: seed.useCaseSlug, name: seed.useCaseName }, { onConflict: "slug" })
      .select("id")
      .single();
    if (error || !useCaseRow?.id) {
      throw new Error(error?.message ?? `Failed to upsert use case: ${seed.useCaseName}`);
    }
    useCaseMap.set(seed.useCaseSlug, Number(useCaseRow.id));
  }

  const { data: peptideRows, error: peptideError } = await supabase
    .from("peptides")
    .select("id,slug,canonical_name,is_published,peptide_aliases(alias)");
  if (peptideError || !peptideRows) {
    throw new Error(peptideError?.message ?? "Failed to load peptides.");
  }

  const existingSlugs = new Set<string>();
  const peptidesBySlug = new Map<string, { id: number; slug: string; name: string; published: boolean }>();
  const peptideByNormName = new Map<string, { id: number; slug: string; name: string; published: boolean }>();
  for (const row of peptideRows) {
    const entry = {
      id: Number(row.id),
      slug: String(row.slug),
      name: String(row.canonical_name),
      published: Boolean(row.is_published)
    };
    peptidesBySlug.set(entry.slug, entry);
    existingSlugs.add(entry.slug);
    const allNames = [entry.name, ...(row.peptide_aliases ?? []).map((aliasRow) => String(aliasRow.alias ?? ""))].filter(Boolean);
    for (const name of allNames) {
      peptideByNormName.set(normalize(name), entry);
    }
  }

  const stats = {
    processed: 0,
    created: 0,
    matchedExisting: 0,
    aliasesAdded: 0,
    useCasesUpserted: 0,
    publishedFlips: 0
  };
  const createdSlugs: string[] = [];

  for (const seed of REFERENCE_PEPTIDES) {
    stats.processed += 1;
    const byAliasTarget = seed.aliasToSlug ? peptidesBySlug.get(seed.aliasToSlug) ?? null : null;
    const byName = peptideByNormName.get(normalize(seed.name)) ?? null;
    const existing = byAliasTarget ?? byName;

    let peptideId: number;
    let peptideSlug: string;
    let peptideName: string;
    let wasCreated = false;

    if (existing) {
      stats.matchedExisting += 1;
      peptideId = existing.id;
      peptideSlug = existing.slug;
      peptideName = existing.name;
      if (!existing.published) {
        const { error } = await supabase.from("peptides").update({ is_published: true }).eq("id", peptideId);
        if (error) {
          throw new Error(error.message);
        }
        stats.publishedFlips += 1;
      }
    } else {
      let slug = slugify(seed.name);
      if (!slug) {
        slug = `peptide-${stats.processed}`;
      }
      if (existingSlugs.has(slug)) {
        let i = 2;
        while (existingSlugs.has(`${slug}-${i}`)) {
          i += 1;
        }
        slug = `${slug}-${i}`;
      }
      existingSlugs.add(slug);

      const { data: peptideInsert, error: insertError } = await supabase
        .from("peptides")
        .insert({
          slug,
          canonical_name: seed.name,
          peptide_class: seed.peptideClass,
          is_published: true
        })
        .select("id,slug,canonical_name")
        .single();
      if (insertError || !peptideInsert?.id) {
        throw new Error(insertError?.message ?? `Failed creating peptide: ${seed.name}`);
      }
      peptideId = Number(peptideInsert.id);
      peptideSlug = String(peptideInsert.slug);
      peptideName = String(peptideInsert.canonical_name);
      wasCreated = true;
      stats.created += 1;
      createdSlugs.push(peptideSlug);

      const { error: profileError } = await supabase.from("peptide_profiles").upsert(
        {
          peptide_id: peptideId,
          intro: introFor(seed),
          mechanism: mechanismFor(seed),
          effectiveness_summary: effectivenessFor(seed),
          long_description: longDescriptionFor(seed)
        },
        { onConflict: "peptide_id" }
      );
      if (profileError) {
        throw new Error(profileError.message);
      }

      const dosing = dosingFor(seed);
      const { error: dosingError } = await supabase.from("peptide_dosing_entries").insert({
        peptide_id: peptideId,
        jurisdiction_id: usJurisdictionId,
        context: dosing.context,
        population: dosing.population,
        route: dosing.route,
        starting_dose: dosing.startingDose,
        maintenance_dose: dosing.maintenanceDose,
        frequency: dosing.frequency,
        notes: dosing.notes
      });
      if (dosingError) {
        throw new Error(dosingError.message);
      }

      const safety = safetyFor(seed);
      const { error: safetyError } = await supabase.from("peptide_safety_entries").upsert(
        {
          peptide_id: peptideId,
          jurisdiction_id: usJurisdictionId,
          adverse_effects: safety.adverseEffects,
          contraindications: safety.contraindications,
          interactions: safety.interactions,
          monitoring: safety.monitoring
        },
        { onConflict: "peptide_id,jurisdiction_id" }
      );
      if (safetyError) {
        throw new Error(safetyError.message);
      }
    }

    const allAliases = new Set<string>([seed.name, ...(seed.aliases ?? [])].map((alias) => alias.trim()).filter(Boolean));
    for (const alias of allAliases) {
      const { error } = await supabase
        .from("peptide_aliases")
        .upsert({ peptide_id: peptideId, alias }, { onConflict: "peptide_id,alias" });
      if (error) {
        throw new Error(error.message);
      }
      stats.aliasesAdded += 1;
    }

    const useCaseId = useCaseMap.get(seed.useCaseSlug);
    if (!useCaseId) {
      throw new Error(`Missing use case id for ${seed.useCaseName}`);
    }
    const evidenceGrade = evidenceGradeForModel(seed.statusModel);
    const { error: useCaseError } = await supabase.from("peptide_use_cases").upsert(
      {
        peptide_id: peptideId,
        use_case_id: useCaseId,
        jurisdiction_id: usJurisdictionId,
        evidence_grade: evidenceGrade,
        consumer_summary: `${peptideName} is commonly discussed for ${seed.useCaseName.toLowerCase()}, with evidence quality currently rated as ${evidenceGrade}.`,
        clinical_summary:
          evidenceGrade === "B"
            ? "Clinical evidence includes regulated or advanced-stage use in selected indications."
            : "Evidence remains investigational or mixed, and indication-level conclusions require source-level review."
      },
      { onConflict: "peptide_id,use_case_id,jurisdiction_id" }
    );
    if (useCaseError) {
      throw new Error(useCaseError.message);
    }
    stats.useCasesUpserted += 1;

    for (const code of JURISDICTIONS) {
      const jurisdictionId = jurisdictionIdByCode.get(code);
      if (!jurisdictionId) {
        continue;
      }
      const status = statusForJurisdiction(seed.statusModel, code);

      const { error: deleteError } = await supabase
        .from("peptide_regulatory_status")
        .delete()
        .eq("peptide_id", peptideId)
        .eq("jurisdiction_id", jurisdictionId)
        .neq("status", status);
      if (deleteError) {
        throw new Error(deleteError.message);
      }

      const { error: statusError } = await supabase.from("peptide_regulatory_status").upsert(
        {
          peptide_id: peptideId,
          jurisdiction_id: jurisdictionId,
          status,
          notes: `Coverage sync reference: ${SOURCE_URL}`
        },
        { onConflict: "peptide_id,jurisdiction_id,status" }
      );
      if (statusError) {
        throw new Error(statusError.message);
      }
    }

    if (wasCreated) {
      peptideByNormName.set(normalize(seed.name), { id: peptideId, slug: peptideSlug, name: peptideName, published: true });
      peptidesBySlug.set(peptideSlug, { id: peptideId, slug: peptideSlug, name: peptideName, published: true });
    }
  }

  console.log(
    JSON.stringify(
      {
        source: SOURCE_URL,
        sourcePeptideCount: REFERENCE_PEPTIDES.length,
        ...stats,
        createdSlugs
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
