#!/usr/bin/env node
/**
 * Arogya — Symptom Knowledge Base Generator
 * Run: node generate-symptoms.js
 * Output: /data/knowledge/symptoms.json
 */

const fs = require("fs");
const path = require("path");

const OUT_DIR = path.join(__dirname, "data", "knowledge");
fs.mkdirSync(OUT_DIR, { recursive: true });

// Compact format: [id, label, aliases, body_system, associated_diseases, red_flag, follow_up_questions]
// red_flag: 1 = true, 0 = false
const RAW = [
  // ── NEUROLOGICAL ──────────────────────────────────────────────────────────
  ["dizziness","Dizziness",["giddiness","lightheadedness","vertigo"],"neurological",
    ["BPPV","Hypertension","Anemia","Inner ear disorder","Dehydration"],0,
    ["Is the room spinning or are you lightheaded?","Does it worsen on standing?","Any recent ear infection?"]],

  ["headache","Headache",["head pain","cephalalgia"],"neurological",
    ["Migraine","Tension headache","Hypertension","Sinusitis","Dehydration"],0,
    ["Where exactly is the pain?","Scale 1–10?","Any visual disturbances before it starts?","How long does it last?"]],

  ["severe_headache","Sudden Severe Headache",["thunderclap headache","worst headache of life"],"neurological",
    ["Subarachnoid hemorrhage","Meningitis","Stroke"],1,
    ["Did it come on suddenly within seconds?","Any neck stiffness?","Any fever or vomiting?"]],

  ["numbness","Numbness",["tingling","pins and needles","paresthesia"],"neurological",
    ["Peripheral neuropathy","Diabetes","Vitamin B12 deficiency","Cervical spondylosis","MS"],0,
    ["Which body part is affected?","Is it constant or intermittent?","Any weakness alongside it?"]],

  ["confusion","Confusion",["disorientation","delirium","brain fog"],"neurological",
    ["Hypoglycemia","Stroke","UTI (elderly)","Dementia","Encephalitis"],1,
    ["Did it come on suddenly?","Any recent fever?","Any history of diabetes?"]],

  ["seizure","Seizure",["convulsion","fit","epileptic episode"],"neurological",
    ["Epilepsy","Hypoglycemia","Febrile seizure","Brain tumor","Meningitis"],1,
    ["How long did it last?","Any loss of consciousness?","First time or recurrent?"]],

  ["memory_loss","Memory Loss",["forgetfulness","amnesia","cognitive decline"],"neurological",
    ["Dementia","Alzheimer's","Depression","Hypothyroidism","B12 deficiency"],0,
    ["Short-term or long-term memory affected?","How long has this been happening?","Any family history?"]],

  ["slurred_speech","Slurred Speech",["dysarthria","speech difficulty"],"neurological",
    ["Stroke","TIA","Alcohol intoxication","MS","Bell's palsy"],1,
    ["Did it come on suddenly?","Any facial drooping or arm weakness?","Any recent injury?"]],

  ["tremor","Tremor",["shaking","shakiness","hand tremor"],"neurological",
    ["Parkinson's disease","Essential tremor","Hyperthyroidism","Anxiety","Alcohol withdrawal"],0,
    ["At rest or during movement?","Which body part?","How long have you had it?"]],

  ["fainting","Fainting",["syncope","blackout","loss of consciousness","passing out"],"neurological",
    ["Vasovagal syncope","Cardiac arrhythmia","Hypotension","Dehydration","Anemia"],1,
    ["Any warning signs before fainting?","How long were you unconscious?","Any heart palpitations before?"]],

  // ── CARDIOVASCULAR ────────────────────────────────────────────────────────
  ["chest_pain","Chest Pain",["chest tightness","chest pressure","angina"],"cardiovascular",
    ["Myocardial infarction","Angina","GERD","Pleuritis","Anxiety"],1,
    ["Is it crushing or sharp?","Does it radiate to arm or jaw?","Any shortness of breath?","Worsens with exertion?"]],

  ["palpitations","Palpitations",["heart racing","irregular heartbeat","fluttering"],"cardiovascular",
    ["Arrhythmia","Anxiety","Hyperthyroidism","Anemia","Caffeine excess"],0,
    ["Is it fast, slow, or irregular?","How long does each episode last?","Any dizziness with it?"]],

  ["breathlessness","Shortness of Breath",["dyspnea","breathlessness","difficulty breathing"],"cardiovascular",
    ["Heart failure","Asthma","COPD","Anemia","Pulmonary embolism","COVID-19"],1,
    ["At rest or on exertion?","Is it sudden onset?","Any leg swelling?","Do you wake up breathless at night?"]],

  ["leg_swelling","Leg Swelling",["edema","swollen ankles","pitting edema"],"cardiovascular",
    ["Heart failure","Kidney disease","Liver disease","DVT","Hypoalbuminemia"],0,
    ["One leg or both?","Is it pitting (leaves indent)?","Worse at end of day?","Any pain or redness?"]],

  ["high_bp_symptom","High Blood Pressure Symptoms",["hypertension symptoms","BP symptoms"],"cardiovascular",
    ["Hypertension","Kidney disease","Adrenal tumor","Stress"],0,
    ["Do you have a known BP diagnosis?","Any headache or vision changes?","Are you on medication?"]],

  // ── RESPIRATORY ───────────────────────────────────────────────────────────
  ["cough","Cough",["dry cough","wet cough","productive cough"],"respiratory",
    ["URTI","Asthma","GERD","TB","COVID-19","Allergic bronchitis"],0,
    ["Dry or productive?","How long?","Any blood in sputum?","Worse at night?"]],

  ["coughing_blood","Coughing Blood",["hemoptysis","blood in sputum"],"respiratory",
    ["TB","Lung cancer","Pulmonary embolism","Bronchiectasis"],1,
    ["How much blood?","Any weight loss or night sweats?","History of TB?"]],

  ["wheezing","Wheezing",["breathing difficulty","whistling sound breathing"],"respiratory",
    ["Asthma","COPD","Allergic reaction","Heart failure"],0,
    ["Does it respond to inhalers?","Any known triggers?","How long?"]],

  ["sore_throat","Sore Throat",["throat pain","pharyngitis","tonsil pain"],"respiratory",
    ["Tonsillitis","Strep throat","URTI","GERD","Mono"],0,
    ["Any white patches on tonsils?","Fever alongside?","Difficulty swallowing?"]],

  ["runny_nose","Runny Nose",["rhinorrhea","nasal discharge","blocked nose"],"respiratory",
    ["Allergic rhinitis","Common cold","Sinusitis","Flu"],0,
    ["Clear or colored discharge?","Any sneezing or itchy eyes?","Seasonal pattern?"]],

  // ── GASTROINTESTINAL ──────────────────────────────────────────────────────
  ["nausea","Nausea",["feeling sick","queasy","upset stomach"],"gastrointestinal",
    ["Gastritis","GERD","Pregnancy","Migraine","Food poisoning","Hepatitis"],0,
    ["Any vomiting?","After eating or unrelated?","Any abdominal pain?","Could you be pregnant?"]],

  ["vomiting","Vomiting",["throwing up","emesis","puking"],"gastrointestinal",
    ["Gastroenteritis","Food poisoning","Appendicitis","Hepatitis","Migraine"],0,
    ["How many times?","Any blood in vomit?","Any fever?","Able to keep fluids down?"]],

  ["vomiting_blood","Vomiting Blood",["hematemesis","blood in vomit"],"gastrointestinal",
    ["Peptic ulcer","Esophageal varices","Mallory-Weiss tear","Gastric cancer"],1,
    ["Color — bright red or coffee-ground?","Any alcohol use?","Any liver disease history?"]],

  ["abdominal_pain","Abdominal Pain",["stomach pain","belly pain","tummy ache"],"gastrointestinal",
    ["Appendicitis","Gastritis","IBS","Kidney stone","Hernia","Pancreatitis"],0,
    ["Where exactly?","Constant or crampy?","Any fever?","Any change in bowel habits?"]],

  ["diarrhea","Diarrhea",["loose stools","loose motions","watery stools"],"gastrointestinal",
    ["Gastroenteritis","IBS","Infections","Food intolerance","IBD"],0,
    ["How many times per day?","Any blood or mucus?","Any fever?","Recent travel or food change?"]],

  ["constipation","Constipation",["no bowel movement","hard stools","straining"],"gastrointestinal",
    ["IBS","Hypothyroidism","Dehydration","Colon cancer","Medication side effect"],0,
    ["How many days without bowel movement?","Any blood on wiping?","Any abdominal bloating?"]],

  ["bloating","Bloating",["distension","gas","flatulence","feeling full"],"gastrointestinal",
    ["IBS","SIBO","Lactose intolerance","Celiac disease","Ovarian cyst"],0,
    ["After meals or constant?","Any specific foods that trigger it?","Any change in bowel habits?"]],

  ["jaundice","Jaundice",["yellow skin","yellow eyes","icterus"],"gastrointestinal",
    ["Hepatitis A/B/C","Gallstones","Liver cirrhosis","Hemolytic anemia","Bile duct obstruction"],1,
    ["Is urine dark colored?","Are stools pale?","Any abdominal pain?","Any fever?"]],

  ["loss_of_appetite","Loss of Appetite",["anorexia","not hungry","poor appetite"],"gastrointestinal",
    ["Depression","Hepatitis","Cancer","Chronic kidney disease","Thyroid disorder"],0,
    ["How long?","Any weight loss?","Any nausea?","Any emotional changes?"]],

  ["heartburn","Heartburn",["acid reflux","GERD symptoms","burning chest"],"gastrointestinal",
    ["GERD","Hiatal hernia","Peptic ulcer","Pregnancy"],0,
    ["After meals or lying down?","Does antacid help?","Any sour taste in mouth?"]],

  // ── MUSCULOSKELETAL ───────────────────────────────────────────────────────
  ["joint_pain","Joint Pain",["arthralgia","joint swelling","arthritis pain"],"musculoskeletal",
    ["Osteoarthritis","Rheumatoid arthritis","Gout","Lupus","Viral fever"],0,
    ["Which joints?","Morning stiffness?","Any swelling or redness?","Worse with activity or rest?"]],

  ["muscle_pain","Muscle Pain",["myalgia","body ache","muscle soreness"],"musculoskeletal",
    ["Viral fever","Fibromyalgia","Hypothyroidism","Overexertion","Polymyositis"],0,
    ["Generalized or localized?","Any fever?","Any recent illness or exertion?"]],

  ["back_pain","Back Pain",["lower back pain","lumbar pain","spine pain"],"musculoskeletal",
    ["Lumbar spondylosis","IVDP","Muscle strain","Kidney stone","Ankylosing spondylitis"],0,
    ["Lower or upper back?","Radiates to legs?","Any bladder or bowel issues?","Worse on bending?"]],

  ["neck_pain","Neck Pain",["cervical pain","stiff neck","neck stiffness"],"musculoskeletal",
    ["Cervical spondylosis","Muscle strain","Meningitis","Whiplash"],0,
    ["Any radiation to arms?","Sudden or gradual?","Any fever (rule out meningitis)?"]],

  ["muscle_weakness","Muscle Weakness",["weakness","loss of strength","fatigue in muscles"],"musculoskeletal",
    ["Myasthenia gravis","Hypothyroidism","Vitamin D deficiency","Stroke","Polymyositis"],0,
    ["Which muscle groups?","Getting worse over time?","Any difficulty swallowing or breathing?"]],

  // ── SYSTEMIC / GENERAL ────────────────────────────────────────────────────
  ["fatigue","Fatigue",["tiredness","exhaustion","low energy","lethargy"],"systemic",
    ["Anemia","Hypothyroidism","Diabetes","Depression","Chronic kidney disease","Sleep apnea"],0,
    ["How long?","Rest relieves or not?","Any sleep disturbances?","Any recent weight change?"]],

  ["fever","Fever",["high temperature","pyrexia","chills with fever"],"systemic",
    ["Malaria","Dengue","Typhoid","UTI","COVID-19","TB","Viral URTI"],0,
    ["What temperature?","How many days?","Any chills or rigors?","Any rash?","Any travel recently?"]],

  ["high_fever","Very High Fever",["hyperpyrexia","fever above 104","extremely high temperature"],"systemic",
    ["Sepsis","Malaria","Dengue","Meningitis","Heat stroke"],1,
    ["Above 104°F / 40°C?","Any seizures?","Any neck stiffness or rash?"]],

  ["weight_loss","Unexplained Weight Loss",["losing weight","unintentional weight loss"],"systemic",
    ["Diabetes","Hyperthyroidism","Cancer","TB","HIV","Depression","Malabsorption"],0,
    ["How much weight in how long?","Any change in appetite?","Any night sweats or fever?"]],

  ["weight_gain","Unexplained Weight Gain",["gaining weight","sudden weight gain"],"systemic",
    ["Hypothyroidism","PCOD","Cushing's syndrome","Heart failure","Medication side effect"],0,
    ["How much in how long?","Any swelling in legs?","Any fatigue or cold intolerance?"]],

  ["night_sweats","Night Sweats",["sweating at night","nocturnal sweating"],"systemic",
    ["TB","Lymphoma","Menopause","HIV","Hyperthyroidism","Anxiety"],0,
    ["How long?","Any weight loss or fever?","Soaking through clothes?","Any cough?"]],

  ["chills","Chills",["rigor","shivering","feeling cold"],"systemic",
    ["Malaria","Dengue","Typhoid","Sepsis","Influenza"],0,
    ["Any fever alongside?","How long do episodes last?","Any recent travel to malaria-prone area?"]],

  ["excessive_sweating","Excessive Sweating",["hyperhidrosis","sweating too much"],"systemic",
    ["Hyperthyroidism","Menopause","Anxiety","Diabetes","Heart disease"],0,
    ["Generalized or specific areas?","Day or night or both?","Any palpitations or weight loss?"]],

  // ── UROLOGICAL ────────────────────────────────────────────────────────────
  ["frequent_urination","Frequent Urination",["polyuria","urinating often","peeing a lot"],"urological",
    ["Diabetes mellitus","UTI","Diabetes insipidus","BPH","Overactive bladder"],0,
    ["How many times per day/night?","Any burning sensation?","Any increased thirst?"]],

  ["painful_urination","Painful Urination",["dysuria","burning urination","burning pee"],"urological",
    ["UTI","STI","Kidney stone","Vaginitis","Urethritis"],0,
    ["Any fever or back pain?","Any blood in urine?","Any discharge?"]],

  ["blood_in_urine","Blood in Urine",["hematuria","red urine","pink urine"],"urological",
    ["UTI","Kidney stone","Kidney cancer","Bladder cancer","Glomerulonephritis"],1,
    ["Painful or painless?","Any clots?","Any flank pain?","How long?"]],

  ["decreased_urine","Decreased Urination",["oliguria","not urinating","low urine output"],"urological",
    ["Acute kidney injury","Dehydration","Urinary obstruction","Sepsis"],1,
    ["Any fluid intake reduction?","Any fever or vomiting?","Any back pain?"]],

  // ── DERMATOLOGICAL ────────────────────────────────────────────────────────
  ["rash","Skin Rash",["skin eruption","hives","urticaria","red spots"],"dermatological",
    ["Allergic reaction","Dengue","Viral exanthem","Eczema","Psoriasis","Drug reaction"],0,
    ["Itchy?","Any fever?","Any new medicine or food?","Spreading or stable?"]],

  ["itching","Itching",["pruritus","skin itch","generalized itch"],"dermatological",
    ["Allergic dermatitis","Scabies","Liver disease","Kidney failure","Diabetes","Thyroid"],0,
    ["Localized or all over?","Any rash visible?","Worse at night?","Any jaundice?"]],

  ["hair_loss","Hair Loss",["alopecia","falling hair","thinning hair"],"dermatological",
    ["Hypothyroidism","PCOD","Anemia","Alopecia areata","Nutritional deficiency","Stress"],0,
    ["Patchy or diffuse?","How long?","Any scalp changes?","Any recent illness or stress?"]],

  ["wounds_not_healing","Wounds Not Healing",["slow healing","non-healing wound","chronic wound"],"dermatological",
    ["Diabetes","Peripheral vascular disease","Anemia","Malnutrition"],0,
    ["How long has the wound been there?","Known diabetic?","Any signs of infection?"]],

  ["pallor","Pallor",["pale skin","paleness","pale gums"],"dermatological",
    ["Anemia","Blood loss","Shock","Vitamin B12/folate deficiency"],0,
    ["Any fatigue or breathlessness?","Any blood in stools or urine?","Any recent surgery?"]],

  // ── ENDOCRINE / METABOLIC ─────────────────────────────────────────────────
  ["excessive_thirst","Excessive Thirst",["polydipsia","always thirsty","drinking a lot of water"],"endocrine",
    ["Diabetes mellitus","Diabetes insipidus","Hypercalcemia","Dehydration"],0,
    ["Any increased urination?","Any weight loss?","Blood sugar tested recently?"]],

  ["cold_intolerance","Cold Intolerance",["feeling cold all the time","sensitive to cold"],"endocrine",
    ["Hypothyroidism","Anemia","Raynaud's phenomenon","Malnutrition"],0,
    ["Any weight gain or fatigue?","Any hair loss?","Cold hands and feet specifically?"]],

  ["heat_intolerance","Heat Intolerance",["sensitive to heat","feeling hot all the time"],"endocrine",
    ["Hyperthyroidism","Menopause","Anxiety","Medications"],0,
    ["Any weight loss or palpitations?","Excessive sweating?","Any tremor?"]],

  ["increased_hunger","Increased Hunger",["polyphagia","always hungry","excessive appetite"],"endocrine",
    ["Diabetes mellitus","Hyperthyroidism","Anxiety","Tapeworm","Steroid use"],0,
    ["Any weight loss despite eating more?","Any excessive thirst or urination?"]],

  // ── REPRODUCTIVE / GYNECOLOGICAL ──────────────────────────────────────────
  ["irregular_periods","Irregular Periods",["menstrual irregularity","missed period","PCOD symptom"],"reproductive",
    ["PCOD/PCOS","Hypothyroidism","Stress","Premature ovarian insufficiency","Pregnancy"],0,
    ["How irregular? (cycle length)?","Any weight gain or facial hair?","Any pelvic pain?"]],

  ["pelvic_pain","Pelvic Pain",["lower abdominal pain","pelvic cramps"],"reproductive",
    ["Endometriosis","Ovarian cyst","PID","Ectopic pregnancy","Fibroids"],0,
    ["Cyclical or constant?","Any abnormal vaginal discharge?","Any fever?","Sexually active?"]],

  ["vaginal_discharge","Vaginal Discharge",["white discharge","abnormal discharge","leucorrhea"],"reproductive",
    ["Vaginitis","BV","STI","Cervicitis","Candidiasis"],0,
    ["Color, consistency, smell?","Any itching or burning?","Any fever?"]],

  ["breast_lump","Breast Lump",["breast mass","lump in breast"],"reproductive",
    ["Fibrocystic disease","Fibroadenoma","Breast cancer","Breast abscess"],1,
    ["Hard or soft?","Painful?","Any nipple discharge?","Any skin changes?","Family history of breast cancer?"]],

  // ── PSYCHOLOGICAL ─────────────────────────────────────────────────────────
  ["anxiety","Anxiety",["nervousness","worry","panic attacks","anxious feeling"],"psychological",
    ["Generalized anxiety disorder","Panic disorder","Hyperthyroidism","Phobia","PTSD"],0,
    ["Physical symptoms (palpitations, sweating)?","Triggered or spontaneous?","How long?","Affecting daily life?"]],

  ["depression","Depression",["feeling low","sadness","hopelessness","low mood"],"psychological",
    ["Major depressive disorder","Hypothyroidism","Bipolar disorder","Grief","Burnout"],0,
    ["How long?","Any loss of interest in activities?","Any thoughts of self-harm?","Sleep changes?"]],

  ["insomnia","Insomnia",["sleeplessness","can't sleep","difficulty sleeping","poor sleep"],"psychological",
    ["Anxiety","Depression","Sleep apnea","Hyperthyroidism","Chronic pain"],0,
    ["Difficulty falling asleep or staying asleep?","How long?","Any stress or anxiety?","Any snoring?"]],

  ["irritability","Irritability",["mood swings","short temper","agitation","anger"],"psychological",
    ["Anxiety","Bipolar disorder","Hyperthyroidism","Premenstrual syndrome","Sleep deprivation"],0,
    ["Any triggers?","Any sleep problems?","Any physical symptoms alongside?"]],

  // ── OPHTHALMOLOGICAL ──────────────────────────────────────────────────────
  ["vision_changes","Vision Changes",["blurry vision","vision loss","seeing double"],"ophthalmological",
    ["Diabetes","Hypertension","Glaucoma","Cataract","Migraine aura","Stroke"],0,
    ["Gradual or sudden?","One eye or both?","Any pain?","Flashes or floaters?"]],

  ["sudden_vision_loss","Sudden Vision Loss",["can't see","acute blindness","vision gone"],"ophthalmological",
    ["Retinal detachment","Stroke","Acute glaucoma","Central retinal artery occlusion"],1,
    ["Completely gone or partial?","One eye or both?","Any pain?","How long ago?"]],

  ["red_eye","Red Eye",["pink eye","conjunctivitis","eye redness"],"ophthalmological",
    ["Conjunctivitis","Allergy","Subconjunctival hemorrhage","Uveitis","Acute glaucoma"],0,
    ["Any discharge?","Any pain or photophobia?","Vision affected?"]],

  // ── ENT ───────────────────────────────────────────────────────────────────
  ["ear_pain","Ear Pain",["otalgia","earache","ear infection"],"ENT",
    ["Otitis media","Otitis externa","Referred pain from jaw","Eustachian tube dysfunction"],0,
    ["Any discharge from ear?","Any fever?","Any hearing loss?","Recent URTI?"]],

  ["hearing_loss","Hearing Loss",["deafness","can't hear","reduced hearing"],"ENT",
    ["Earwax blockage","Otitis media","NIHL","Acoustic neuroma","Age-related"],0,
    ["One ear or both?","Sudden or gradual?","Any ringing in ears?","Any dizziness?"]],

  ["tinnitus","Tinnitus",["ringing in ears","ear noise","buzzing in ears"],"ENT",
    ["Noise exposure","Earwax","Meniere's disease","Acoustic neuroma","Hypertension"],0,
    ["Constant or intermittent?","One ear or both?","Any hearing loss?","Any dizziness?"]],

  // ── ADDITIONAL HIGH-PRIORITY ───────────────────────────────────────────────
  ["swollen_lymph_nodes","Swollen Lymph Nodes",["lumps in neck","lymphadenopathy","swollen glands"],"systemic",
    ["Infection","Lymphoma","Leukemia","TB","HIV","Autoimmune"],0,
    ["Location?","Painful or painless?","How long?","Any fever or weight loss?"]],

  ["excessive_bleeding","Excessive Bleeding",["prolonged bleeding","bleeding doesn't stop","hemorrhage"],"systemic",
    ["Hemophilia","Thrombocytopenia","Liver disease","Anticoagulant use","Von Willebrand disease"],1,
    ["Minor cut or major trauma?","How long to stop?","Any bruising elsewhere?","Any blood thinners?"]],

  ["pale_stool","Pale/Clay Colored Stool",["white stool","pale feces","clay stool"],"gastrointestinal",
    ["Bile duct obstruction","Liver disease","Pancreatitis","Cholestasis"],1,
    ["Any jaundice?","Any dark urine?","Any abdominal pain?"]],

  ["black_stool","Black Tarry Stool",["melena","tarry stool","dark stool"],"gastrointestinal",
    ["Upper GI bleed","Peptic ulcer","Gastric cancer","Iron supplements"],1,
    ["Are you on iron tablets?","Any abdominal pain?","Any vomiting blood?"]],
];

// Build structured objects
const symptoms = RAW.map(([id, label, aliases, body_system, commonly_associated_diseases, redFlag, follow_up_questions]) => ({
  id,
  label,
  aliases,
  body_system,
  severity_levels: ["mild", "moderate", "severe"],
  commonly_associated_diseases,
  red_flag: redFlag === 1,
  follow_up_questions,
}));

const output = {
  schema_version: "1.0.0",
  generated_at: new Date().toISOString(),
  total: symptoms.length,
  red_flag_count: symptoms.filter(s => s.red_flag).length,
  body_systems: [...new Set(symptoms.map(s => s.body_system))],
  symptoms,
};

const outPath = path.join(OUT_DIR, "symptoms.json");
fs.writeFileSync(outPath, JSON.stringify(output, null, 2), "utf8");
console.log(`✅ Wrote ${symptoms.length} symptoms → ${outPath}`);
console.log(`   🚩 Red-flag symptoms: ${output.red_flag_count}`);
console.log(`   🏥 Body systems covered: ${output.body_systems.join(", ")}`);
