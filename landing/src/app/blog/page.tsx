import Link from 'next/link';
import { ArrowRight, Calendar, User } from 'lucide-react';
import { Header } from '@/components/sections/Header';
import { Footer } from '@/components/sections/Footer';
import { getAllPosts } from '@/lib/blog';

export default async function BlogPage() {
  const posts = await getAllPosts();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      'Announcement': 'bg-blue-100 text-blue-700',
      'Technology': 'bg-purple-100 text-purple-700',
      'Security': 'bg-green-100 text-green-700',
      'Product': 'bg-orange-100 text-orange-700',
    };
    return colors[category as keyof typeof colors] || 'bg-slate-100 text-slate-700';
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <main className="section-padding">
        <div className="section-container">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-display font-bold text-slate-900 mb-6">
              Blog
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Insights on digital employees, automation, and the future of work from the team at Clancy AI.
            </p>
          </div>

          {/* Blog posts grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post, index) => (
              <article
                key={post.slug}
                className="group animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <Link href={`/blog/${post.slug}`}>
                  <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden h-full hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                    {/* Thumbnail placeholder */}
                    <div className="h-48 bg-gradient-to-br from-primary-400 to-primary-600 relative overflow-hidden">
                      <div className="absolute inset-0 bg-black bg-opacity-20"></div>
                      <div className="absolute bottom-4 left-4">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(post.category)}`}>
                          {post.category}
                        </span>
                      </div>
                    </div>

                    <div className="p-6">
                      <h2 className="text-xl font-display font-semibold text-slate-900 mb-3 group-hover:text-primary-600 transition-colors duration-200 line-clamp-2">
                        {post.title}
                      </h2>
                      
                      <p className="text-slate-600 mb-4 line-clamp-3">
                        {post.excerpt}
                      </p>

                      <div className="flex items-center justify-between text-sm text-slate-500">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center">
                            <User className="w-4 h-4 mr-1" />
                            <span>{post.author.name}</span>
                          </div>
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            <span>{formatDate(post.publishedAt)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <div className="flex items-center text-primary-600 font-medium group-hover:text-primary-700 transition-colors duration-200">
                          <span>Read more</span>
                          <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform duration-200" />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </article>
            ))}
          </div>

          {/* Empty state */}
          {posts.length === 0 && (
            <div className="text-center py-16">
              <p className="text-slate-600 text-lg">No blog posts available yet.</p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
} 