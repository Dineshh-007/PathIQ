'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // mounted prevents hydration mismatch: localStorage is only available on the client
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Animate background particles
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.5,
      dx: (Math.random() - 0.5) * 0.3,
      dy: (Math.random() - 0.5) * 0.3,
      opacity: Math.random() * 0.5 + 0.1,
    }));

    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(139, 92, 246, ${p.opacity})`;
        ctx.fill();
        p.x += p.dx;
        p.y += p.dy;
        if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    const onResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); };
  }, []);

  const features = [
    { icon: '🗳️', title: 'Democratic Question Selection', desc: 'Interviewers vote on which of 5 curated questions to ask. The highest-voted question wins.' },
    { icon: '⏱️', title: 'Live Timer Enforcement', desc: 'Server-enforced countdowns for voting, answering, and evaluation. No one can cheat the clock.' },
    { icon: '🔒', title: 'Private Scoring', desc: 'Individual evaluator scores are sealed until every interviewer submits. No social bias.' },
    { icon: '🔄', title: 'Automatic Role Rotation', desc: 'All 5 participants take turns as the interviewee. Everyone gets equal practice.' },
    { icon: '🏆', title: 'Award System', desc: 'Vote for Best Technical, Best Communicator, Best Thinker, and Best Interviewer.' },
    { icon: '🤖', title: 'AI Coaching (Optional)', desc: 'After the session, Gemini AI analyzes performance and suggests study topics. No AI interviewer.' },
  ];

  const roles = [
    { label: 'Software Engineer', icon: '💻', color: '#7c3aed' },
    { label: 'AI Engineer', icon: '🧠', color: '#6366f1' },
    { label: 'Data Analyst', icon: '📊', color: '#0ea5e9' },
    { label: 'Web Developer', icon: '🌐', color: '#10b981' },
    { label: 'Cybersecurity', icon: '🔐', color: '#f59e0b' },
    { label: 'DevOps Engineer', icon: '⚙️', color: '#ef4444' },
  ];

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <div className="bg-mesh" />
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.6 }} />

      {/* NAV */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, padding: '0 24px', background: 'rgba(8,8,15,0.8)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(139,92,246,0.1)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #7c3aed, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>⚡</div>
            <span style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>PathIQ</span>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            {mounted && isAuthenticated() ? (
              <Link href="/dashboard"><button className="btn-primary" style={{ padding: '9px 20px', fontSize: '0.85rem' }}>Dashboard →</button></Link>
            ) : (
              <>
                <Link href="/login"><button className="btn-ghost" style={{ padding: '9px 20px', fontSize: '0.85rem' }}>Sign In</button></Link>
                <Link href="/register"><button className="btn-primary" style={{ padding: '9px 20px', fontSize: '0.85rem' }}>Get Started</button></Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main style={{ position: 'relative', zIndex: 1 }}>
        {/* HERO */}
        <section style={{ padding: '100px 24px 80px', textAlign: 'center', maxWidth: 900, margin: '0 auto' }}>
          <div className="fade-in-up" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 999, background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', fontSize: '0.8rem', color: '#a78bfa', marginBottom: 28, fontWeight: 600 }}>
            <span>✨</span> 5-player multiplayer interview platform
          </div>
          <h1 className="fade-in-up" style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', fontWeight: 900, lineHeight: 1.08, letterSpacing: '-0.04em', marginBottom: 24, animationDelay: '0.1s' }}>
            Practice Interviews<br />
            <span className="text-gradient">Together. Competitively.</span>
          </h1>
          <p className="fade-in-up" style={{ fontSize: 'clamp(1rem, 2.5vw, 1.2rem)', color: 'var(--color-text-muted)', maxWidth: 640, margin: '0 auto 44px', lineHeight: 1.7, animationDelay: '0.2s' }}>
            5 students. Real questions. Peer voting. Private scoring. Award ceremonies. 
            The most realistic and engaging interview practice you can do without a real recruiter.
          </p>
          <div className="fade-in-up" style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', animationDelay: '0.3s' }}>
            <Link href={mounted && isAuthenticated() ? '/dashboard' : '/register'}>
              <button className="btn-primary pulse-glow" style={{ padding: '14px 36px', fontSize: '1rem' }}>
                {mounted && isAuthenticated() ? 'Go to Dashboard →' : 'Start Free →'}
              </button>
            </Link>
            <Link href="#how-it-works">
              <button className="btn-ghost" style={{ padding: '14px 32px', fontSize: '1rem' }}>See How It Works</button>
            </Link>
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 48, justifyContent: 'center', marginTop: 64, flexWrap: 'wrap' }}>
            {[['5', 'Players per room'], ['6', 'Interview roles'], ['60+', 'Questions'], ['∞', 'Practice sessions']].map(([num, label]) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 900, background: 'linear-gradient(135deg, #a78bfa, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{num}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-subtle)', marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ROLES */}
        <section style={{ padding: '60px 24px', maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 12 }}>
              Practice for <span className="text-gradient">Any Role</span>
            </h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>Expert-curated questions across 6 engineering disciplines</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
            {roles.map((role) => (
              <div key={role.label} className="glass" style={{ padding: '20px 16px', textAlign: 'center', transition: 'transform 0.2s, border-color 0.2s', cursor: 'default' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)'; (e.currentTarget as HTMLDivElement).style.borderColor = role.color + '60'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLDivElement).style.borderColor = ''; }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>{role.icon}</div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>{role.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" style={{ padding: '80px 24px', maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 12 }}>
              How <span className="text-gradient">One Session Works</span>
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[
              { step: '01', title: 'Create or Join a Room', desc: 'Share a 6-character code with your study group. No accounts required for joining.' },
              { step: '02', title: 'Interviewee Selects Their Role', desc: 'Choose Software Engineer, AI Engineer, Data Analyst, Web Developer, Cybersecurity, or DevOps.' },
              { step: '03', title: 'Interviewers Vote on Questions', desc: '5 curated questions appear. Each of the 4 interviewers votes. Highest vote wins. 60 seconds.' },
              { step: '04', title: 'Answer with a Live Timer', desc: 'The lead interviewer reads the question. The interviewee has 3 minutes to answer.' },
              { step: '05', title: 'Private Evaluation', desc: 'Each interviewer secretly scores 1–10 with written feedback. Scores are sealed until all submit.' },
              { step: '06', title: 'Scores Revealed Simultaneously', desc: 'All 4 scores animate in at once. Average shown. No social bias corruption.' },
              { step: '07', title: 'Rotate to Next Interviewee', desc: 'After 2 questions each, the hot seat rotates. All 5 students take turns.' },
              { step: '08', title: 'Awards + AI Coaching', desc: 'Vote for peer awards. Optionally trigger AI coaching to get personalized study recommendations.' },
            ].map((item, i) => (
              <div key={item.step} style={{ display: 'flex', gap: 24, alignItems: 'flex-start', paddingBottom: i < 7 ? 32 : 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(99,102,241,0.2))', border: '1px solid rgba(124,58,237,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem', color: '#a78bfa', flexShrink: 0 }}>{item.step}</div>
                  {i < 7 && <div style={{ width: 2, flex: 1, background: 'linear-gradient(to bottom, rgba(124,58,237,0.4), transparent)', marginTop: 8, minHeight: 32 }} />}
                </div>
                <div style={{ paddingTop: 10 }}>
                  <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 6 }}>{item.title}</h3>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem', lineHeight: 1.7 }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FEATURES */}
        <section style={{ padding: '80px 24px', maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 12 }}>
              Built for <span className="text-gradient">Serious Preparation</span>
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            {features.map((f) => (
              <div key={f.title} className="glass" style={{ padding: 28, transition: 'transform 0.2s' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; }}>
                <div style={{ fontSize: 32, marginBottom: 14 }}>{f.icon}</div>
                <h3 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 8 }}>{f.title}</h3>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', lineHeight: 1.7 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section style={{ padding: '80px 24px 100px', textAlign: 'center' }}>
          <div className="glass" style={{ maxWidth: 640, margin: '0 auto', padding: '60px 40px' }}>
            <div style={{ fontSize: 48, marginBottom: 20 }}>🚀</div>
            <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 800, marginBottom: 16, letterSpacing: '-0.03em' }}>
              Ready to practice?
            </h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 32, lineHeight: 1.7 }}>
              Gather 4 friends. Create a room. Begin the most realistic peer interview practice you&apos;ve ever done.
            </p>
            <Link href={mounted && isAuthenticated() ? '/dashboard' : '/register'}>
              <button className="btn-primary pulse-glow" style={{ padding: '14px 40px', fontSize: '1rem' }}>
                {mounted && isAuthenticated() ? 'Go to Dashboard →' : 'Create Your Account →'}
              </button>
            </Link>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid var(--color-border)', padding: '32px 24px', textAlign: 'center', color: 'var(--color-text-subtle)', fontSize: '0.85rem', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>⚡ PathIQ</span>
            <span>·</span>
            <span>Built with Next.js, Fastify, Socket.io, Prisma & Gemini AI</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8 }}>
            <span>Need Help? Contact: <strong style={{ color: 'var(--color-text)' }}>Dinesh E</strong></span>
            <a href="mailto:dineshedine007@gmail.com" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#a78bfa', textDecoration: 'none' }} onMouseEnter={(e) => e.currentTarget.style.textDecoration='underline'} onMouseLeave={(e) => e.currentTarget.style.textDecoration='none'}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
              Email
            </a>
            <a href="https://www.linkedin.com/in/dineshe007/" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#a78bfa', textDecoration: 'none' }} onMouseEnter={(e) => e.currentTarget.style.textDecoration='underline'} onMouseLeave={(e) => e.currentTarget.style.textDecoration='none'}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
              LinkedIn
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
