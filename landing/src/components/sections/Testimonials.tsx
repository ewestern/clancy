"use client";

import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";
import { testimonials } from "@/lib/data";

export function Testimonials() {
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
            Loved by teams everywhere
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
            className="text-xl text-slate-600 max-w-2xl mx-auto"
          >
            See how organizations are transforming their workflows with
            Clancy&apos;s digital employees.
          </motion.p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mb-16">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-100 h-full">
                {/* Quote icon */}
                <div className="flex items-center mb-6">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center mr-4">
                    <Quote className="w-5 h-5 text-primary-600" />
                  </div>
                  <div className="flex space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className="w-4 h-4 fill-current text-yellow-400"
                      />
                    ))}
                  </div>
                </div>

                {/* Quote */}
                <blockquote className="text-lg text-slate-700 mb-8 leading-relaxed">
                  &quot;{testimonial.quote}&quot;
                </blockquote>

                {/* Author */}
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center mr-4">
                    <span className="text-slate-600 font-semibold text-sm">
                      {testimonial.author.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </span>
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">
                      {testimonial.author.name}
                    </div>
                    <div className="text-sm text-slate-600">
                      {testimonial.author.title} at {testimonial.author.company}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Social proof metrics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <div className="text-3xl font-bold text-slate-900 mb-2">
                4.9/5
              </div>
              <div className="text-slate-600 text-sm">Customer Rating</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-slate-900 mb-2">500+</div>
              <div className="text-slate-600 text-sm">Happy Customers</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-slate-900 mb-2">10M+</div>
              <div className="text-slate-600 text-sm">Tasks Automated</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-slate-900 mb-2">75%</div>
              <div className="text-slate-600 text-sm">Time Saved</div>
            </div>
          </div>
        </motion.div>

        {/* Additional testimonial callout */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          viewport={{ once: true }}
          className="mt-16"
        >
          <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-8 text-center text-white">
            <Quote className="w-8 h-8 mx-auto mb-4 opacity-80" />
            <blockquote className="text-xl md:text-2xl font-medium mb-6 leading-relaxed">
              &quot;Clancy didn&apos;t just automate our workflows—it gave us
              our time back. Our team can now focus on strategy instead of
              manual tasks.&quot;
            </blockquote>
            <div className="font-semibold">
              Alex Thompson, CEO at InnovateNow
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
