const projectsConfig = {
  title: "Projects",
  items: [
    {
      title: "Personal Portfolio Website",
      summary:
        "A static portfolio website built with Next.js 15, featuring interactive project cards with GitHub stars, a markdown-powered blog system, and optimized for AWS CloudFront Deployment",
      image: null,
      url: "https://n3mi.net",
      github: "nemi-systems/nextjs-portfoliosite",
      githubUrl: "https://github.com/nemi-systems/nextjs-portfoliosite",
    },
    {
      title: "GravityLens",
      summary:
        "Realtime gravitational lensing experiment built with Rust, WebAssembly, and GPU rendering.",
      image: "/assets/black-hole-laboratory.webp",
      url: "https://gravitylens.n3mi.net",
      github: null,
      githubUrl: null,
    },
    {
      title: "Ontology",
      summary:
        "LLM-driven ontology extraction from markdown with interactive knowledge graph exploration.",
      image: "/assets/ontology-viewer-project-square.webp",
      url: "https://ontology.n3mi.net",
      github: null,
      githubUrl: null,
    },
    {
      title: "Web Audio Synthesizer",
      summary:
        "Browser synth with ADSR envelopes, filters, fx, unison, keyboard input, and live scopes.",
      image: "/assets/web_audio_synth.webp",
      url: "https://synth.n3mi.net",
      github: "nemi-systems/nextjs-portfoliosite",
      githubUrl: "https://github.com/nemi-systems/nextjs-portfoliosite/tree/main/projects/synth",
    },
  ],
} as const;

export default projectsConfig;
