# Arogya Medicine Knowledge Base

Generated: 2026-04-25T18:09:48.529Z
Total medicines: 43

## Schema

Each `{slug}.json` file contains:

| Field | Description |
|-------|-------------|
| `slug` | URL-safe unique identifier |
| `name` | Brand/common name |
| `generic_name` | INN generic name |
| `uses` | Approved and common off-label uses |
| `how_it_works` | Mechanism of action in plain language |
| `dosage_forms` | Available formulations |
| `side_effects.common` | Frequent but typically mild side effects |
| `side_effects.serious` | Rare but severe/dangerous adverse effects |
| `drug_interactions` | Clinically significant drug-drug interactions |
| `food_interactions` | Food and beverage interactions |
| `contraindications` | When this medicine must not be used |
| `what_to_avoid` | Practical patient advice |
| `storage` | Storage conditions |

## AI Access Instructions

Include this fragment in the system prompt for all patient queries:

```
You have access to a medicine database at /data/knowledge/medicines/.
- Use /data/knowledge/medicines/index.json to find available medicines.
- Load /data/knowledge/medicines/{slug}.json for full details.
- Cross-reference drug_interactions when patient is on multiple medicines.
- Always mention contraindications when relevant to patient profile.
- Side effects listed as 'serious' should be flagged urgently.
```

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

1. Run `node generate-medicines.js` to regenerate all files.
2. For live scraping from 1mg/Pharmeasy, use the Apify scraper pipeline.
3. All AI queries should prefer this local database for speed and reliability.
