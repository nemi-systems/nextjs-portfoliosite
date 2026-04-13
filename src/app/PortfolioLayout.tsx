// @ts-nocheck
import React from 'react'
import { Socials } from './Socials'

interface PortfolioLayoutProps {
  sidebar: React.ReactNode
  children: React.ReactNode
}

export const PortfolioLayout = ({ sidebar, children }: PortfolioLayoutProps) => {
  return (
    <div className="bg-bg-main font-mono leading-relaxed antialiased selection:bg-primary-green selection:text-bg-main">
      <div className="portfolio-container">
        <aside className="portfolio-sidebar">
          {sidebar}
          <div className="portfolio-socials hidden lg:block">
            <Socials />
          </div>
        </aside>
        
        <main className="portfolio-main">
          <div className="main-content-wrapper">
            {children}
          </div>
          <div className="lg:hidden mt-8">
            <Socials />
          </div>
        </main>
      </div>
    </div>
  )
}