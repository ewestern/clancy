"use client";

import { motion } from "framer-motion";
//import { useState } from 'react';
import { ChevronLeft, ChevronRight } from "lucide-react";
import { integrations } from "@/lib/data";
import Image from "next/image";

export function Integrations() {
  const scrollCarousel = (direction: "left" | "right") => {
    const carousel = document.getElementById(`carousel-all`);
    if (carousel) {
      const scrollAmount = 240; // Width of 2 cards plus gap
      carousel.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <section id="integrations" className="section-padding bg-white">
      <div className="section-container">
        <div className="text-center mb-12">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-display font-bold text-slate-900 mb-4"
          >
            Works with tools you already love
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
            className="text-xl text-slate-600 max-w-2xl mx-auto"
          >
            Connect seamlessly with your existing tech stack. No
            rip-and-replace, just instant integration with the tools your team
            already uses every day.
          </motion.p>
        </div>

        {/* Integrations Carousel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
          className="relative"
        >
          <div className="flex items-center">
            {/* Left scroll button */}
            <button
              onClick={() => scrollCarousel("left")}
              className="hidden md:flex items-center justify-center w-10 h-10 bg-white border border-slate-200 rounded-full shadow-md hover:shadow-lg transition-all duration-200 z-10 mr-4"
            >
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>

            {/* Carousel container */}
            <div className="flex-1 overflow-hidden">
              <div
                id="carousel-all"
                className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-2"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {integrations.map((integration, index) => (
                  <motion.div
                    key={integration.name}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="flex-shrink-0 w-28 group"
                  >
                    <div className="bg-white border border-slate-200 rounded-xl p-4 text-center hover:border-primary-300 hover:shadow-lg transition-all duration-300 group-hover:scale-105">
                      {/* Actual logo */}
                      <div className="w-10 h-10 mx-auto mb-2 flex items-center justify-center">
                        <Image
                          src={integration.logo}
                          alt={`${integration.name} logo`}
                          width={40}
                          height={40}
                          className="w-full h-full object-contain"
                        />
                      </div>

                      <h4 className="font-medium text-slate-900 text-xs leading-tight">
                        {integration.name}
                      </h4>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Right scroll button */}
            <button
              onClick={() => scrollCarousel("right")}
              className="hidden md:flex items-center justify-center w-10 h-10 bg-white border border-slate-200 rounded-full shadow-md hover:shadow-lg transition-all duration-200 z-10 ml-4"
            >
              <ChevronRight className="w-5 h-5 text-slate-600" />
            </button>
          </div>

          {/* Mobile scroll hint */}
          <div className="md:hidden text-center mt-2">
            <span className="text-xs text-slate-400">
              ← Scroll to see more →
            </span>
          </div>
        </motion.div>

        {/* Call to action - more compact */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
          className="text-center mt-8"
        >
          <div className="bg-slate-50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Don&apos;t see your tool?
            </h3>
            <p className="text-slate-600 text-sm mb-4">
              We&apos;re constantly adding new integrations.
            </p>
            <button className="inline-flex items-center px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors duration-200 text-sm">
              Request Integration
            </button>
          </div>
        </motion.div>
      </div>

      {/* CSS to hide scrollbars */}
      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  );
}
