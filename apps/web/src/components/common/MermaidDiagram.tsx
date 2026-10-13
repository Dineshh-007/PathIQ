'use client';
import React, { useEffect, useRef, useState } from 'react';

interface MermaidDiagramProps {
  chart: string;
  id?: string;
}

export default function MermaidDiagram({ chart, id }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [isRendered, setIsRendered] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    const renderChart = async () => {
      if (!chart || typeof window === 'undefined') return;

      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          securityLevel: 'loose',
          themeVariables: {
            darkMode: true,
            background: '#18181b',
            primaryColor: '#7c3aed',
            primaryTextColor: '#f4f4f5',
            lineColor: '#a78bfa',
            secondaryColor: '#3b82f6',
            tertiaryColor: '#10b981',
            fontFamily: 'inherit',
          },
        });

        // Clean chart input - normalize newlines and strip accidental markdown blocks
        let cleanChart = chart.replace(/```(?:mermaid)?/gi, '').trim();
        const uniqueId = `mermaid-${id || Math.random().toString(36).substring(2, 9)}`;

        const { svg: renderedSvg } = await mermaid.render(uniqueId, cleanChart);
        if (isMounted) {
          setSvg(renderedSvg);
          setIsRendered(true);
          setError(false);
        }
      } catch (err) {
        console.warn('[MermaidDiagram] Render warning, using code fallback:', err);
        if (isMounted) {
          setError(true);
          setIsRendered(true);
        }
      }
    };

    renderChart();

    return () => {
      isMounted = false;
    };
  }, [chart, id]);

  if (error || (!svg && isRendered)) {
    return (
      <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '16px', borderRadius: '10px', border: '1px solid var(--color-border)', overflowX: 'auto' }}>
        <div style={{ fontSize: '0.75rem', color: '#a78bfa', fontWeight: 700, marginBottom: 8 }}>📊 Diagram Flow:</div>
        <pre style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
          {chart}
        </pre>
      </div>
    );
  }

  if (!isRendered) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-subtle)', fontSize: '0.82rem' }}>
        <div className="spin" style={{ width: 24, height: 24, border: '2px solid rgba(124,58,237,0.2)', borderTopColor: '#7c3aed', borderRadius: '50%', margin: '0 auto 8px' }} />
        Rendering visual diagram...
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="mermaid-wrapper"
      style={{
        overflowX: 'auto',
        display: 'flex',
        justifyContent: 'center',
        padding: '16px 0',
        background: 'rgba(124, 58, 237, 0.03)',
        borderRadius: '12px',
        border: '1px solid rgba(124, 58, 237, 0.15)',
      }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
