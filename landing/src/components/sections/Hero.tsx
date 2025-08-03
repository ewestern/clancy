'use client';

import { motion } from 'framer-motion';
import { Play, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function Hero() {
  return (
    <section className="relative bg-gradient-to-br from-slate-50 to-white section-padding">
      <div className="section-container">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center lg:text-left"
          >
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-slate-900 leading-tight mb-6">
              <span className="text-balance">
                Autonomous employees for{' '}
                <span className="text-primary-500">every workflow</span>
              </span>
            </h1>
            
            <p className="text-xl text-slate-600 mb-8 max-w-2xl text-balance">
              Create digital employees with custom job descriptions who autonomously fulfill their roles. 
              You define what they do, they handle the execution across all your tools.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button 
                variant="primary" 
                size="lg" 
                href="/signup"
                className="group"
              >
                Get Early Access
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
              </Button>
              
              <Button 
                variant="secondary" 
                size="lg" 
                href="#demo"
                className="group"
              >
                <Play className="mr-2 w-5 h-5" />
                Watch Demo
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="mt-8 pt-8 border-t border-slate-200">
              <p className="text-sm text-slate-500 mb-4">Trusted by innovative teams at</p>
              <div className="flex items-center justify-center lg:justify-start space-x-6 opacity-60">
                <span className="text-slate-400 font-medium">TechFlow</span>
                <span className="text-slate-400 font-medium">EduTech</span>
                <span className="text-slate-400 font-medium">RetailPro</span>
                <span className="text-slate-400 font-medium">FinanceFlow</span>
              </div>
            </div>
          </motion.div>

          {/* Visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <div className="relative">
              {/* Main graph container */}
              <div className="bg-white rounded-2xl shadow-2xl p-8 border border-slate-100">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold text-slate-800">Digital Employee Network</h3>
                  <p className="text-sm text-slate-500">Orchestrating your workflow ecosystem</p>
                </div>
                
                {/* Simplified agent graph visualization */}
                <div className="relative h-64">
                  {/* Central hub */}
                  <motion.div
                    animate={{ y: [-5, 5, -5] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-primary-500 rounded-full flex items-center justify-center shadow-lg"
                  >
                    <span className="text-white font-bold text-lg">DE</span>
                  </motion.div>
                  
                  {/* Surrounding tools */}
                  {[
                    { name: 'Slack', pos: 'top-4 left-8', color: 'bg-purple-500', delay: 0 },
                    { name: 'Gmail', pos: 'top-4 right-8', color: 'bg-red-500', delay: 0.5 },
                    { name: 'QB', pos: 'bottom-4 left-8', color: 'bg-green-500', delay: 1 },
                    { name: 'Cal', pos: 'bottom-4 right-8', color: 'bg-blue-500', delay: 1.5 },
                    { name: 'CRM', pos: 'top-1/2 left-0 transform -translate-y-1/2', color: 'bg-orange-500', delay: 2 },
                    { name: 'Doc', pos: 'top-1/2 right-0 transform -translate-y-1/2', color: 'bg-indigo-500', delay: 2.5 },
                  ].map((tool) => (
                    <motion.div
                      key={tool.name}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: tool.delay, duration: 0.5 }}
                      className={`absolute ${tool.pos} w-12 h-12 ${tool.color} rounded-lg flex items-center justify-center shadow-md`}
                    >
                      <span className="text-white font-medium text-xs">{tool.name}</span>
                    </motion.div>
                  ))}
                  
                  {/* Connection lines */}
                  <svg className="absolute inset-0 w-full h-full" style={{ zIndex: -1 }}>
                    <defs>
                      <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.6" />
                        <stop offset="100%" stopColor="#4F46E5" stopOpacity="0.2" />
                      </linearGradient>
                    </defs>
                    {/* Lines connecting center to each tool */}
                    <motion.line 
                      x1="50%" y1="50%" x2="15%" y2="20%" 
                      stroke="url(#lineGradient)" strokeWidth="2"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ delay: 0.5, duration: 1 }}
                    />
                    <motion.line 
                      x1="50%" y1="50%" x2="85%" y2="20%" 
                      stroke="url(#lineGradient)" strokeWidth="2"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ delay: 1, duration: 1 }}
                    />
                    <motion.line 
                      x1="50%" y1="50%" x2="15%" y2="80%" 
                      stroke="url(#lineGradient)" strokeWidth="2"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ delay: 1.5, duration: 1 }}
                    />
                    <motion.line 
                      x1="50%" y1="50%" x2="85%" y2="80%" 
                      stroke="url(#lineGradient)" strokeWidth="2"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ delay: 2, duration: 1 }}
                    />
                    <motion.line 
                      x1="50%" y1="50%" x2="5%" y2="50%" 
                      stroke="url(#lineGradient)" strokeWidth="2"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ delay: 2.5, duration: 1 }}
                    />
                    <motion.line 
                      x1="50%" y1="50%" x2="95%" y2="50%" 
                      stroke="url(#lineGradient)" strokeWidth="2"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ delay: 3, duration: 1 }}
                    />
                  </svg>
                </div>
              </div>
              
              {/* Floating cards */}
              {/*
              <motion.div
                animate={{ y: [-10, 10, -10] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute -top-4 -right-4 bg-white rounded-lg shadow-lg p-3 border border-green-200"
              >
                <div className="text-green-600 text-sm font-medium">✓ Process Complete</div>
              </motion.div>
              
              <motion.div
                animate={{ y: [10, -10, 10] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                className="absolute -bottom-4 -left-4 bg-white rounded-lg shadow-lg p-3 border border-blue-200"
              >
                <div className="text-blue-600 text-sm font-medium">🚀 Scaling Up</div>
              </motion.div>
              */}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
} 