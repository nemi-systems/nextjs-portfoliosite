// @ts-nocheck
import React from 'react'
import aboutConfig from '@/content/about.json'

export const AboutBlock = () => {
  return (
    <section id="about" className="mb-2 scroll-mt-8">
      <div className="content-section-borderless m-0 p-0">
        <div className="terminal-header">
          <span className="terminal-header-text">ABOUT</span>
        </div>
        <div className="px-4 pt-4 pb-4 space-y-4 text-table-text font-mono text-sm">
          {aboutConfig.paragraphs.map((paragraph, index) => (
            <p key={index} className="break-words leading-relaxed">
              {paragraph}
            </p>
          ))}
        </div>
      </div>
    </section>
  )
}
