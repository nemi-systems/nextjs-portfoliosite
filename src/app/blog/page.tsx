// @ts-nocheck

// app/page.tsx
// Use anchor tags with .html targets for static export
import { hrefHtml } from "@/lib/links";
import { getAllPosts } from "@/lib/api";
import Image from 'next/image';
const colors = require('tailwindcss/colors');

const BlogItem = ({ id, date, title, coverImage }) => {
  const image = coverImage;
  const isVideoCover = typeof image === 'string' && /\.(webm|mp4|ogg)$/i.test(image);
  return(
    <li key={id} className="mb-3">
      <a href={hrefHtml(`/posts/${id}`)} className="group list-item-card block cursor-pointer">
        <div className="flex items-center justify-between p-3">
          <div className="flex-1">
            <div className="font-medium leading-tight font-mono">
              <div className="text-table-text text-xs mb-1 group-hover:text-box-title-bg transition-colors duration-200">{date}</div>
              <h3 className="text-box-title-bg group-hover:text-primary-green transition-colors text-sm">{title}</h3>
            </div>
          </div>
          {image && !isVideoCover && (
            <Image
              alt={title}
              width={100}
              height={50}
              className="border border-box-outline transition group-hover:border-highlight-text ml-4 flex-shrink-0"
              src={image}
              style={{ color: colors.transparent }}
            />
          )}
          {image && isVideoCover && (
            <video
              className="border border-box-outline transition group-hover:border-highlight-text ml-4 flex-shrink-0"
              width={100}
              height={50}
              src={image}
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              aria-label={title}
            />
          )}
        </div>
      </a>
    </li>
  )
}
export default async function Page() {
  const posts = await getAllPosts();

  return (
    <div className="bg-bg-main font-mono leading-relaxed antialiased selection:bg-primary-green selection:text-bg-main">
      <div className="mx-auto min-h-screen max-w-screen-xl px-4 py-6 md:px-8 md:py-12 lg:px-12 lg:py-6 lg:flex lg:justify-between lg:gap-6">
        <div className="lg:w-1/2 lg:py-8">
          <div className="fused-terminal-layout">
            <div className="fused-panel-top w-full">
              <div className="terminal-header">
                <span className="terminal-header-text">NAVIGATION</span>
              </div>
              <div className="font-mono text-table-text p-4">
                <a href={hrefHtml('/')} className="inline-flex items-baseline font-medium leading-tight text-table-text hover:text-highlight-text">
                  &larr; Back to home
                </a>
              </div>
            </div>
          </div>
        </div>
        <main className="pt-8 w-full lg:py-8">
          <div className="bg-box-bg p-0 space-y-0 lg:border lg:border-box-outline lg:mt-2">
            <section id="blog" className="mb-16 scroll-mt-16 md:mb-24 lg:mb-0 lg:scroll-mt-24">
              <div className="terminal-header">
                <span className="terminal-header-text">BLOG POSTS</span>
              </div>
              <ol className="group/list p-4">
                {posts.map((post) => {
                  const { id, date, title } = post;
                  return (
                    <BlogItem key={id} id={id} date={date} title={title} coverImage={post.coverImage}/>
                  );
                })}
              </ol>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
