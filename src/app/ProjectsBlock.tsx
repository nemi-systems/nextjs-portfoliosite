// @ts-nocheck
'use client'

import React from 'react'
import GitHubIcon from '@mui/icons-material/GitHub'
import projectsConfig from '@/content/projects'
import { hrefHtml } from '@/lib/links'
import { FeaturedProjectsGrid } from './FeaturedProjectsGrid'

const openTarget = (target: string) => {
  window.open(hrefHtml(target), '_blank')
}

export const ProjectsBlock = () => {
  if (projectsConfig.items.length === 0) {
    return null
  }

  const featuredProjectTitles = [
    'GravityLens',
    'Ontology',
    'Web Audio Synthesizer',
  ]
  const tableProjects = projectsConfig.items.filter(
    (project) => !featuredProjectTitles.includes(project.title)
  )

  return (
    <section id="projects" className="mb-2 scroll-mt-8">
      <div className="content-section-borderless m-0 p-0">
        <div className="terminal-header">
          <span className="terminal-header-text">PROJECTS</span>
        </div>
        <div className="px-4 pt-4 pb-4">
          <FeaturedProjectsGrid />

          {tableProjects.length > 0 ? (
            <div className="my-6 border-t border-box-outline"></div>
          ) : null}

          <div className="hidden md:block overflow-x-auto">
            <table className="data-table w-full font-mono text-xs">
              <thead>
                <tr>
                  <th className="text-left">ID</th>
                  <th className="text-left">PROJECT</th>
                  <th className="text-center">GITHUB</th>
                  <th className="text-center">LINK</th>
                </tr>
              </thead>
              <tbody>
                {tableProjects.map((project, index) => (
                  <tr
                    key={project.title}
                    className="group border-b border-box-outline transition-colors cursor-pointer hover:bg-highlight-bg"
                    onClick={() => openTarget(project.url)}
                  >
                    <td className="font-mono text-xs">{`P${String(index + 1).padStart(2, '0')}`}</td>
                    <td className="font-mono text-xs">
                      <div className="text-box-title-bg">{project.title}</div>
                      <div className="text-xs mt-1">{project.summary}</div>
                    </td>
                    <td className="font-mono text-xs text-center">
                      <button
                        type="button"
                        className="inline-flex items-center justify-center transition-colors group-hover:text-primary-green"
                        onClick={(event) => {
                          event.stopPropagation()
                          openTarget(project.githubUrl ?? `https://github.com/${project.github}`)
                        }}
                        title="View on GitHub"
                      >
                        <GitHubIcon style={{ fontSize: '14px' }} />
                      </button>
                    </td>
                    <td className="font-mono text-xs text-center">
                      <a
                        href={hrefHtml(project.url)}
                        className="transition-colors group-hover:text-primary-green"
                        onClick={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                          openTarget(project.url)
                        }}
                      >
                        [ACCESS]
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden">
            {tableProjects.map((project, index) => (
              <div
                key={project.title}
                className="group mobile-card mb-3 p-3 border border-box-outline bg-box-bg cursor-pointer transition-all hover:bg-highlight-bg hover:border-box-title-bg"
                onClick={() => openTarget(project.url)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="font-mono text-xs text-table-text hover-text">{`P${String(index + 1).padStart(2, '0')}`}</div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="flex items-center gap-1 text-table-text transition-colors text-xs group-hover:text-primary-green"
                      onClick={(event) => {
                        event.stopPropagation()
                        openTarget(project.githubUrl ?? `https://github.com/${project.github}`)
                      }}
                      title="View on GitHub"
                    >
                      <GitHubIcon style={{ fontSize: '12px' }} />
                    </button>
                    <a
                      href={hrefHtml(project.url)}
                      className="text-table-text transition-colors text-xs group-hover:text-primary-green"
                      onClick={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        openTarget(project.url)
                      }}
                    >
                      [VIEW]
                    </a>
                  </div>
                </div>
                <div className="text-box-title-bg font-mono text-sm mb-2">{project.title}</div>
                <div className="text-table-text hover-text text-xs leading-relaxed">{project.summary}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
