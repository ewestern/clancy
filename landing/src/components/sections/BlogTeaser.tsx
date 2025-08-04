"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Calendar, User } from "lucide-react";
import { BlogPost } from "@/types";

interface BlogTeaserProps {
  posts: BlogPost[];
}

export function BlogTeaser({ posts }: BlogTeaserProps) {
  if (!posts.length) {
    return null;
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
    <section className="section-padding bg-slate-50">
      <div className="section-container">
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-display font-bold text-slate-900 mb-4"
          >
            Latest from our blog
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
            className="text-xl text-slate-600 max-w-2xl mx-auto"
          >
            Stay updated with the latest insights on digital employees,
            automation, and the future of work.
          </motion.p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {posts.map((post, index) => (
            <motion.article
              key={post.slug}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="group"
            >
              <Link href={`/blog/${post.slug}`}>
                <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden h-full hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                  {/* Thumbnail placeholder */}
                  <div className="h-48 bg-gradient-to-br from-primary-400 to-primary-600 relative overflow-hidden">
                    <div className="absolute inset-0 bg-black bg-opacity-20"></div>
                    <div className="absolute bottom-4 left-4">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(post.category)}`}
                      >
                        {post.category}
                      </span>
                    </div>
                  </div>

                  <div className="p-6">
                    <h3 className="text-xl font-display font-semibold text-slate-900 mb-3 group-hover:text-primary-600 transition-colors duration-200 line-clamp-2">
                      {post.title}
                    </h3>

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
            </motion.article>
          ))}
        </div>

        {/* View all blog posts link */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <Link
            href="/blog"
            className="inline-flex items-center px-6 py-3 bg-white border border-slate-300 hover:border-primary-300 text-slate-700 hover:text-primary-600 font-medium rounded-lg transition-all duration-200 hover:shadow-md"
          >
            View all posts
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
