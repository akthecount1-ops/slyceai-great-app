'use client'

import React, { useState, useRef } from 'react'
import AppModal from './AppModal'
import { Upload, FileText, Check, X, AlertCircle } from 'lucide-react'

interface UploadReportModalProps {
  onClose: () => void
  onSuccess?: () => void
}

export default function UploadReportModal({ onClose, onSuccess }: UploadReportModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error || 'Upload failed. Please try again.')
        setUploading(false)
        return
      }

      // Success
      setDone(true)
      setTimeout(() => {
        onSuccess?.()
        onClose()
      }, 1200)

    } catch (err) {
      setError('Network error — please check your connection and try again.')
      setUploading(false)
    }
  }

  return (
    <AppModal title="Upload Report" subtitle="Upload lab results, prescriptions, or scans for AI analysis." onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          style={{ display: 'none' }}
        />

        {!file ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: '1.5px dashed var(--border)',
              borderRadius: '12px',
              padding: '32px 20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
              background: 'var(--bg-secondary)',
              transition: 'border-color 0.15s, background 0.15s'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--accent)'
              e.currentTarget.style.background = 'rgba(13, 148, 136, 0.03)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.background = 'var(--bg-secondary)'
            }}
          >
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Upload size={20} strokeWidth={2} style={{ color: '#2563eb' }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Click to upload</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>PDF, JPG, PNG or WebP (max 10MB)</div>
            </div>
          </div>
        ) : (
          <div style={{
            border: `1.5px solid ${done ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: done ? 'var(--badge-green-bg)' : 'var(--bg-secondary)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: 36, height: 36, borderRadius: '8px', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={18} strokeWidth={2} style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {file.name}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                  {done && <span style={{ marginLeft: 8, color: 'var(--accent)', fontWeight: 600 }}>✓ Uploaded to S3</span>}
                </div>
              </div>
            </div>
            {!uploading && !done && (
              <button
                onClick={() => setFile(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}
              >
                <X size={16} />
              </button>
            )}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: '8px',
            padding: '10px 14px', borderRadius: '8px',
            background: '#fef2f2', border: '1px solid #fecaca',
            color: '#dc2626', fontSize: '13px'
          }}>
            <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{error}</span>
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '4px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
              background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)',
              cursor: 'pointer', fontFamily: 'inherit'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={uploading || !file || done}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
              background: done ? '#16a34a' : 'var(--accent)', border: 'none', color: 'var(--bg-card)',
              cursor: (uploading || !file || done) ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', opacity: (!file && !done) ? 0.5 : 1, transition: 'all 0.15s'
            }}
          >
            {done ? <><Check size={14} /> Uploaded!</> : uploading ? 'Uploading to S3...' : <><Check size={14} /> Analyze Report</>}
          </button>
        </div>
      </div>
    </AppModal>
  )
}
