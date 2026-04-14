// @ts-nocheck
'use client'

import React from 'react'
import Image from 'next/image'
import GitHubIcon from '@mui/icons-material/GitHub'
import projectsConfig from '@/content/projects'
import { hrefHtml } from '@/lib/links'

const featuredProjectTitles = [
  'GravityLens',
  'Web Audio Synthesizer',
]

const FeaturedProjectCard = ({ title, summary, image, url, github, githubUrl }) => {
  const handleProjectClick = () => {
    window.open(hrefHtml(url), '_blank')
  }

  const handleGitHubClick = (event) => {
    event.preventDefault()
    event.stopPropagation()
    window.open(githubUrl ? githubUrl : `https://github.com/${github}`, '_blank')
  }

  return (
    <div
      className="group cursor-pointer transition-all duration-300 hover:scale-[1.02]"
      onClick={handleProjectClick}
    >
      <div className="border border-box-outline bg-box-bg h-full flex flex-col transition-all duration-300 hover:bg-highlight-bg hover:border-box-title-bg">
        <div className="relative aspect-square w-full overflow-hidden border-b border-box-outline">
          {image ? (
            <Image
              src={image}
              alt={title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-110"
            />
          ) : (
            <div className="w-full h-full bg-box-title-bg/20 flex items-center justify-center">
              <div className="text-box-title-bg font-mono text-xs opacity-50">NO IMAGE</div>
            </div>
          )}
        </div>

        <div className="p-4 flex flex-col">
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-box-title-bg font-mono text-sm font-bold flex-1 mr-2 group-hover:text-primary-green transition-colors duration-200">
              {title}
            </h3>
            {github && (
              <button
                type="button"
                onClick={handleGitHubClick}
                className="text-table-text transition-colors duration-200 group-hover:text-primary-green hover:text-primary-green flex-shrink-0"
                title="View on GitHub"
              >
                <GitHubIcon style={{ fontSize: '16px' }} />
              </button>
            )}
          </div>

          <p className="text-table-text font-mono text-xs leading-relaxed line-clamp-3 group-hover:text-box-title-bg transition-colors duration-200 flex-grow">
            {summary}
          </p>

          <div className="mt-3 pt-3 border-t border-box-outline">
            <div className="font-mono text-xs opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:text-primary-green">
              [CLICK TO VIEW PROJECT]
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export const FeaturedProjectsGrid = () => {
  const featuredProjects = featuredProjectTitles
    .map((title) => projectsConfig.items.find((project) => project.title === title))
    .filter(Boolean)

  if (featuredProjects.length === 0) {
    return null
  }

  return (
    <div className="mb-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {featuredProjects.map((project) => (
          <FeaturedProjectCard
            key={project.title}
            title={project.title}
            summary={project.summary}
            image={project.image}
            url={project.url}
            github={project.github}
            githubUrl={project.githubUrl}
          />
        ))}
      </div>
    </div>
  )
}
