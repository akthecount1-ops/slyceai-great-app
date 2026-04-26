const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
// Using anon key since we opened RLS for insert. We could also use service_role if available.
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY !== 'YOUR_SUPABASE_SERVICE_ROLE_KEY' 
  ? process.env.SUPABASE_SERVICE_ROLE_KEY 
  : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

const SYMPTOMS_PATH = path.resolve(__dirname, '..', 'data', 'knowledge', 'symptoms.json')
const MED_INDEX = path.resolve(__dirname, '..', 'data', 'knowledge', 'medicines', 'index.json')
const MED_DIR = path.resolve(__dirname, '..', 'data', 'knowledge', 'medicines')

async function migrate() {
  console.log('🚀 Starting Knowledge Base Migration to Supabase...')
  
  // 1. Migrate Symptoms
  if (fs.existsSync(SYMPTOMS_PATH)) {
    const { symptoms } = JSON.parse(fs.readFileSync(SYMPTOMS_PATH, 'utf8'))
    console.log(`Migrating ${symptoms.length} symptoms...`)
    
    // Upsert in batches of 100
    for (let i = 0; i < symptoms.length; i += 100) {
      const batch = symptoms.slice(i, i + 100).map(s => ({
        id: s.id,
        label: s.label,
        aliases: s.aliases || [],
        body_system: s.body_system || null,
        severity_levels: s.severity_levels || [],
        commonly_associated_diseases: s.commonly_associated_diseases || [],
        red_flag: s.red_flag ? true : false,
        follow_up_questions: s.follow_up_questions || []
      }))
      
      const { error } = await supabase.from('kb_symptoms').upsert(batch, { onConflict: 'id' }).select()
      if (error) console.error('Error inserting symptoms batch:', error.message)
      else console.log(`✓ Inserted symptoms ${i} to ${i + batch.length}`)
    }
  }

  // 2. Migrate Medicines
  if (fs.existsSync(MED_INDEX)) {
    const { medicines } = JSON.parse(fs.readFileSync(MED_INDEX, 'utf8'))
    console.log(`Migrating ${medicines.length} medicines...`)
    
    const medRecords = []
    for (const entry of medicines) {
      const slugPath = path.join(MED_DIR, `${entry.slug}.json`)
      if (fs.existsSync(slugPath)) {
        const m = JSON.parse(fs.readFileSync(slugPath, 'utf8'))
        medRecords.push({
          slug: m.slug,
          name: m.name,
          generic_name: m.generic_name || null,
          manufacturer: m.manufacturer || null,
          uses: m.uses || [],
          how_it_works: m.how_it_works || null,
          dosage_forms: m.dosage_forms || [],
          side_effects_common: (m.side_effects || {}).common || [],
          side_effects_serious: (m.side_effects || {}).serious || [],
          drug_interactions: m.drug_interactions || [],
          food_interactions: m.food_interactions || [],
          contraindications: m.contraindications || [],
          what_to_avoid: m.what_to_avoid || [],
          storage: m.storage || null,
          source_note: m.source_note || null,
          last_updated: m.last_updated || null
        })
      }
    }

    for (let i = 0; i < medRecords.length; i += 100) {
      const batch = medRecords.slice(i, i + 100)
      const { error } = await supabase.from('kb_medicines').upsert(batch, { onConflict: 'slug' }).select()
      if (error) console.error('Error inserting medicines batch:', error.message)
      else console.log(`✓ Inserted medicines ${i} to ${i + batch.length}`)
    }
  }

  console.log('✅ Migration complete!')
}

migrate().catch(console.error)
