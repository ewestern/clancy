import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, User } from "lucide-react";
import { Header } from "@/components/sections/Header";
import { Footer } from "@/components/sections/Footer";
import { getPostBySlug, getAllPostSlugs } from "@/lib/blog";

interface BlogPostPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams() {
  const slugs = getAllPostSlugs();
  return slugs.map((slug) => ({
    slug,
  }));
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      Announcement: "bg-blue-100 text-blue-700",
      Technology: "bg-purple-100 text-purple-700",
      Security: "bg-green-100 text-green-700",
      Product: "bg-orange-100 text-orange-700",
    };
    return (
      colors[category as keyof typeof colors] || "bg-slate-100 text-slate-700"
    );
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="section-padding">
        <div className="section-container max-w-4xl">
          {/* Back to blog */}
          <div className="mb-8">
            <Link
              href="/blog"
              className="inline-flex items-center text-slate-600 hover:text-primary-600 transition-colors duration-200"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to blog
            </Link>
          </div>

          {/* Article header */}
          <header className="mb-12">
            <div className="mb-4">
              <span
                className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor(post.category)}`}
              >
                {post.category}
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl font-display font-bold text-slate-900 mb-6 leading-tight">
              {post.title}
            </h1>

            <p className="text-xl text-slate-600 mb-8">{post.excerpt}</p>

            <div className="flex items-center space-x-6 text-slate-500 border-b border-slate-200 pb-8">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center mr-3">
                  <span className="text-slate-600 font-semibold text-sm">
                    {post.author.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </span>
                </div>
                <div>
                  <div className="flex items-center text-slate-900 font-medium">
                    <User className="w-4 h-4 mr-1" />
                    {post.author.name}
                  </div>
                  {post.author.bio && (
                    <div className="text-sm text-slate-500">
                      {post.author.bio}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center text-slate-500">
                <Calendar className="w-4 h-4 mr-2" />
                <span>{formatDate(post.publishedAt)}</span>
              </div>
            </div>
          </header>

          {/* Article content */}
          <article
            className="prose-enhanced"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* Article footer */}
          <footer className="mt-12 pt-8 border-t border-slate-200">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-slate-900 mb-4">
                Ready to try Clancy?
              </h3>
              <p className="text-slate-600 mb-6">
                Join hundreds of teams automating their workflows with digital
                employees.
              </p>
              <Link
                href="http://localhost:5173/signup"
                className="inline-flex items-center px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors duration-200"
              >
                Get Early Access
              </Link>
            </div>
          </footer>
        </div>
      </main>

      <Footer />
    </div>
  );
}
