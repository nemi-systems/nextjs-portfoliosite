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
      title: "Web Audio Synthesizer",
      summary:
        "Browser synth with ADSR envelopes, filters, fx, unison, keyboard input, and live scopes.",
      image: "/assets/web_audio_synth.webp",
      url: "/synth",
      github: "nemi-systems/nextjs-portfoliosite",
      githubUrl: "https://github.com/nemi-systems/nextjs-portfoliosite/blob/main/docs/synthesizer.md",
    },
  ],
} as const;

export default projectsConfig;
