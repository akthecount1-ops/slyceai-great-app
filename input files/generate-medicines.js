#!/usr/bin/env node
/**
 * Arogya — Medicine Knowledge Base Generator
 * Run: node generate-medicines.js
 * Output: /data/knowledge/medicines/{slug}.json + index.json + README.md
 *
 * Compact row format:
 * [slug, name, generic, manufacturer, uses[], how_it_works,
 *  side_effects_common[], side_effects_serious[],
 *  drug_interactions[], food_interactions[],
 *  contraindications[], what_to_avoid[], dosage_forms[], storage]
 */

const fs = require("fs");
const path = require("path");

const MED_DIR = path.join(__dirname, "data", "knowledge", "medicines");
fs.mkdirSync(MED_DIR, { recursive: true });

const TODAY = new Date().toISOString();

const MEDS = [
  // ── DIABETES ──────────────────────────────────────────────────────────────
  ["metformin","Metformin 500mg","Metformin Hydrochloride","Sun Pharma / Generic",
    ["Type 2 diabetes mellitus","Insulin resistance","PCOD/PCOS (off-label)","Pre-diabetes"],
    "Reduces hepatic glucose production and improves insulin sensitivity in peripheral tissues without stimulating insulin secretion.",
    ["Nausea","Diarrhea","Stomach upset","Metallic taste","Loss of appetite"],
    ["Lactic acidosis (rare but serious)","Vitamin B12 deficiency (long-term)"],
    ["Contrast dye (hold 48h before/after imaging)","Alcohol","Furosemide","Cimetidine"],
    ["Alcohol increases lactic acidosis risk","High-carb meals can reduce efficacy"],
    ["Kidney failure (eGFR<30)","Liver failure","Alcoholism","Contrast media use"],
    ["Avoid excessive alcohol","Do not crush extended-release tablets","Hold before surgery"],
    ["Tablet 500mg","Tablet 850mg","Tablet 1000mg","Extended release tablet"],
    "Store below 25°C, away from moisture"],

  ["glipizide","Glipizide","Glipizide","Pfizer / Generic",
    ["Type 2 diabetes mellitus","Adjunct to diet and exercise"],
    "Stimulates pancreatic beta cells to release insulin by blocking ATP-sensitive potassium channels.",
    ["Hypoglycemia","Nausea","Diarrhea","Dizziness","Weight gain"],
    ["Severe hypoglycemia","Hepatotoxicity (rare)","Agranulocytosis (rare)"],
    ["Fluconazole","NSAIDs","Beta-blockers (mask hypoglycemia symptoms)","Alcohol"],
    ["Alcohol can cause severe hypoglycemia","Fasting increases hypoglycemia risk"],
    ["Type 1 diabetes","Diabetic ketoacidosis","Kidney failure","Sulfa allergy"],
    ["Take 30 minutes before meals","Carry glucose tablets","Avoid skipping meals"],
    ["Tablet 5mg","Tablet 10mg"],
    "Store below 30°C"],

  ["sitagliptin","Januvia (Sitagliptin)","Sitagliptin Phosphate","MSD / Merck",
    ["Type 2 diabetes mellitus","Used alone or in combination with metformin"],
    "DPP-4 inhibitor that increases incretin levels (GLP-1, GIP), which stimulate insulin release and suppress glucagon in a glucose-dependent manner.",
    ["Nasopharyngitis","Headache","Nausea","Mild hypoglycemia (when combined with sulfonylurea)"],
    ["Pancreatitis","Severe joint pain","Heart failure (monitor)","Severe allergic reactions"],
    ["Digoxin","Sulfonylureas (increased hypoglycemia risk)"],
    ["No significant food interactions"],
    ["Type 1 diabetes","Diabetic ketoacidosis","Severe kidney disease"],
    ["Report severe and persistent stomach pain immediately","Monitor kidney function annually"],
    ["Tablet 25mg","Tablet 50mg","Tablet 100mg"],
    "Store below 25°C"],

  // ── HYPERTENSION / CARDIAC ────────────────────────────────────────────────
  ["amlodipine","Amlodipine 5mg","Amlodipine Besylate","Pfizer / Generic",
    ["Hypertension (high blood pressure)","Stable angina","Vasospastic angina","Coronary artery disease"],
    "Calcium channel blocker that relaxes vascular smooth muscle, dilating arterioles and reducing peripheral resistance and cardiac afterload.",
    ["Ankle swelling","Flushing","Headache","Dizziness","Fatigue","Palpitations"],
    ["Symptomatic hypotension","Severe liver impairment","Rare skin reactions (Stevens-Johnson)"],
    ["Cyclosporine","Simvastatin (limit dose)","Tacrolimus","Strong CYP3A4 inhibitors"],
    ["Grapefruit juice increases drug levels — avoid","Alcohol amplifies blood pressure lowering"],
    ["Severe hypotension","Severe aortic stenosis","Cardiogenic shock"],
    ["Avoid grapefruit juice","Rise slowly from seated/lying position","Do not stop suddenly"],
    ["Tablet 2.5mg","Tablet 5mg","Tablet 10mg"],
    "Store below 30°C, protect from light"],

  ["losartan","Losartan 50mg","Losartan Potassium","MSD / Generic",
    ["Hypertension","Diabetic nephropathy","Heart failure","Stroke prevention in hypertension with LVH"],
    "Angiotensin II receptor blocker (ARB) that blocks AT1 receptors, reducing vasoconstriction and aldosterone secretion, lowering blood pressure.",
    ["Dizziness","Hyperkalemia","Upper respiratory infection","Diarrhea","Back pain"],
    ["Angioedema","Severe hypotension (first dose)","Acute kidney injury","Fetal toxicity"],
    ["Potassium-sparing diuretics","NSAIDs","Lithium","ACE inhibitors (dual blockade risk)"],
    ["Potassium-rich foods (bananas, coconut water) may worsen hyperkalemia","Salt substitutes containing potassium"],
    ["Pregnancy (all trimesters)","Bilateral renal artery stenosis","Hyperkalemia","Aliskiren use in diabetes"],
    ["Avoid potassium supplements without doctor approval","Monitor kidney function and potassium","Do not use in pregnancy"],
    ["Tablet 25mg","Tablet 50mg","Tablet 100mg"],
    "Store below 25°C"],

  ["telmisartan","Telmisartan 40mg","Telmisartan","Boehringer Ingelheim / Generic",
    ["Hypertension","Cardiovascular risk reduction in patients with established CV disease","Diabetic nephropathy"],
    "Long-acting ARB that selectively blocks angiotensin II type 1 receptors, reducing blood pressure for up to 24 hours.",
    ["Dizziness","Hyperkalemia","Back pain","Upper respiratory infection","Diarrhea"],
    ["Angioedema","Severe hypotension","Fetal toxicity","Acute kidney injury"],
    ["Digoxin (levels increased)","Ramipril (dual RAAS blockade)","Lithium","NSAIDs"],
    ["Avoid high-potassium foods if prone to hyperkalemia","Alcohol enhances blood pressure lowering"],
    ["Pregnancy","Severe liver disease","Biliary obstruction","Hyperkalemia"],
    ["Take at same time daily","Do not stop abruptly","Monitor potassium and kidney function"],
    ["Tablet 20mg","Tablet 40mg","Tablet 80mg"],
    "Store below 30°C"],

  ["atenolol","Atenolol 50mg","Atenolol","AstraZeneca / Generic",
    ["Hypertension","Angina pectoris","Cardiac arrhythmias","Post-myocardial infarction"],
    "Selective beta-1 adrenoceptor blocker that reduces heart rate and cardiac output, lowering blood pressure and myocardial oxygen demand.",
    ["Bradycardia","Fatigue","Cold extremities","Dizziness","Depression","Sexual dysfunction"],
    ["Severe bradycardia","Heart block","Severe heart failure","Bronchospasm"],
    ["Verapamil/diltiazem (risk of heart block)","Clonidine (rebound hypertension on withdrawal)","NSAIDs","Insulin (masks hypoglycemia)"],
    ["Alcohol amplifies hypotensive effects"],
    ["Asthma/COPD","Sinus bradycardia","Cardiogenic shock","2nd/3rd degree AV block"],
    ["Never stop suddenly — taper over 1–2 weeks","Masks hypoglycemia symptoms in diabetics","Avoid cold remedies with pseudoephedrine"],
    ["Tablet 25mg","Tablet 50mg","Tablet 100mg"],
    "Store below 25°C, away from moisture"],

  ["aspirin_low","Aspirin 75mg","Acetylsalicylic Acid","Bayer / Generic",
    ["Antiplatelet therapy in cardiovascular disease","Secondary prevention of MI and stroke","Atrial fibrillation risk reduction"],
    "Irreversibly inhibits cyclooxygenase (COX-1 and COX-2), preventing thromboxane A2 formation and platelet aggregation.",
    ["Stomach irritation","Nausea","GI upset","Heartburn","Easy bruising"],
    ["GI bleeding","Peptic ulcer hemorrhage","Hemorrhagic stroke","Reye's syndrome in children","Aspirin-exacerbated respiratory disease"],
    ["Warfarin (increased bleeding)","Methotrexate","NSAIDs","Clopidogrel","SSRIs","Ibuprofen (reduces antiplatelet effect)"],
    ["Alcohol significantly increases GI bleeding risk","Take with food"],
    ["Active peptic ulcer","GI bleeding","Hemophilia","Children under 16 (risk of Reye's syndrome)","Severe kidney/liver disease"],
    ["Always take with food or milk","Do not combine with regular NSAIDs","Tell all doctors you are on aspirin","Avoid alcohol"],
    ["Tablet 75mg","Tablet 150mg","Tablet 300mg","Enteric-coated tablet"],
    "Store below 25°C, keep dry"],

  ["atorvastatin","Atorvastatin 10mg","Atorvastatin Calcium","Pfizer / Generic",
    ["Hypercholesterolemia","Prevention of cardiovascular events","Familial hypercholesterolemia","Dyslipidemia","Type 2 diabetes with CV risk"],
    "HMG-CoA reductase inhibitor (statin) that blocks cholesterol synthesis in the liver, reducing LDL cholesterol and triglycerides while raising HDL.",
    ["Headache","Nausea","Diarrhea","Muscle aches","Joint pain","Elevated liver enzymes"],
    ["Rhabdomyolysis (severe muscle breakdown)","Hepatotoxicity","Myopathy","New-onset diabetes (long-term)"],
    ["Cyclosporine","Gemfibrozil","Macrolide antibiotics","Azole antifungals","Niacin","Digoxin","Colchicine"],
    ["Grapefruit juice significantly increases drug levels — avoid completely","Alcohol increases liver damage risk"],
    ["Active liver disease","Pregnancy and breastfeeding","Unexplained persistent elevated liver enzymes","Allergy to statins"],
    ["Avoid grapefruit completely","Report unexplained muscle pain immediately","Liver function tests periodically","Take at any time of day"],
    ["Tablet 5mg","Tablet 10mg","Tablet 20mg","Tablet 40mg","Tablet 80mg"],
    "Store below 25°C"],

  ["clopidogrel","Clopidogrel 75mg","Clopidogrel Bisulfate","Sanofi / Generic",
    ["Prevention of atherosclerotic events in MI, stroke, or peripheral arterial disease","Acute coronary syndrome","After coronary stent placement"],
    "Irreversibly blocks the P2Y12 ADP receptor on platelets, preventing platelet activation and aggregation.",
    ["Bleeding","Bruising","Nausea","Diarrhea","Abdominal pain","Headache"],
    ["Severe bleeding including intracranial","TTP (rare)","GI hemorrhage"],
    ["Aspirin","Warfarin","PPIs — omeprazole/esomeprazole reduce efficacy","NSAIDs","SSRIs"],
    ["Alcohol increases bleeding risk","Take with food to reduce GI upset"],
    ["Active pathological bleeding","Severe liver impairment","Allergy to clopidogrel"],
    ["Never stop without cardiologist approval — risk of stent thrombosis","Inform all surgeons/dentists","Avoid omeprazole — use pantoprazole instead"],
    ["Tablet 75mg","Tablet 300mg"],
    "Store below 25°C, protect from moisture"],

  // ── THYROID ───────────────────────────────────────────────────────────────
  ["levothyroxine","Eltroxin / Thyronorm","Levothyroxine Sodium","Abbott / GlaxoSmithKline",
    ["Hypothyroidism","Thyroid hormone replacement","Thyroid cancer (post-surgery)","Goiter"],
    "Synthetic T4 thyroid hormone that is converted to active T3 in peripheral tissues, restoring normal metabolic function.",
    ["Palpitations if dose too high","Sweating","Headache","Diarrhea","Weight loss (overdose)","Insomnia"],
    ["Cardiac arrhythmias (overdose)","Bone loss with long-term over-treatment","Adrenal crisis if started before cortisol replacement"],
    ["Calcium/antacids (take 4h apart)","Iron supplements (take 4h apart)","Warfarin","Digoxin","Estrogen","Rifampin"],
    ["Take 30–60 minutes before breakfast on empty stomach","Coffee and soy milk reduce absorption"],
    ["Untreated adrenal insufficiency","Thyrotoxicosis","Acute MI (use with caution)"],
    ["Always take on empty stomach at the same time daily","Never miss a dose","TSH levels checked regularly","Many interactions — inform all doctors"],
    ["Tablet 25mcg","Tablet 50mcg","Tablet 75mcg","Tablet 100mcg","Tablet 150mcg"],
    "Store below 25°C, protect from light and moisture"],

  // ── GI / ACID REFLUX ──────────────────────────────────────────────────────
  ["omeprazole","Omeprazole 20mg","Omeprazole","AstraZeneca / Generic",
    ["GERD (acid reflux)","Peptic ulcer disease","H. pylori eradication (in combination)","Zollinger-Ellison syndrome","NSAID-induced ulcer prevention"],
    "Proton pump inhibitor (PPI) that irreversibly blocks H+/K+ ATPase in gastric parietal cells, potently suppressing acid production.",
    ["Headache","Nausea","Diarrhea","Abdominal pain","Constipation","Flatulence"],
    ["Hypomagnesemia (long-term)","Vitamin B12 deficiency (long-term)","C. diff infection","Bone fractures (long-term)","Kidney disease (chronic use)"],
    ["Clopidogrel (reduces antiplatelet effect — avoid)","Methotrexate","Warfarin","Ketoconazole","Digoxin","Iron absorption reduced"],
    ["Alcohol worsens acid reflux and interacts with medication","Caffeine and spicy foods worsen GERD"],
    ["Known allergy to PPIs or benzimidazoles","Use with caution in liver disease"],
    ["Take 30–60 minutes before meals","Use for shortest effective duration","Do not crush or chew delayed-release capsules","Long-term use needs monitoring"],
    ["Capsule 10mg","Capsule 20mg","Capsule 40mg","Tablet 20mg (dispersible)"],
    "Store below 25°C, protect from moisture"],

  ["pantoprazole","Pan 40 / Pantodac","Pantoprazole Sodium","Sun Pharma / Generic",
    ["GERD","Peptic ulcer disease","H. pylori eradication","Prevention of NSAID-related ulcers","Stress ulcer prophylaxis"],
    "Proton pump inhibitor that binds irreversibly to H+/K+ ATPase on gastric parietal cells. Fewer drug interactions than omeprazole.",
    ["Headache","Diarrhea","Nausea","Abdominal pain","Flatulence"],
    ["Hypomagnesemia","Vitamin B12 deficiency","C. diff infection","Bone fractures (long-term)"],
    ["Methotrexate","Warfarin (minor)","Atazanavir (avoid combination)"],
    ["Take before meals for best effect","Alcohol increases GI irritation"],
    ["Allergy to PPIs"],
    ["Preferred PPI when on clopidogrel (unlike omeprazole)","Use minimum effective dose for minimum duration"],
    ["Tablet 20mg","Tablet 40mg","Injection 40mg (IV)"],
    "Store below 30°C"],

  ["ranitidine_replacement","Famotidine 20mg","Famotidine","Johnson & Johnson / Generic",
    ["GERD","Peptic ulcer","Heartburn","Zollinger-Ellison syndrome","Prevention of stress ulcers"],
    "H2 receptor antagonist that competitively inhibits histamine at gastric parietal cell H2 receptors, reducing gastric acid secretion.",
    ["Headache","Dizziness","Constipation","Diarrhea","Nausea"],
    ["QT prolongation (high doses)","Thrombocytopenia (rare)","Confusion (elderly patients)"],
    ["Ketoconazole","Atazanavir","Antacids reduce absorption"],
    ["Alcohol increases GI irritation","Smoking reduces efficacy"],
    ["Severe kidney disease (reduce dose)","Allergy to H2 blockers"],
    ["Antacids should be taken separately (2h apart)","Suitable for pregnancy (unlike omeprazole — consult doctor)"],
    ["Tablet 20mg","Tablet 40mg"],
    "Store below 25°C"],

  // ── PAIN / FEVER / INFLAMMATION ───────────────────────────────────────────
  ["paracetamol","Calpol / Dolo 650","Paracetamol (Acetaminophen)","GSK / Micro Labs",
    ["Mild to moderate pain relief","Fever (antipyretic)","Headache","Dental pain","Post-immunization fever","Arthritis pain (mild)"],
    "Inhibits prostaglandin synthesis in the CNS and peripherally blocks pain impulse generation. Exact antipyretic mechanism involves endocannabinoid system modulation.",
    ["Generally very well tolerated","Rare: skin rash","Nausea (at high doses)"],
    ["Hepatotoxicity (overdose or with chronic alcohol use)","Acute liver failure","Severe skin reactions (rare — DRESS, SJS)"],
    ["Warfarin (increased INR)","Isoniazid (liver toxicity)","Alcohol","Other paracetamol-containing products (many cold medicines)"],
    ["Alcohol with regular paracetamol causes severe liver damage","Do not exceed 4g/day total from ALL sources"],
    ["Severe liver disease","Allergy to paracetamol"],
    ["Maximum 4 grams per day — check ALL products for hidden paracetamol","Do not give adult doses to children","Store safely from children"],
    ["Tablet 500mg","Tablet 650mg","Syrup 250mg/5ml","IV infusion 10mg/ml","Suppository"],
    "Store below 30°C"],

  ["ibuprofen","Brufen / Combiflam","Ibuprofen","Abbott / Generic",
    ["Mild to moderate pain","Fever","Inflammatory conditions","Arthritis","Dental pain","Dysmenorrhea (period pain)","Headache"],
    "Non-selective COX-1 and COX-2 inhibitor that reduces prostaglandin synthesis, decreasing pain, fever, and inflammation.",
    ["GI upset","Nausea","Heartburn","Dizziness","Headache","Fluid retention"],
    ["GI bleeding and ulceration","Acute kidney injury","Cardiovascular events (prolonged use)","Bronchospasm in aspirin-sensitive asthma","Liver damage (rare)"],
    ["Aspirin (reduces cardioprotective effect)","Warfarin","Methotrexate","ACE inhibitors/ARBs","Lithium","SSRIs","Corticosteroids"],
    ["Always take with food or milk","Avoid alcohol — increases GI bleeding risk","Avoid in dehydration"],
    ["Active peptic ulcer","GI bleeding","Severe kidney or liver disease","Third trimester pregnancy","Aspirin allergy","Heart failure","After bypass surgery"],
    ["Always take with food","Avoid the longest course necessary","Drink adequate water","Avoid in kidney disease","Safer alternatives in elderly: paracetamol preferred"],
    ["Tablet 200mg","Tablet 400mg","Tablet 600mg","Syrup 100mg/5ml","Gel topical"],
    "Store below 25°C"],

  ["diclofenac","Voveran / Voltaren","Diclofenac Sodium","Novartis / Generic",
    ["Arthritis (osteo and rheumatoid)","Ankylosing spondylitis","Dental pain","Post-operative pain","Gout","Dysmenorrhea","Sports injuries (topical)"],
    "Preferentially inhibits COX-2 over COX-1, reducing prostaglandin synthesis with somewhat less GI toxicity than ibuprofen.",
    ["GI upset","Headache","Dizziness","Elevated liver enzymes","Fluid retention"],
    ["GI bleeding","Hepatotoxicity","Cardiovascular events","Acute kidney injury","Severe skin reactions"],
    ["Warfarin","Methotrexate","Lithium","ACE inhibitors","Cyclosporine","Aspirin","SSRIs"],
    ["Alcohol increases GI and liver toxicity","Take with food or milk"],
    ["Active GI ulcers","Severe kidney/liver disease","Third trimester pregnancy","Coronary artery disease","Post-CABG","Allergy to NSAIDs"],
    ["Use lowest effective dose for shortest duration","Topical gel preferred when possible (lower systemic risk)","Monitor BP and kidney function long-term"],
    ["Tablet 50mg","Tablet 75mg (SR)","Injection 75mg/3ml","Gel 1%","Eye drops"],
    "Store below 25°C, protect from light"],

  // ── ANTIBIOTICS ───────────────────────────────────────────────────────────
  ["azithromycin","Azee / Zithromax","Azithromycin","Cipla / Pfizer",
    ["Community-acquired pneumonia","Sinusitis","Tonsillopharyngitis","Skin and soft tissue infections","Chlamydia","Typhoid (children)","H. pylori (combination)"],
    "Macrolide antibiotic that binds to 50S ribosomal subunit, inhibiting bacterial protein synthesis. Long tissue half-life allows short course therapy.",
    ["Nausea","Vomiting","Diarrhea","Abdominal pain","Headache"],
    ["QT prolongation and cardiac arrhythmias","Hepatotoxicity","Hearing loss (high doses)","Severe allergic reaction"],
    ["Antacids containing aluminum/magnesium (take 2h apart)","Warfarin","Digoxin","Ergot alkaloids","Drugs that prolong QT"],
    ["Can be taken with or without food","Alcohol may worsen GI side effects"],
    ["Allergy to macrolides","Hepatic disease","QT prolongation","Low potassium or magnesium levels"],
    ["Complete the full course even if feeling better","Report palpitations or irregular heartbeat","Do not use antacids within 2 hours"],
    ["Tablet 250mg","Tablet 500mg","Oral suspension 200mg/5ml","IV infusion 500mg"],
    "Store below 30°C, away from moisture"],

  ["amoxicillin","Mox / Novamox","Amoxicillin Trihydrate","GSK / Cipla",
    ["Respiratory tract infections","Ear infections","Tonsillitis","UTI","Skin infections","H. pylori eradication (with clarithromycin and PPI)","Dental infections"],
    "Broad-spectrum aminopenicillin antibiotic that inhibits bacterial cell wall synthesis by binding penicillin-binding proteins.",
    ["Nausea","Diarrhea","Skin rash","Vomiting","Headache"],
    ["Anaphylaxis (penicillin allergy)","Stevens-Johnson syndrome","Pseudomembranous colitis","Seizures (high doses)"],
    ["Methotrexate","Warfarin","Oral contraceptives (minor interaction)","Allopurinol (increased rash)"],
    ["Can be taken with or without food","Alcohol may reduce immune effectiveness"],
    ["Penicillin allergy","Mononucleosis (high risk of widespread rash)"],
    ["Complete full course","Report rash immediately — can indicate allergy","Probiotics can help prevent diarrhea"],
    ["Capsule 250mg","Capsule 500mg","Oral suspension 125mg/5ml","Oral suspension 250mg/5ml","Drops 100mg/ml"],
    "Store below 25°C, oral suspension refrigerate and discard after 7 days"],

  ["ciprofloxacin","Ciplox","Ciprofloxacin Hydrochloride","Cipla / Bayer",
    ["UTI","Diarrheal illnesses","Typhoid fever","Respiratory infections","Bone and joint infections","Skin infections","Anthrax prophylaxis"],
    "Fluoroquinolone antibiotic that inhibits bacterial DNA gyrase and topoisomerase IV, preventing DNA replication and repair.",
    ["Nausea","Diarrhea","Headache","Dizziness","Sensitivity to sunlight","Tendon pain"],
    ["Tendon rupture (especially Achilles)","QT prolongation","Peripheral neuropathy","CNS effects (seizures)","C. diff infection"],
    ["Antacids/iron/calcium (take 2h apart)","Theophylline","Warfarin","NSAIDs","Drugs that prolong QT","Tizanidine (avoid)"],
    ["Dairy products and calcium-fortified juices reduce absorption — take 2h apart","Avoid caffeine (levels increased)"],
    ["Allergy to fluoroquinolones","Children under 18 (risk of arthropathy — use only when no alternatives)","Pregnancy and breastfeeding","Myasthenia gravis"],
    ["Use sun protection — photosensitivity","Stop immediately if tendon pain","Complete full course","Avoid antacids, milk, iron within 2 hours","Drink plenty of water"],
    ["Tablet 250mg","Tablet 500mg","Tablet 750mg","IV infusion","Eye drops","Ear drops"],
    "Store below 30°C, protect from light"],

  ["doxycycline","Doxycycline","Doxycycline Monohydrate/Hyclate","GSK / Generic",
    ["Respiratory infections","Chlamydia and STIs","Malaria prophylaxis","Lyme disease","Acne (long-term)","Rickettsial infections","Dengue (supportive — off-label)"],
    "Tetracycline antibiotic that binds to 30S ribosomal subunit, reversibly inhibiting aminoacyl-tRNA binding to mRNA-ribosome complex.",
    ["Nausea","Esophageal irritation","Photosensitivity","Diarrhea","Skin discoloration"],
    ["Esophageal ulceration","Severe photosensitivity","Hepatotoxicity","Intracranial hypertension (pseudotumor cerebri)","Tooth discoloration (children)"],
    ["Antacids/iron/calcium/zinc","Oral contraceptives (reduced efficacy)","Warfarin","Retinoids","Barbiturates"],
    ["Dairy products reduce absorption (take 1h before or 2h after)","Avoid sunlight during treatment"],
    ["Children under 8 (tooth discoloration and bone effects)","Pregnancy and breastfeeding","Esophageal obstruction","Allergy to tetracyclines"],
    ["Take with full glass of water and remain upright for 30 minutes","Strict sun protection","Avoid antacids/dairy near dose time"],
    ["Capsule 100mg","Tablet 100mg","Oral suspension"],
    "Store below 25°C, protect from light"],

  // ── ALLERGIES / RESPIRATORY ───────────────────────────────────────────────
  ["cetirizine","Zyrtec / CTZ","Cetirizine Hydrochloride","UCB / Generic",
    ["Allergic rhinitis (hay fever)","Urticaria (hives)","Atopic dermatitis","Allergic conjunctivitis","Chronic idiopathic urticaria"],
    "Second-generation H1 antihistamine that selectively blocks peripheral histamine H1 receptors with minimal CNS penetration compared to first-generation antihistamines.",
    ["Drowsiness (less than first-gen)","Dry mouth","Headache","Fatigue","Nausea"],
    ["Severe drowsiness in sensitive individuals","Urinary retention","Elevated liver enzymes (rare)"],
    ["Alcohol (additive CNS depression)","Other CNS depressants","Theophylline (minor)"],
    ["Alcohol significantly increases drowsiness"],
    ["Severe kidney disease (reduce dose)","End-stage renal disease","Allergy to hydroxyzine or cetirizine"],
    ["Caution when driving — can cause drowsiness","Take at night if drowsiness is a problem","Not addictive"],
    ["Tablet 5mg","Tablet 10mg","Syrup 5mg/5ml","Drops 10mg/ml"],
    "Store below 25°C"],

  ["montelukast","Singulair / Montair","Montelukast Sodium","MSD / Cipla",
    ["Asthma prophylaxis","Allergic rhinitis","Exercise-induced bronchoconstriction","Urticaria (off-label)"],
    "Cysteinyl leukotriene receptor antagonist (LTRA) that blocks LTD4, LTC4, LTE4 from binding to receptors in airways, reducing airway inflammation and bronchoconstriction.",
    ["Headache","Nausea","Diarrhea","Abdominal pain","Upper respiratory infection symptoms"],
    ["Neuropsychiatric events (agitation, depression, suicidal ideation — FDA warning)","Eosinophilic granulomatosis (rare)"],
    ["Phenobarbital and phenytoin (reduced efficacy)","Rifampicin"],
    ["Can be taken with or without food","Evening administration preferred for asthma"],
    ["Allergy to montelukast","Not for acute asthma attacks (rescue use)"],
    ["Not a rescue inhaler — must continue other controllers","Report mood changes, aggression, or suicidal thoughts immediately","Review benefit-risk annually"],
    ["Tablet 10mg","Chewable tablet 4mg (children 2-5)","Chewable tablet 5mg (children 6-14)","Granules 4mg sachet"],
    "Store below 25°C, protect from moisture and light"],

  ["salbutamol","Asthalin / Ventolin","Salbutamol Sulfate","Cipla / GSK",
    ["Acute bronchospasm in asthma","COPD acute exacerbation","Exercise-induced bronchospasm","Hyperkalemia (IV — emergency)"],
    "Short-acting beta-2 adrenoceptor agonist (SABA) that relaxes bronchial smooth muscle by stimulating beta-2 receptors, causing rapid bronchodilation.",
    ["Tremor","Palpitations","Headache","Tachycardia","Nervousness","Hypokalemia (high doses)"],
    ["Severe tachycardia","Arrhythmias","Paradoxical bronchospasm","Hypokalemia"],
    ["Beta-blockers (opposing effect — avoid)","Digoxin","Other sympathomimetics","MAOIs","Theophylline (increased cardiovascular risk)"],
    ["Caffeine can worsen tachycardia and tremor"],
    ["Allergy to salbutamol","Caution in cardiac arrhythmias","Caution in hyperthyroidism","Diabetes (can raise blood sugar)"],
    ["Do not use more than prescribed — overuse indicates poor asthma control","Shake inhaler well before use","Always have a spare inhaler","Rinse mouth after use (if using high dose)"],
    ["MDI inhaler 100mcg/puff","Rotacaps 200mcg","Nebulizer solution 2.5mg/2.5ml","Syrup 2mg/5ml","Tablet 4mg"],
    "Store below 30°C, away from heat and direct sunlight"],

  // ── VITAMINS / SUPPLEMENTS ────────────────────────────────────────────────
  ["vitamin_d3","Calcirol / Cholecalciferol 60000IU","Cholecalciferol (Vitamin D3)","Cadila / Sun Pharma",
    ["Vitamin D deficiency","Osteoporosis prevention","Rickets (children)","Hypoparathyroidism (adjunct)","Bone pain and muscle weakness from deficiency","PCOD (adjunct)"],
    "Fat-soluble vitamin that is hydroxylated in liver and kidney to form active 1,25-dihydroxyvitamin D3 (calcitriol), which regulates calcium and phosphate absorption from gut.",
    ["Nausea (if overdosed)","Constipation (overdose)","Weakness (overdose)","Headache (overdose)"],
    ["Hypercalcemia (from overdose)","Hypercalciuria","Kidney stones","Soft tissue calcification","Cardiac arrhythmias (severe toxicity)"],
    ["Thiazide diuretics (increased calcium — monitor)","Digoxin (hypercalcemia increases toxicity)","Orlistat and cholestyramine reduce absorption","Corticosteroids reduce efficacy"],
    ["Take with a fatty meal for best absorption","Avoid excessive dairy if taking high doses (calcium overload)"],
    ["Hypercalcemia","Hyperparathyroidism","Vitamin D toxicity","Granulomatous diseases (sarcoidosis — can cause hypercalcemia)","Malignancy with hypercalcemia"],
    ["Do not take more than prescribed — fat-soluble and can accumulate","Check 25-OH Vitamin D level before starting high doses","Recheck levels after 3 months"],
    ["Sachet 60000 IU","Capsule 60000 IU","Drops 400 IU/drop","Tablet 1000 IU","Tablet 2000 IU"],
    "Store below 25°C, protect from light"],

  ["calcium_carbonate","Shelcal / Calcimax","Calcium Carbonate + Vitamin D3","Elder / Meyer Organics",
    ["Calcium deficiency","Osteoporosis treatment and prevention","Post-menopausal bone loss","Rickets (adjunct)","Pregnancy and lactation calcium supplementation"],
    "Provides elemental calcium for bone mineralization, nerve conduction, and muscle function. Vitamin D3 component enhances intestinal calcium absorption.",
    ["Constipation","Bloating","Gas","Nausea"],
    ["Hypercalcemia (overdose)","Kidney stones (high doses)","Milk-alkali syndrome"],
    ["Iron supplements (take 2h apart — reduces absorption)","Levothyroxine (take 4h apart)","Tetracyclines","Quinolone antibiotics","Bisphosphonates (take 2h apart)"],
    ["Take with meals for better absorption","Avoid spinach, rhubarb, bran around dose time (reduce calcium absorption)","Avoid excessive caffeine"],
    ["Hypercalcemia","Hypercalciuria","Severe kidney disease","Malabsorption syndromes"],
    ["Split dose if taking more than 500mg elemental calcium at a time","Many interactions — take 2h away from most medications","Drink plenty of water"],
    ["Tablet 500mg elemental","Tablet 1000mg elemental","Chewable tablet","Suspension"],
    "Store below 30°C"],

  ["becosules","Becosules","Vitamin B Complex + Vitamin C","Pfizer India",
    ["B-vitamin deficiency","Adjunct in weakness and fatigue","Peripheral neuropathy (preventive)","During recovery from illness","Nutritional supplementation"],
    "Provides B1, B2, B3, B5, B6, B9 (folic acid), B12, biotin, and Vitamin C to support energy metabolism, red blood cell formation, nerve function, and antioxidant activity.",
    ["Nausea (if taken on empty stomach)","Yellow/orange discoloration of urine (harmless — riboflavin)"],
    ["Sensory neuropathy (very high-dose B6 long-term)","Flushing (niacin in high doses)"],
    ["Levodopa (B6 reduces effectiveness unless combined with carbidopa)","Methotrexate (competes with folate)"],
    ["Take after meals to reduce nausea","Riboflavin causes bright yellow urine — not harmful"],
    ["Known allergy to any B vitamin"],
    ["Yellow urine is expected and harmless","Improves energy when taken consistently","Not a substitute for a balanced diet"],
    ["Capsule (standard)"],
    "Store below 30°C, protect from moisture and light"],

  ["iron_ferrous","Ferrous Sulfate / Orofer","Ferrous Sulfate / Ferrous Ascorbate","Emcure / Zydus",
    ["Iron deficiency anemia","Anemia in pregnancy","Anemia of chronic disease (adjunct)","Pre-operative anemia correction"],
    "Provides elemental iron for hemoglobin, myoglobin, and enzyme synthesis. Ferrous form (Fe2+) is better absorbed than ferric (Fe3+) in the intestine.",
    ["Dark/black stools (harmless)","Constipation","Nausea","Stomach cramps","Vomiting","Diarrhea"],
    ["Iron overload (hemosiderosis)","Acute toxicity in children — lethal in overdose","GI mucosal damage"],
    ["Calcium supplements (take 2h apart)","Antacids reduce absorption (take 2h apart)","Tetracyclines (take 2h apart)","Levothyroxine (take 4h apart)","Vitamin C increases absorption (beneficial)","Levodopa"],
    ["Take with orange juice (Vitamin C enhances absorption)","Avoid tea, coffee, dairy near dose time — reduce absorption","Can be taken with food if GI upset occurs"],
    ["Hemochromatosis","Hemolytic anemia","Repeated blood transfusions","Allergy to iron products"],
    ["Black stools are expected and harmless","Take with Vitamin C-rich juice for better absorption","Keep out of reach of children — overdose is dangerous","Constipation: increase fluid and fiber intake"],
    ["Tablet 200mg (65mg elemental)","Tablet ferrous ascorbate 100mg elemental","Drops","Syrup","IV infusion (Ferric carboxymaltose)"],
    "Store below 25°C, protect from light and moisture"],

  // ── PCOD / HORMONAL ───────────────────────────────────────────────────────
  ["folic_acid","Folic Acid 5mg","Folic Acid","Generic / Multiple",
    ["Folate deficiency anemia","Prevention of neural tube defects (preconception and pregnancy)","Megaloblastic anemia","Methotrexate toxicity prevention","Supplement in dialysis"],
    "Water-soluble B9 vitamin converted to tetrahydrofolate, essential for DNA synthesis, cell division, and amino acid metabolism — particularly critical during rapid growth phases.",
    ["Generally very well tolerated","Nausea (high doses)","Bloating"],
    ["Masks B12 deficiency anemia (neurological damage can progress — check B12 first)"],
    ["Methotrexate (antagonist)","Phenytoin and barbiturates (reduced folate levels)","Sulfasalazine","Trimethoprim"],
    ["Can be taken with or without food"],
    ["Allergy to folic acid"],
    ["Always check B12 before treating anemia with folate alone","Preconception supplementation is most critical — start 3 months before planned pregnancy"],
    ["Tablet 0.4mg (400mcg)","Tablet 1mg","Tablet 5mg"],
    "Store below 25°C"],

  // ── PAIN (SPECIALTY) ──────────────────────────────────────────────────────
  ["tramadol","Contramal / Ultracet","Tramadol Hydrochloride","J&J / Generic",
    ["Moderate to severe pain","Post-operative pain","Neuropathic pain","Cancer pain (moderate)","Chronic musculoskeletal pain"],
    "Centrally-acting synthetic opioid analgesic that binds weakly to mu-opioid receptors and inhibits reuptake of norepinephrine and serotonin, providing dual pain relief.",
    ["Nausea","Dizziness","Constipation","Headache","Drowsiness","Sweating","Dry mouth"],
    ["Seizures","Serotonin syndrome","Respiratory depression (overdose)","Dependence and withdrawal","Opioid toxicity"],
    ["MAOIs (serotonin syndrome — avoid)","SSRIs/SNRIs (serotonin syndrome)","Other CNS depressants","Carbamazepine","Warfarin","Triptan medications"],
    ["Alcohol severely increases CNS and respiratory depression — AVOID","Avoid driving"],
    ["Epilepsy","Alcohol/opioid intoxication","Severe respiratory depression","MAOI use within 14 days","Severe kidney or liver failure","Pregnancy","Under 12 years"],
    ["Do not drive or operate machinery","Do not take with alcohol","Taper dose to stop — do not stop suddenly","Not suitable long-term without medical supervision","Strictly keep from children"],
    ["Tablet 50mg","Capsule 50mg","SR tablet 100mg","IV injection","Drops"],
    "Store below 25°C"],

  ["pregabalin","Lyrica / Pregabalin","Pregabalin","Pfizer / Sun Pharma",
    ["Neuropathic pain (diabetic, post-herpetic, central)","Fibromyalgia","Epilepsy (adjunct)","Generalized anxiety disorder"],
    "Binds to alpha-2-delta subunit of voltage-gated calcium channels in CNS, reducing neurotransmitter release (glutamate, norepinephrine, substance P) in hyperexcited neurons.",
    ["Dizziness","Drowsiness","Weight gain","Peripheral edema","Blurred vision","Dry mouth"],
    ["Severe respiratory depression (with CNS depressants)","Angioedema","Misuse and dependence","Suicidal ideation"],
    ["CNS depressants (additive)","Alcohol","Opioids (respiratory depression risk)","Thiazolidinediones (edema)"],
    ["Alcohol significantly worsens drowsiness and dizziness","Avoid driving after starting"],
    ["Allergy to pregabalin","Severe kidney failure (dose adjust)","Substance abuse history (caution)"],
    ["Do not stop suddenly — taper slowly (seizure risk)","Avoid driving until you know how it affects you","Controlled substance — do not share","Report mood changes or suicidal thoughts"],
    ["Capsule 25mg","Capsule 50mg","Capsule 75mg","Capsule 150mg","Capsule 300mg","Oral solution"],
    "Store below 25°C"],

  // ── MENTAL HEALTH ─────────────────────────────────────────────────────────
  ["sertraline","Zoloft / Serta","Sertraline Hydrochloride","Pfizer / Generic",
    ["Major depressive disorder","Panic disorder","Obsessive-compulsive disorder (OCD)","PTSD","Social anxiety disorder","Premenstrual dysphoric disorder (PMDD)"],
    "Selective serotonin reuptake inhibitor (SSRI) that blocks the serotonin transporter (SERT), increasing synaptic serotonin concentration.",
    ["Nausea","Diarrhea","Insomnia or somnolence","Dry mouth","Sweating","Sexual dysfunction","Headache"],
    ["Suicidal ideation (especially under 25 — monitor)","Serotonin syndrome","Bleeding (platelet function)","Hyponatremia","Mania activation"],
    ["MAOIs (life-threatening — 14-day washout)","Tramadol and triptans (serotonin syndrome)","NSAIDs and aspirin (bleeding)","Warfarin","Pimozide (QT)","Linezolid"],
    ["Alcohol worsens depression and CNS effects","Avoid grapefruit (minor)"],
    ["MAOI use within 14 days","Pimozide use","Allergy to sertraline"],
    ["Full effect takes 4–6 weeks","Never stop suddenly — taper over weeks","Tell doctor if thoughts of self-harm increase","Not addictive but has discontinuation syndrome","Can be taken with food to reduce nausea"],
    ["Tablet 25mg","Tablet 50mg","Tablet 100mg","Oral concentrate solution"],
    "Store below 25°C"],

  ["alprazolam","Alprax / Xanax","Alprazolam","Pfizer / Torrent",
    ["Generalized anxiety disorder","Panic disorder","Short-term anxiety relief","Anxiety with depression"],
    "Benzodiazepine that enhances GABA-A receptor activity, increasing chloride ion conductance and producing anxiolytic, sedative, and muscle-relaxant effects.",
    ["Drowsiness","Dizziness","Memory impairment","Coordination problems","Slurred speech","Fatigue"],
    ["Dependence and addiction","Severe respiratory depression","Withdrawal seizures","Paradoxical aggression","Anterograde amnesia"],
    ["CNS depressants (additive)","Alcohol (life-threatening respiratory depression)","Opioids","Ketoconazole/itraconazole (levels markedly increased)","CYP3A4 inhibitors","Antiretrovirals"],
    ["Alcohol — NEVER combine — can be fatal","Grapefruit juice increases drug levels"],
    ["Severe respiratory disease","Sleep apnea","Severe liver disease","Myasthenia gravis","Substance use disorder","Pregnancy (neonatal withdrawal)","Breastfeeding"],
    ["Schedule H1 — requires prescription","Only for short-term use (2–4 weeks)","Never stop suddenly — risk of seizures","Do not drive","Do not take with alcohol","High dependency risk — must be tapered"],
    ["Tablet 0.25mg","Tablet 0.5mg","Tablet 1mg"],
    "Store below 25°C, in a secure location"],

  // ── UROLOGY / PROSTATE ────────────────────────────────────────────────────
  ["tamsulosin","Urimax / Flomax","Tamsulosin Hydrochloride","Cipla / Boehringer",
    ["Benign prostatic hyperplasia (BPH)","Ureteral stones (facilitates passage — off-label)"],
    "Selective alpha-1A/1D adrenoceptor blocker that relaxes smooth muscle in the prostate and bladder neck, improving urine flow without significantly affecting blood pressure.",
    ["Retrograde ejaculation","Dizziness","Postural hypotension (especially first dose)","Rhinitis","Headache"],
    ["Severe postural hypotension (first dose)","Intraoperative floppy iris syndrome (inform ophthalmologist before eye surgery)","Priapism (rare)"],
    ["Other alpha-blockers","PDE5 inhibitors (sildenafil — severe hypotension)","Strong CYP3A4 inhibitors (ketoconazole)","Antihypertensives"],
    ["Alcohol worsens hypotension — avoid at first dose","Take after same meal each day"],
    ["Allergy to tamsulosin","Orthostatic hypotension","Severe liver disease"],
    ["First dose at bedtime to avoid fall risk","Tell ophthalmologist before any eye surgery","Rise slowly from bed","Retrograde ejaculation is not harmful but is expected"],
    ["Capsule 0.4mg (MR)"],
    "Store below 25°C"],

  // ── ANTI-MALARIALS ────────────────────────────────────────────────────────
  ["hydroxychloroquine","HCQS / Plaquenil","Hydroxychloroquine Sulfate","Ipca / Sanofi",
    ["Rheumatoid arthritis","Systemic lupus erythematosus (SLE)","Malaria prevention and treatment","Sjögren's syndrome","Discoid lupus"],
    "Accumulates in lysosomes and raises intralysosomal pH, impairing antigen processing and pro-inflammatory cytokine production. Also has antimalarial activity.",
    ["Nausea","Diarrhea","Headache","Skin pigmentation","Mood changes"],
    ["Macular retinopathy and irreversible vision loss (dose-and duration-dependent)","QT prolongation","Hypoglycemia (severe)","Blood disorders"],
    ["Antacids reduce absorption","Digoxin","Drugs that prolong QT","Metformin (hypoglycemia)","Praziquantel"],
    ["Take with food or milk to reduce GI upset"],
    ["Retinal or visual field changes","G6PD deficiency","QT prolongation","Porphyria","Allergy to 4-aminoquinolines"],
    ["Annual ophthalmology exam after 5 years of use","Baseline retinal exam before starting","Do not skip follow-up","Takes months to show full effect in autoimmune disease"],
    ["Tablet 200mg","Tablet 400mg"],
    "Store below 25°C"],

  // ── SKIN / DERMATOLOGY ────────────────────────────────────────────────────
  ["betamethasone_topical","Betnovate / Diprovate","Betamethasone Valerate","GSK / Cadila",
    ["Eczema / atopic dermatitis","Psoriasis","Contact dermatitis","Lichen planus","Seborrheic dermatitis","Insect bite reactions"],
    "Potent topical corticosteroid that binds glucocorticoid receptors and reduces pro-inflammatory mediators (prostaglandins, leukotrienes), inhibiting immune-inflammatory cascade in skin.",
    ["Skin thinning (atrophy — with prolonged use)","Telangiectasia","Stretch marks","Acne at application site","Folliculitis"],
    ["Skin atrophy","Systemic absorption causing Cushing-like features","HPA axis suppression (children especially)","Steroid-induced glaucoma (near eyes)","Skin infections (can mask)"],
    ["No significant drug interactions topically","Systemic interactions if large areas used under occlusion"],
    ["Not food-related"],
    ["Skin infections (bacterial, fungal, viral) — do not apply","Rosacea","Perioral dermatitis","Face (use weaker steroids)","Perianal and genital area","Do not use in children under 1 year"],
    ["Use sparingly — thin layer only","Do not use on face or genitals unless directed","Do not use for more than 2 weeks continuously","Do not cover with occlusive dressing unless directed","Wash hands after application"],
    ["Cream 0.1%","Ointment 0.1%","Lotion 0.1%"],
    "Store below 25°C"],

  // ── ANTI-INFECTIVE / ANTIFUNGAL ───────────────────────────────────────────
  ["fluconazole","Zocon / Diflucan","Fluconazole","Pfizer / FDC",
    ["Vaginal candidiasis","Oral thrush","Esophageal candidiasis","Cryptococcal meningitis","Tinea infections","Onychomycosis (nail fungus)"],
    "Triazole antifungal that inhibits fungal cytochrome P450 14α-demethylase, blocking ergosterol synthesis and disrupting fungal cell membrane integrity.",
    ["Nausea","Headache","Abdominal pain","Diarrhea","Rash","Elevated liver enzymes"],
    ["Hepatotoxicity","QT prolongation","Severe skin reactions (SJS)","Drug interactions — potent CYP2C9/CYP3A4 inhibitor"],
    ["Warfarin (major — can double INR)","Statins (rhabdomyolysis risk)","Phenytoin","Cyclosporine","Oral hypoglycemics","Cisapride","Rifampicin","Many others via CYP inhibition"],
    ["Can be taken with or without food","Alcohol may worsen liver stress"],
    ["Allergy to azole antifungals","QT prolongation","Liver disease","Pregnancy (prolonged systemic use)"],
    ["Highly interactive drug — check all medications","Single dose sufficient for vaginal candidiasis","Report jaundice or severe rash immediately","Complete course for systemic infections"],
    ["Capsule 50mg","Capsule 150mg","Tablet 200mg","Oral suspension 50mg/5ml","IV infusion"],
    "Store below 30°C"],

  // ── GOUT ─────────────────────────────────────────────────────────────────
  ["allopurinol","Zyloric / Allopurinol","Allopurinol","GSK / Generic",
    ["Chronic gout prevention","Hyperuricemia","Uric acid kidney stones","Tumor lysis syndrome prevention"],
    "Xanthine oxidase inhibitor that blocks conversion of hypoxanthine and xanthine to uric acid, reducing serum urate levels.",
    ["Rash","Nausea","Diarrhea","Elevated liver enzymes","Drowsiness"],
    ["Allopurinol hypersensitivity syndrome (DRESS — life-threatening)","Stevens-Johnson syndrome","Agranulocytosis","Bone marrow suppression"],
    ["Azathioprine/6-mercaptopurine (severe toxicity — reduce dose by 75%)","Warfarin","Ampicillin/amoxicillin (increased rash)","ACE inhibitors","Theophylline","Ciclosporin"],
    ["Drink 2–3 liters of water daily — prevents kidney stones","Avoid high-purine foods (red meat, organ meats, shellfish, beer)"],
    ["Acute gout attack (wait for attack to resolve before starting)","HLA-B*5801 carriers (higher risk of severe reactions — test before use, especially in Asians)","Allergy to allopurinol"],
    ["Never start during an acute gout attack — wait 2–4 weeks after","Drink plenty of water","Report rash immediately — can be fatal if ignored","Takes weeks to lower uric acid — be patient","Avoid aspirin"],
    ["Tablet 100mg","Tablet 300mg"],
    "Store below 25°C"],

  // ── BONE HEALTH ───────────────────────────────────────────────────────────
  ["alendronate","Fosamax / Osteofos","Alendronate Sodium","MSD / Cipla",
    ["Postmenopausal osteoporosis","Male osteoporosis","Glucocorticoid-induced osteoporosis","Paget's disease of bone"],
    "Nitrogen-containing bisphosphonate that is incorporated into bone matrix and inhibits osteoclast-mediated bone resorption by inhibiting farnesyl pyrophosphate synthase.",
    ["Esophageal irritation","Heartburn","Abdominal pain","Musculoskeletal pain","Headache"],
    ["Esophageal ulceration and perforation","Osteonecrosis of the jaw","Atypical femur fracture","Hypocalcemia","Severe esophageal reactions"],
    ["NSAIDs (GI irritation)","Calcium/antacids reduce absorption (take 30min apart)","Aspirin"],
    ["Take with plain water only — other beverages reduce absorption","Must remain upright for 30 minutes after taking"],
    ["Esophageal abnormalities","Inability to sit upright for 30 minutes","Hypocalcemia","Severe kidney disease (eGFR<35)"],
    ["Take first thing in morning with plain water — do NOT lie down for 30 minutes","Do not eat for 30 minutes after","Never crush or chew","Weekly dosing preferred (once weekly tablet)","Dental check-up before starting — risk of jaw osteonecrosis"],
    ["Tablet 10mg (daily)","Tablet 70mg (weekly)"],
    "Store below 25°C"],

  // ── ANTI-VERTIGO ──────────────────────────────────────────────────────────
  ["betahistine","Vertin / Betaserc","Betahistine Dihydrochloride","Abbott / Solvay",
    ["Meniere's disease","Vertigo","Tinnitus associated with vestibular disorders","Balance disorders"],
    "Histamine H1 agonist and H3 receptor antagonist that improves microcirculation in the inner ear by dilating precapillary sphincters and reducing endolymphatic pressure.",
    ["Nausea","Headache","GI upset","Indigestion"],
    ["Bronchospasm in asthmatic patients (rare)","Peptic ulceration (worsens)"],
    ["Antihistamines (opposing effects)","MAOIs","Beta-agonists"],
    ["Take with food to reduce GI upset"],
    ["Pheochromocytoma","Asthma (caution)","Peptic ulcer","Allergy to betahistine"],
    ["Long-term treatment often needed for Meniere's disease","Not for acute attacks of severe vertigo","Consistent dosing important"],
    ["Tablet 8mg","Tablet 16mg","Tablet 24mg"],
    "Store below 25°C"],

  // ── ANTI-EMETIC ───────────────────────────────────────────────────────────
  ["ondansetron","Emeset / Zofran","Ondansetron Hydrochloride","Cipla / GSK",
    ["Chemotherapy-induced nausea and vomiting","Post-operative nausea","Radiation-induced nausea","Gastroenteritis-related vomiting (off-label)","Pregnancy nausea (off-label)"],
    "Selective 5-HT3 serotonin receptor antagonist that blocks serotonin peripherally in vagal nerve terminals and centrally in the chemoreceptor trigger zone.",
    ["Headache","Constipation","Flushing","Dizziness","Fatigue"],
    ["QT prolongation and cardiac arrhythmias","Serotonin syndrome (rare)","Severe skin reactions"],
    ["Drugs that prolong QT","Apomorphine (hypotension)","Tramadol (reduced efficacy)","SSRIs (serotonin syndrome risk)"],
    ["Can be taken with or without food"],
    ["Congenital QT syndrome","Hypersensitivity to ondansetron or setrons","Caution with other QT-prolonging drugs"],
    ["Melts on tongue (ODT form) — do not swallow whole","Effective for 24h — redose as needed","Not for routine nausea — primarily for chemo and post-op settings"],
    ["Tablet 4mg","Tablet 8mg","ODT (mouth dissolving) 4mg","ODT 8mg","IV injection","Syrup 2mg/5ml"],
    "Store below 30°C"],

  // ── ANTI-DIABETIC (INSULIN) ───────────────────────────────────────────────
  ["insulin_human","Human Insulin (Regular/NPH)","Human Insulin","Novo Nordisk / Eli Lilly",
    ["Type 1 diabetes mellitus","Type 2 diabetes mellitus (when oral agents insufficient)","Gestational diabetes","Diabetic ketoacidosis","Hyperkalemia (emergency)"],
    "Binds insulin receptors on target cells (liver, muscle, fat), facilitating glucose uptake, glycogen synthesis, lipogenesis, and protein synthesis while suppressing gluconeogenesis.",
    ["Hypoglycemia","Injection site reactions","Lipohypertrophy","Weight gain","Local allergic reactions"],
    ["Severe hypoglycemia with coma or seizures","Anaphylaxis (rare)","Hypokalemia"],
    ["Beta-blockers (mask hypoglycemia)","Oral hypoglycemics (additive)","Corticosteroids (increase glucose)","Alcohol","Salicylates"],
    ["Alcohol can cause severe delayed hypoglycemia","Meal timing must match insulin type","Skipping meals causes hypoglycemia"],
    ["Hypoglycemia","Allergy to human insulin"],
    ["Always carry glucose tablets or sugar sachet","Rotate injection sites to prevent lipohypertrophy","Never shake vial — roll gently","Regular insulin: inject 30min before meals, Rapid: inject with meals","Store open vial at room temperature (28 days), unopened in fridge"],
    ["Vial 10ml (100IU/ml)","Cartridge 3ml","Pen device","Prefilled syringe"],
    "Unopened: refrigerate 2–8°C. Opened: room temperature below 30°C for up to 28 days. Never freeze."],

  // ── ANTICOAGULANT ─────────────────────────────────────────────────────────
  ["warfarin","Warf / Coumadin","Warfarin Sodium","Sun Pharma / Generic",
    ["Atrial fibrillation (stroke prevention)","Deep vein thrombosis (DVT)","Pulmonary embolism","Mechanical heart valves","Post-MI thromboembolism prevention"],
    "Vitamin K antagonist that inhibits VKORC1 enzyme, preventing regeneration of Vitamin K, and reducing synthesis of clotting factors II, VII, IX, and X.",
    ["Bleeding (minor)","Easy bruising","Skin necrosis (rare, early)","Purple toe syndrome"],
    ["Major life-threatening bleeding (intracranial, GI)","Warfarin-induced skin necrosis","Hematoma"],
    ["Extremely long list — significant interactions with almost all drugs","Aspirin, clopidogrel, NSAIDs (increased bleeding)","Antibiotics alter gut flora and vitamin K","Amiodarone, fluconazole, metronidazole (greatly increase INR)","Rifampicin, carbamazepine (reduce INR)","Vitamin K supplements"],
    ["Consistent intake of leafy green vegetables (vitamin K) — do not drastically change diet","Cranberry juice can increase INR","Alcohol (variable effects — avoid)"],
    ["Active major bleeding","Pregnancy (fetal warfarin syndrome)","Severe liver disease","Non-compliant patient","Recent neurosurgery"],
    ["Regular INR monitoring is essential — never skip","Keep a medication interaction card","Tell EVERY doctor you are on warfarin","Consistent diet of leafy greens (don't suddenly increase/decrease)","Carry a medical alert card","Any bleeding: seek care immediately"],
    ["Tablet 1mg","Tablet 2mg","Tablet 5mg"],
    "Store below 25°C, protect from light"],
];

