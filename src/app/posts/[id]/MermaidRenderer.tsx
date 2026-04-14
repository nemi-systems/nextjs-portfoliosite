'use client';

import { useEffect } from 'react';

let mermaidInitialized = false;

export default function MermaidRenderer() {
  useEffect(() => {
    let cancelled = false;

    const renderMermaidBlocks = async () => {
      const mermaid = (await import('mermaid')).default;
      const secondaryRgb = getComputedStyle(document.documentElement)
        .getPropertyValue('--theme-secondary-rgb')
        .trim() || '90 253 129';
      const secondaryColor = `rgb(${secondaryRgb.replace(/\s+/g, ', ')})`;

      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: 'dark',
        themeVariables: {
          primaryColor: '#111827',
          primaryTextColor: '#E5E7EB',
          primaryBorderColor: secondaryColor,
          lineColor: secondaryColor,
          fontFamily: 'monospace',
          edgeLabelBackground: '#0B1220',
          tertiaryColor: '#0B1220',
          tertiaryBorderColor: '#334155',
        },
      });
      mermaidInitialized = true;

      const blocks = Array.from(
        document.querySelectorAll<HTMLElement>('.prose pre[data-language="mermaid"]')
      );

      for (let i = 0; i < blocks.length; i += 1) {
        const pre = blocks[i];
        const figure = pre.closest('figure') as HTMLElement | null;

        if (!figure || figure.dataset.mermaidRendered === '1') {
          continue;
        }

        const code = pre.querySelector('code');
        const source = code?.textContent?.trim();
        if (!source) {
          continue;
        }

        try {
          const renderId = `mermaid-diagram-${Date.now()}-${i}`;
          const rendered = await mermaid.render(renderId, source);

          if (cancelled) {
            return;
          }

          const container = document.createElement('div');
          container.className = 'mermaid-diagram';
          container.innerHTML = rendered.svg;

          figure.insertAdjacentElement('afterend', container);
          figure.style.display = 'none';
          figure.dataset.mermaidRendered = '1';

          if (typeof rendered.bindFunctions === 'function') {
            rendered.bindFunctions(container);
          }
        } catch (error) {
          console.warn('[blog-mermaid] Failed to render diagram:', error);
        }
      }
    };

    renderMermaidBlocks();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
