import type { Metadata } from 'next'
import { Rss, Clock, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Health Blog | Arogya',
  description: 'Evidence-based health articles, wellness tips, and Ayurvedic insights curated for you.',
}

const POSTS = [
  {
    tag: 'Heart Health',
    tagColor: '#be123c',
    tagBg: 'var(--bg-card)1f2',
    title: 'Understanding Blood Pressure: What the Numbers Mean',
    excerpt:
      'Blood pressure readings consist of two numbers — systolic and diastolic. Learn what each number indicates, what ranges are considered normal, and when you should seek medical advice.',
    readTime: '5 min read',
    date: 'Apr 18, 2026',
    emoji: '❤️',
  },
  {
    tag: 'Diabetes',
    tagColor: '#5b21b6',
    tagBg: '#f5f3ff',
    title: 'Controlling Blood Sugar Naturally Through Diet',
    excerpt:
      'Discover the foods that help stabilize blood sugar, the importance of fiber and complex carbohydrates, and how small dietary changes can lead to significant improvements in your readings.',
    readTime: '7 min read',
    date: 'Apr 15, 2026',
    emoji: '🍃',
  },
  {
    tag: 'Ayurveda',
    tagColor: '#047857',
    tagBg: '#ecfdf5',
    title: 'Top Ayurvedic Herbs for Immune Strength',
    excerpt:
      'From Ashwagandha to Tulsi, ancient Ayurvedic traditions offer powerful herbal allies for building immunity. Understand how these herbs work and how to safely incorporate them into your routine.',
    readTime: '6 min read',
    date: 'Apr 12, 2026',
    emoji: '🌿',
  },
  {
    tag: 'Respiratory',
    tagColor: '#0369a1',
    tagBg: '#e0f2fe',
    title: 'Improving Oxygen Levels: Breathing Exercises That Work',
    excerpt:
      'Pranayama and other structured breathing techniques have measurable impacts on SpO₂ levels. This guide walks through the evidence-backed exercises you can start today.',
    readTime: '4 min read',
    date: 'Apr 10, 2026',
    emoji: '🌬️',
  },
  {
    tag: 'Mental Wellness',
    tagColor: '#b45309',
    tagBg: '#fef3c7',
    title: 'The Gut-Brain Connection: Why Your Digestion Affects Your Mood',
    excerpt:
      'Research shows the gut microbiome communicates directly with the brain. Learn how improving gut health through diet, probiotics, and stress reduction can uplift your mental wellbeing.',
    readTime: '8 min read',
    date: 'Apr 8, 2026',
    emoji: '🧠',
  },
  {
    tag: 'Yoga & Lifestyle',
    tagColor: 'var(--accent)',
    tagBg: '#f0fdfa',
    title: 'Morning Yoga Routines for Seniors: A 15-Minute Guide',
    excerpt:
      'A gentle, chair-assisted yoga sequence designed for elderly patients to improve flexibility, balance, and circulation — no prior experience required.',
    readTime: '5 min read',
    date: 'Apr 5, 2026',
    emoji: '🧘',
  },
]

export default function BlogPage() {
  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', paddingTop: '32px', paddingBottom: '80px' }}>
      {/* Page header */}
      <div className="flex items-center gap-3 mb-2">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--medical-navy)' }}
        >
          <Rss size={20} style={{ color: 'var(--medical-teal)' }} />
        </div>
        <div>
          <h1
            className="font-black m-0 leading-tight"
            style={{ fontSize: '22px', color: 'var(--medical-navy)' }}
          >
            Health Blog
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
            Evidence-based articles for better health & wellbeing
          </p>
        </div>
      </div>

      <div className="w-full h-px mb-6 mt-4" style={{ background: 'var(--border)' }} />

      {/* Posts grid */}
      <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
        {POSTS.map((post, i) => (
          <article
            key={i}
            className="rounded-2xl border p-5 flex flex-col gap-3 hover:shadow-lg transition-all hover:-translate-y-0.5 cursor-pointer"
            style={{
              background: 'var(--bg-card)fff',
              borderColor: 'var(--border)',
            }}
          >
            {/* Emoji banner */}
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
              style={{ background: post.tagBg }}
            >
              {post.emoji}
            </div>

            {/* Tag + date */}
            <div className="flex items-center justify-between">
              <span
                className="px-2.5 py-0.5 rounded-full text-xs font-bold"
                style={{ background: post.tagBg, color: post.tagColor }}
              >
                {post.tag}
              </span>
              <div className="flex items-center gap-1" style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                <Clock size={11} />
                {post.readTime}
              </div>
            </div>

            {/* Title */}
            <h2
              style={{
                fontSize: '15px',
                fontWeight: 800,
                color: 'var(--medical-navy)',
                margin: 0,
                lineHeight: 1.4,
              }}
            >
              {post.title}
            </h2>

            {/* Excerpt */}
            <p
              style={{
                fontSize: '13px',
                color: '#475569',
                lineHeight: 1.65,
                margin: 0,
                flex: 1,
              }}
            >
              {post.excerpt}
            </p>

            {/* Footer row */}
            <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>
                {post.date}
              </span>
              <div
                className="flex items-center gap-1 font-semibold hover:gap-2 transition-all"
                style={{ fontSize: '12px', color: 'var(--medical-teal)' }}
              >
                Read More <ArrowRight size={13} />
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Coming soon note */}
      <div
        className="mt-8 rounded-2xl p-5 text-center"
        style={{ background: 'var(--bg-secondary)', border: '1.5px dashed var(--border)' }}
      >
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>
          📬 More health articles published every week. Check back soon or{' '}
          <Link href="/profile" style={{ color: 'var(--medical-teal)', fontWeight: 600 }}>
            update your preferences
          </Link>{' '}
          to get personalized recommendations.
        </p>
      </div>
    </div>
  )
}
