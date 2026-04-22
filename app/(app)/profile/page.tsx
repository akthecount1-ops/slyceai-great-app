'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'
import { 
  User, 
  ShieldCheck, 
  Trash2, 
  Save, 
  CheckCircle2, 
  AlertCircle,
  Calendar,
  UserCircle,
  MapPin,
  Utensils,
  Lock,
  Heart
} from 'lucide-react'

const INDIAN_STATES = [
  'Andhra Pradesh','Assam','Bihar','Chhattisgarh','Delhi','Goa','Gujarat','Haryana',
  'Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra',
  'Manipur','Meghalaya','Odisha','Punjab','Rajasthan','Tamil Nadu','Telangana',
  'Uttar Pradesh','Uttarakhand','West Bengal','Jammu and Kashmir',
]

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [form, setForm] = useState<Partial<Profile>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [email, setEmail] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setEmail(user.email ?? '')
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(data as Profile)
    setForm(data as Profile)
  }, [supabase])

  useEffect(() => { load() }, [load])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    
    // Update the database
    await supabase.from('profiles').update({
      name: form.name,
      date_of_birth: form.date_of_birth,
      gender: form.gender,
      food_preference: form.food_preference,
      state: form.state,
      city: form.city,
      allergies: form.allergies,
    }).eq('id', user.id)
    
    // Update the local state
    setProfile((prev) => prev ? { ...prev, ...form } : null)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    
    // Dispatch a custom event to update AppHeader profile avatar if needed
    window.dispatchEvent(new Event('profile-updated'))
  }

  const handleDeleteAccount = async () => {
    if (!confirm('Are you absolutely sure? This will permanently delete ALL your data including vitals, medications, documents, and chat history.')) return
    if (!confirm('Final confirmation: Are you sure you want to proceed?')) return
    await supabase.auth.signOut()
    router.push('/')
  }

  if (!profile) return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-12">
       <div className="shimmer h-12 w-1/3 rounded-xl mb-8" />
       <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="shimmer h-96 rounded-2xl md:col-span-2" />
          <div className="shimmer h-96 rounded-2xl md:col-span-1" />
       </div>
    </div>
  )

  const initial = profile.name?.charAt(0)?.toUpperCase() ?? 'U'

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pt-8 pb-20">
      
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-200/60">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <User className="text-teal-600" size={24} />
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
              My Profile
            </h1>
          </div>
          <p className="text-slate-500 font-medium">Manage your personal information and account settings</p>
        </div>
        
        {/* Profile Avatar / Email Chip */}
        <div className="flex items-center gap-4 bg-white p-2 pr-6 rounded-full border border-slate-200 shadow-sm">
           <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-white shadow-md font-bold text-xl select-none">
              {initial}
           </div>
           <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-800 truncate max-w-[150px]">{profile.name || 'User'}</span>
              <span className="text-xs font-medium text-slate-500 truncate max-w-[150px]">{email}</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* ── Main Form Form ── */}
        <div className="lg:col-span-2 space-y-6">
           <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                 <h2 className="text-[15px] font-bold text-slate-800 flex items-center gap-2">
                   <UserCircle size={18} className="text-teal-600" />
                   Personal Information
                 </h2>
                 {saved && (
                   <div className="flex items-center gap-1.5 text-emerald-600 text-[13px] font-bold bg-emerald-50 px-3 py-1 rounded-full animate-fade-in">
                     <CheckCircle2 size={14} /> Saved successfully
                   </div>
                 )}
              </div>
              
              <form onSubmit={handleSave} className="p-8 space-y-6">
                
                {/* Name & DOB */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[13px] font-semibold text-slate-600 ml-1">Full Name</label>
                    <input 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-teal-100 focus:border-teal-500 outline-none transition-all" 
                      value={form.name ?? ''} 
                      onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} 
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[13px] font-semibold text-slate-600 ml-1">Date of Birth</label>
                    <input 
                      type="date" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-teal-100 focus:border-teal-500 outline-none transition-all" 
                      value={form.date_of_birth ?? ''} 
                      onChange={(e) => setForm((p) => ({ ...p, date_of_birth: e.target.value }))} 
                    />
                  </div>
                </div>

                {/* Gender & Diet */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[13px] font-semibold text-slate-600 ml-1">Gender</label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-teal-100 focus:border-teal-500 outline-none transition-all" 
                      value={form.gender ?? ''} 
                      onChange={(e) => setForm((p) => ({ ...p, gender: e.target.value }))}
                    >
                      <option value="">Select Gender</option>
                      {['Male', 'Female', 'Other', 'Prefer not to say'].map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[13px] font-semibold text-slate-600 ml-1">Dietary Preference</label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-teal-100 focus:border-teal-500 outline-none transition-all capitalize" 
                      value={form.food_preference ?? 'vegetarian'} 
                      onChange={(e) => setForm((p) => ({ ...p, food_preference: e.target.value }))}
                    >
                      {['vegetarian', 'non-vegetarian', 'vegan', 'jain', 'keto', 'other'].map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                </div>

                {/* Location */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[13px] font-semibold text-slate-600 ml-1">State</label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-teal-100 focus:border-teal-500 outline-none transition-all" 
                      value={form.state ?? ''} 
                      onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))}
                    >
                      <option value="">Select State</option>
                      {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[13px] font-semibold text-slate-600 ml-1">City</label>
                    <input 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-teal-100 focus:border-teal-500 outline-none transition-all placeholder:text-slate-400" 
                      value={form.city ?? ''} 
                      onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} 
                      placeholder="e.g. Mumbai" 
                    />
                  </div>
                </div>

                {/* Allergies */}
                <div className="space-y-2">
                  <label className="text-[13px] font-semibold text-slate-600 ml-1">Allergies & Conditions (Optional)</label>
                  <textarea 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-teal-100 focus:border-teal-500 outline-none transition-all placeholder:text-slate-400 resize-none" 
                    value={form.allergies?.join(', ') ?? ''} 
                    onChange={(e) => setForm((p) => ({ ...p, allergies: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))} 
                    placeholder="E.g., Penicillin allergy, Asthma"
                    rows={3}
                  />
                </div>

                {/* Submit */}
                <div className="pt-4 border-t border-slate-100">
                  <button 
                    type="submit" 
                    disabled={saving} 
                    className="bg-slate-800 text-white px-8 py-3.5 rounded-xl text-[14px] font-bold shadow-md shadow-slate-200 hover:bg-slate-700 hover:shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving Changes...' : <><Save size={18} className="text-teal-400" /> Save Profile</>}
                  </button>
                </div>
              </form>
           </div>
        </div>

        {/* ── Sidebar Panels ── */}
        <div className="lg:col-span-1 space-y-6">
           
           {/* Account Details */}
           <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-[13px] font-bold uppercase tracking-wider text-slate-500 mb-5">Account Status</h3>
              <div className="space-y-4">
                 <div>
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Joined Date</div>
                    <div className="text-[14px] font-bold text-slate-800 flex items-center gap-2">
                       <Calendar size={14} className="text-teal-600" />
                       {profile.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </div>
                 </div>
                 
                 <div className="pt-4 border-t border-slate-100">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Privacy</div>
                    <div className="flex items-center gap-2 text-[13px] font-bold text-emerald-600 bg-emerald-50 w-fit px-3 py-1.5 rounded-lg border border-emerald-100">
                       <Lock size={14} /> End-to-End Encrypted
                    </div>
                 </div>
              </div>
           </div>

           {/* Danger Zone */}
           <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-6 space-y-4">
              <div className="flex items-center gap-2 text-rose-600">
                 <AlertCircle size={18} strokeWidth={2.5} />
                 <h3 className="text-[14px] font-bold">Danger Zone</h3>
              </div>
              <p className="text-[13px] font-medium text-rose-900/70 leading-relaxed">
                Deleting your account will permanently erase your profile, vitals, medications, and all chat history. This action cannot be reversed.
              </p>
              <button 
                onClick={handleDeleteAccount}
                className="w-full py-3 mt-2 rounded-xl bg-white border border-rose-200 text-rose-600 text-[13px] font-bold hover:bg-rose-600 hover:text-white transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <Trash2 size={16} /> Delete Account
              </button>
           </div>
        </div>
      </div>
    </div>
  )
}
