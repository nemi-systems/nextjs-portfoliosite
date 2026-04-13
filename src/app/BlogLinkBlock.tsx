// @ts-nocheck
'use client'

import React from 'react'
const colors = require('tailwindcss/colors');
import Image from 'next/image';
import { hrefHtml } from '@/lib/links';

const postImages = {
  '2021-12-31-grafana-server-monitoring': '/grafana-post/1_Y9zMs-69y5VhPg7OwNWdGg.webp',
  '2021-12-20-tbats-time-series-forecasting': '/tbats-post/header.webp'
};

const BlogItemDesktop = ({ id, date, title, index, totalPosts }) => {
  const postId = `B${(totalPosts - index).toString().padStart(2, '0')}`;
  const handleRowClick = (e) => {
    e.preventDefault();
    const targetUrl = hrefHtml(`/posts/${id}`);
    window.location.assign(targetUrl);
  };
  
  return(
    <tr className="group border-b border-box-outline transition-colors cursor-pointer" onClick={handleRowClick}>
      <td className="font-mono text-xs">
        <a href={hrefHtml(`/posts/${id}`)} className="block w-full h-full">
          {postId}
        </a>
      </td>
      <td className="font-mono text-xs">
        <a href={hrefHtml(`/posts/${id}`)} className="block w-full h-full">
          {date}
        </a>
      </td>
      <td className="font-mono text-xs">
        <a href={hrefHtml(`/posts/${id}`)} className="text-box-title-bg transition-colors inline-block">
          {title}
        </a>
      </td>
      <td className="font-mono text-xs text-center">
        <a href={hrefHtml(`/posts/${id}`)} className="transition-colors inline-block group-hover:text-primary-green">
          [VIEW]
        </a>
      </td>
    </tr>
  )
}

const BlogItem = ({ id, date, title, index, totalPosts }) => {
  const postId = `B${(totalPosts - index).toString().padStart(2, '0')}`;
  const handleCardClick = (e) => {
    e.preventDefault();
    const targetUrl = hrefHtml(`/posts/${id}`);
    window.location.assign(targetUrl);
  };
  
  return(
    <div 
      className="group mobile-card mb-3 p-3 border border-box-outline bg-box-bg transition-all hover:bg-highlight-bg hover:border-box-title-bg block md:hidden cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="font-mono text-xs text-table-text hover-text">{postId}</div>
        <div className="font-mono text-xs text-table-text hover-text">{date}</div>
      </div>
      <div className="mb-2">
        <a href={hrefHtml(`/posts/${id}`)} className="text-box-title-bg transition-colors font-mono text-sm" onClick={(e) => e.stopPropagation()}>
          {title}
        </a>
      </div>
      <div className="text-center">
        <a href={hrefHtml(`/posts/${id}`)} className="text-table-text transition-colors font-mono text-xs group-hover:text-primary-green" onClick={(e) => e.stopPropagation()}>
          [VIEW]
        </a>
      </div>
    </div>
  )
}

export const BlogLinkBlock = ({ posts }) => {
  const recentPosts = posts.slice(0, 3);
  const totalPosts = posts.length;
  
  return (
    <section id="blog" className="mb-2 scroll-mt-8">
      <div className="content-section-borderless m-0 p-0">
        <div className="terminal-header">
          <span className="terminal-header-text">BLOG</span>
        </div>
        <div className="px-4 pt-4 pb-4">
          <div className="hidden md:block overflow-x-auto">
            <table className="data-table w-full font-mono text-xs">
              <thead>
                <tr>
                  <th className="text-left">ID</th>
                  <th className="text-left">DATE</th>
                  <th className="text-left">TITLE</th>
                  <th className="text-center">LINK</th>
                </tr>
              </thead>
              <tbody>
                {recentPosts.map((post, index) => {
                  const { id, date, title } = post;
                  return (
                    <BlogItemDesktop key={id} id={id} date={date} title={title} index={index} totalPosts={recentPosts.length}/>
                  );
                })}
                <tr 
                  className="group border-b border-box-outline transition-colors cursor-pointer"
                  onClick={(e) => { e.preventDefault(); window.location.assign(hrefHtml('/blog')); }}
                >
                  <td className="font-mono text-xs">
                    <a href={hrefHtml('/blog')} className="block w-full h-full">B##</a>
                  </td>
                  <td className="font-mono text-xs">
                    <a href={hrefHtml('/blog')} className="block w-full h-full">ALL</a>
                  </td>
                  <td className="font-mono text-xs">
                    <a href={hrefHtml('/blog')} className="text-box-title-bg transition-colors inline-block">
                      VIEW_ALL_POSTS
                    </a>
                  </td>
                  <td className="font-mono text-xs text-center">
                    <a href={hrefHtml('/blog')} className="transition-colors inline-block group-hover:text-primary-green">
                      [BROWSE]
                    </a>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="md:hidden">
            {recentPosts.map((post, index) => {
              const { id, date, title } = post;
              return (
                <BlogItem key={id} id={id} date={date} title={title} index={index} totalPosts={recentPosts.length}/>
              );
            })}
            <div 
              className="group mobile-card mb-3 p-3 border border-box-outline bg-box-bg transition-all hover:bg-highlight-bg hover:border-box-title-bg cursor-pointer"
              onClick={(e) => { e.preventDefault(); window.location.assign(hrefHtml('/blog')); }}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="font-mono text-xs text-table-text hover-text">B##</div>
                <div className="font-mono text-xs text-table-text hover-text">ALL</div>
              </div>
              <div className="mb-2">
                <a href={hrefHtml('/blog')} className="text-box-title-bg transition-colors font-mono text-sm" onClick={(e) => e.stopPropagation()}>
                  VIEW_ALL_POSTS
                </a>
              </div>
              <div className="text-center">
                <a href={hrefHtml('/blog')} className="text-table-text transition-colors font-mono text-xs group-hover:text-primary-green" onClick={(e) => e.stopPropagation()}>
                  [BROWSE]
                </a>
              </div>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-box-outline">
            <div className="text-xs text-table-text font-mono">
              LATEST_POST: <span className="text-box-title-bg">{recentPosts[0]?.date || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