// Build individual medicine JSON files
const index = [];

MEDS.forEach(([slug, name, generic, manufacturer, uses, how_it_works,
  side_common, side_serious, drug_int, food_int,
  contraindications, what_to_avoid, dosage_forms, storage]) => {

  const obj = {
    schema_version: "1.0.0",
    slug,
    name,
    generic_name: generic,
    manufacturer,
    source_note: "Data compiled for Arogya knowledge base. Verify against 1mg.com and pharmeasy.in for live updates.",
    last_updated: TODAY,
    uses,
    how_it_works,
    dosage_forms,
    side_effects: {
      common: side_common,
      serious: side_serious,
    },
    drug_interactions: drug_int,
    food_interactions: food_int,
    contraindications,
    what_to_avoid,
    storage,
  };

  const filePath = path.join(MED_DIR, `${slug}.json`);
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2), "utf8");
  index.push({ slug, name, generic_name: generic });
  console.log(`  💊 ${name}`);
});

// Write index
const indexPath = path.join(MED_DIR, "index.json");
fs.writeFileSync(indexPath, JSON.stringify({
  schema_version: "1.0.0",
  generated_at: TODAY,
  total: index.length,
  medicines: index,
}, null, 2), "utf8");

// Write README
const readme = `# Arogya Medicine Knowledge Base

Generated: ${TODAY}
Total medicines: ${MEDS.length}

## Schema

Each \`{slug}.json\` file contains:

| Field | Description |
|-------|-------------|
| \`slug\` | URL-safe unique identifier |
| \`name\` | Brand/common name |
| \`generic_name\` | INN generic name |
| \`uses\` | Approved and common off-label uses |
| \`how_it_works\` | Mechanism of action in plain language |
| \`dosage_forms\` | Available formulations |
| \`side_effects.common\` | Frequent but typically mild side effects |
| \`side_effects.serious\` | Rare but severe/dangerous adverse effects |
| \`drug_interactions\` | Clinically significant drug-drug interactions |
| \`food_interactions\` | Food and beverage interactions |
| \`contraindications\` | When this medicine must not be used |
| \`what_to_avoid\` | Practical patient advice |
| \`storage\` | Storage conditions |

## AI Access Instructions

Include this fragment in the system prompt for all patient queries:

\`\`\`
You have access to a medicine database at /data/knowledge/medicines/.
- Use /data/knowledge/medicines/index.json to find available medicines.
- Load /data/knowledge/medicines/{slug}.json for full details.
- Cross-reference drug_interactions when patient is on multiple medicines.
- Always mention contraindications when relevant to patient profile.
- Side effects listed as 'serious' should be flagged urgently.
\`\`\`

## Categories Covered

- Diabetes: metformin, glipizide, sitagliptin, insulin
- Hypertension/Cardiac: amlodipine, losartan, telmisartan, atenolol, aspirin, atorvastatin, clopidogrel, warfarin
- Thyroid: levothyroxine
- GI/Acid: omeprazole, pantoprazole, famotidine
- Pain/Fever: paracetamol, ibuprofen, diclofenac, tramadol, pregabalin
- Antibiotics: azithromycin, amoxicillin, ciprofloxacin, doxycycline
- Allergy/Respiratory: cetirizine, montelukast, salbutamol
- Vitamins: Vitamin D3, Calcium, Becosules, Iron, Folic Acid
- Mental Health: sertraline, alprazolam
- Others: tamsulosin, hydroxychloroquine, fluconazole, allopurinol, alendronate, betahistine, ondansetron, betamethasone

## Update Process

1. Run \`node generate-medicines.js\` to regenerate all files.
2. For live scraping from 1mg/Pharmeasy, use the Apify scraper pipeline.
3. All AI queries should prefer this local database for speed and reliability.
`;

fs.writeFileSync(path.join(MED_DIR, "README.md"), readme, "utf8");

console.log(`\n✅ Generated ${MEDS.length} medicine files → ${MED_DIR}`);
console.log(`📋 Index → ${indexPath}`);
console.log(`📖 README → ${path.join(MED_DIR, "README.md")}`);
