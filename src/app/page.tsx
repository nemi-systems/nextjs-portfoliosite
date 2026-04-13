// @ts-nocheck
import React from 'react'
import { getAllPosts } from '@/lib/api'
import { SideBar } from './SideBar'
import { AboutBlock } from './AboutBlock'
import { ProjectsBlock } from './ProjectsBlock'
import { BlogLinkBlock } from './BlogLinkBlock'
import { RetroGlobe } from './RetroGlobe'
import { PortfolioLayout } from './PortfolioLayout'

const UserProfile = () => {
  return (
    <div className="fused-panel-top w-full">
      <div className="terminal-header">
        <span className="terminal-header-text">PROFILE</span>
      </div>
    </div>
  );
};

const Sidebar = () => {
  return (
    <div className="fused-terminal-layout">
      <UserProfile />
      <RetroGlobe />
      <SideBar />
    </div>
  );
};

export default async function Home() {
  const posts = await getAllPosts();
  
  return (
    <PortfolioLayout sidebar={<Sidebar />}>
      <AboutBlock />
      <ProjectsBlock />
      <BlogLinkBlock posts={posts} />
    </PortfolioLayout>
  )
}
