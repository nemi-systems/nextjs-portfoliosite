// @ts-nocheck
'use client'
import { React, useState, useEffect, useRef } from 'react'

const SideBarItem = ({ text = '', link='', code='' }) => {
    return (
      <li className="mb-1">
        <a href={link}>
          <div className="group flex items-center py-2 border border-box-outline bg-box-bg hover:bg-highlight-bg transition-colors">
            <span className="nav-indicator mr-3 h-px w-6 bg-table-text transition-all group-hover:w-12 group-hover:bg-highlight-text"/>
            <span className="text-table-text text-xs mr-2 font-mono group-hover:text-highlight-text">[{code}]</span>
            <span className="nav-text text-table-text text-xs font-mono uppercase tracking-wider group-hover:text-highlight-text">{text}</span>
          </div>
        </a>
      </li>
    );
  };

export const SideBar = () => {
    return (
      <nav className="fused-panel-bottom w-full">
        <div className="terminal-header">
          <span className="terminal-header-text">NAVIGATION</span>
        </div>
        <ul className="p-4 pt-2">
          <SideBarItem text="ABOUT" link="#about" code="01" />
          <SideBarItem text="PROJECTS" link="#projects" code="02" />
          <SideBarItem text="BLOG" link="#blog" code="03" />
        </ul>
      </nav>
    );
  };
