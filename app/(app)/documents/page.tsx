'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  FileText, 
  Image as ImageIcon, 
  Trash2, 
  BrainCircuit, 
  UploadCloud, 
  ShieldCheck, 
  Clock, 
  Search,
  Filter,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  FileDigit,
  Download,
  Info,
  Archive
} from 'lucide-react'

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [analysing, setAnalysing] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setDocuments(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)

    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch('/api/documents/upload', { method: 'POST', body: formData })
    if (res.ok) await load()
    setUploading(false)
  }

  const handleAnalyse = async (docId: string) => {
    setAnalysing(docId)
    await fetch('/api/documents/analyse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId: docId }),
    })
    await load()
    setAnalysing(null)
  }

  const handleDelete = async (docId: string, filePath: string) => {
    if (!confirm('Permanently remove this clinical document?')) return
    await supabase.storage.from('documents').remove([filePath])
    await supabase.from('documents').delete().eq('id', docId)
    await load()
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Header Segment */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-medical-teal mb-2">Central Repository</div>
          <h1 className="text-3xl font-black text-medical-navy tracking-tight">Clinical Document Vault</h1>
          <p className="mt-2 text-sm font-medium text-slate-500">Secure storage and AI-powered analysis for medical records.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-medical-navy transition-all">
            <Filter size={20} />
          </button>
          <button onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-medical-navy text-white rounded-xl font-bold text-sm shadow-lg shadow-medical-navy/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50">
            {uploading ? (
              <><UploadCloud size={18} className="animate-bounce" /> Processing...</>
            ) : (
              <><UploadCloud size={18} /> Ingest Document</>
            )}
          </button>
          <input ref={fileRef} type="file" className="hidden"
                 accept=".pdf,.jpg,.jpeg,.png,.webp"
                 onChange={handleUpload} />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 rounded-2xl border border-slate-100 bg-slate-50/50 animate-pulse flex flex-col p-6 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-slate-200" />
              <div className="space-y-2">
                <div className="w-3/4 h-4 bg-slate-200 rounded" />
                <div className="w-1/2 h-3 bg-slate-200 rounded" />
              </div>
              <div className="mt-auto w-full h-12 bg-slate-200 rounded-xl" />
            </div>
          ))}
        </div>
      ) : documents.length === 0 ? (
        <div className="glass-card rounded-2xl p-20 text-center flex flex-col items-center border-2 border-dashed border-slate-200 bg-slate-50/30">
          <div className="w-20 h-20 rounded-3xl bg-white shadow-xl flex items-center justify-center text-slate-300 mb-6">
            <Archive size={40} />
          </div>
          <h3 className="text-xl font-black text-medical-navy mb-2">Vault Empty</h3>
          <p className="text-sm font-medium text-slate-500 mb-8 max-w-sm mx-auto">
            Securely upload prescriptions, lab reports, or diagnostic scans for professional interpretation.
          </p>
          <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 px-8 py-3 bg-white border border-slate-200 rounded-xl font-bold text-sm text-medical-navy shadow-sm hover:border-medical-teal hover:text-medical-teal transition-all">
            Upload Initial Document <UploadCloud size={18} />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map((doc) => {
            const d = doc as Record<string, any>
            const isPdf = (d.file_type as string)?.includes('pdf')
            return (
              <div key={d.id} className="glass-card rounded-2xl border border-slate-100 bg-white hover:shadow-xl hover:shadow-medical-navy/5 transition-all group overflow-hidden flex flex-col">
                <div className="p-6 flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isPdf ? 'bg-medical-teal/10 text-medical-teal' : 'bg-medical-navy/5 text-medical-navy'} ring-1 ring-inset ${isPdf ? 'ring-medical-teal/20' : 'ring-medical-navy/10'}`}>
                      {isPdf ? <FileText size={24} /> : <ImageIcon size={24} />}
                    </div>
                    <div className="flex items-center gap-1">
                       <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-slate-50 text-slate-500 border border-slate-100 italic">
                        {d.document_category ?? 'Archival'}
                      </span>
                      <button className="p-1 px-2 text-slate-300 hover:text-slate-600 transition-colors">
                        <MoreVertical size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="mb-4">
                    <h3 className="font-bold text-sm text-medical-navy truncate group-hover:text-medical-teal transition-colors" title={d.filename}>
                      {d.filename}
                    </h3>
                    <div className="flex items-center gap-3 mt-1.5">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                        <Clock size={10} />
                        {new Date(d.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </div>
                      <div className="text-[10px] font-bold text-slate-300">•</div>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                        <FileDigit size={10} />
                        {Math.round((d.file_size ?? 0) / 1024)} KB
                      </div>
                    </div>
                  </div>

                  {d.ai_analysis ? (
                    <div className="relative p-4 rounded-xl bg-medical-teal/[0.03] border border-medical-teal/10 group/analysis">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-5 h-5 rounded-full bg-medical-teal/10 flex items-center justify-center text-medical-teal">
                          <BrainCircuit size={12} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-medical-teal">Clinical Analysis</span>
                      </div>
                      <p className="text-[11px] font-medium text-slate-600 leading-relaxed line-clamp-3">
                        {d.ai_analysis}
                      </p>
                      <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-transparent to-transparent opacity-0 group-hover/analysis:opacity-100 transition-opacity flex items-end justify-center p-2">
                         <span className="text-[9px] font-bold text-medical-teal uppercase tracking-widest">View Full Interpretation</span>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => handleAnalyse(d.id)}
                            disabled={analysing === d.id}
                            className="w-full py-4 rounded-xl border border-dashed border-medical-teal/30 bg-medical-teal/[0.02] text-medical-teal group/analyse hover:bg-medical-teal/5 transition-all text-center flex flex-col items-center justify-center gap-1">
                      {analysing === d.id ? (
                        <>
                          <BrainCircuit size={20} className="animate-spin" />
                          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Neural Processing...</span>
                        </>
                      ) : (
                        <>
                          <BrainCircuit size={20} className="group-hover/analyse:scale-110 transition-transform" />
                          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Initiate AI Diagnostics</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                <div className="px-4 py-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-medical-navy transition-colors">
                    <Download size={12} /> Download
                  </button>
                  <button onClick={() => handleDelete(d.id, d.file_path)}
                          className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-rose-400 hover:text-rose-600 transition-colors">
                    <Trash2 size={12} /> Erase
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Security Disclaimer */}
      <div className="flex items-start gap-4 p-5 rounded-2xl border-2 border-slate-100 bg-white shadow-sm overflow-hidden relative">
        <div className="absolute right-0 top-0 opacity-[0.03] -mr-8 -mt-8 rotate-12">
          <ShieldCheck size={160} className="text-medical-navy" />
        </div>
        <div className="w-10 h-10 rounded-xl bg-medical-navy flex items-center justify-center text-white shrink-0 shadow-lg shadow-medical-navy/20">
          <ShieldCheck size={20} />
        </div>
        <div className="relative z-10">
          <h4 className="text-sm font-bold text-medical-navy flex items-center gap-1.5">
            Protocol Security Active <CheckCircle2 size={14} className="text-emerald-500" />
          </h4>
          <p className="text-xs font-medium text-slate-500 mt-1 max-w-2xl leading-relaxed">
            All documents are stored in encrypted buckets with AES-256 protocol. AI analysis is performed in a stateless environment using Nemotron-3. Your data remains your property and is never used for external training. 
            <span className="text-medical-teal font-bold hover:underline cursor-pointer ml-1 inline-flex items-center gap-0.5 whitespace-nowrap">
              Review Security Manifesto <Info size={12} />
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}
