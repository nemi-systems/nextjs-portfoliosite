// @ts-nocheck
import { getPostById, getAllPosts } from "@/lib/api";
// Using plain anchors to target static .html paths
import { hrefHtml } from "@/lib/links";
import SvgImageReactivity from "./SvgImageReactivity";
import MermaidRenderer from "./MermaidRenderer";
import PostAudioPlayer from "./PostAudioPlayer";

// Set the title of the page to be the post title, note that we no longer use
// e.g. next/head in app dir
 export async function generateMetadata(
   props: {
     params: Promise<{ id: string }>;
   }
 ) {
   const params = await props.params;

   const {
     id
   } = params;
   // Be tolerant of ".html" suffix in dev when accessed directly
   const cleanId = id.replace(/\.html$/, "");

   const { title } = await getPostById(cleanId);
   return {
     title,
   };
 }

// Generate the post, note that this is a "react server component"! it is allowed to be async
export default async function Post(
  props: {
    params: Promise<{ id: string }>;
  }
) {
  const params = await props.params;
  const { id } = params;
  const cleanId = id.replace(/\.html$/, "");
  const { html, title, date, audioNarration } = await getPostById(cleanId);

  return (
    <div className="bg-bg-main font-mono leading-relaxed antialiased selection:bg-primary-green selection:text-bg-main">
      <SvgImageReactivity />
      <MermaidRenderer />
      {audioNarration?.audioSrc ? (
        <PostAudioPlayer
          audioSrc={audioNarration.audioSrc}
          title={title}
          chunks={audioNarration.transcript?.chunks}
        />
      ) : null}
      <div className="mx-auto min-h-screen max-w-screen-xl px-0 py-6 md:px-8 md:py-12 lg:px-12 lg:py-6">
        <div className="mb-4">
          <div className="fused-terminal-layout max-w-xs !m-0">
            <div className="fused-panel-top w-full">
              <div className="terminal-header">
                <span className="terminal-header-text">NAVIGATION</span>
              </div>
              <div className="font-mono text-table-text p-4">
                <a href={hrefHtml('/blog')} className="inline-flex items-baseline font-medium leading-tight text-table-text hover:text-highlight-text">
                  &larr; All Posts
                </a>
              </div>
            </div>
          </div>
        </div>
        <main className="w-full lg:border lg:border-box-outline">
          <div className="bg-box-bg p-6 lg:p-0 space-y-0">
            <header className="px-0 py-4 md:px-4 border-b border-box-outline">
              <h1 className="text-2xl font-bold tracking-tight text-box-title-bg font-mono uppercase mb-2">{title}</h1>
              <p className="text-xs text-table-text font-mono uppercase tracking-wide">{date}</p>
            </header>
            <div 
              className="prose prose-lg max-w-none px-0 py-4 md:px-4"
              data-post-article=""
              dangerouslySetInnerHTML={{ __html: html }} 
            />
          </div>
        </main>
      </div>
    </div>
  );
}

// This function can statically allow nextjs to find all the posts that you have made, and statically generate them
export async function generateStaticParams() {
  const posts = await getAllPosts();

  return posts.map((post) => ({
    id: post.id,
  }));
}
