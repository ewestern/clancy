'use client';

import { motion } from 'framer-motion';
import { ArrowRight, MessageSquare, CreditCard, Calendar, FileText, Users, Database } from 'lucide-react';

export function ValueDeepDive() {
  const tools = [
    { name: 'Slack', icon: MessageSquare, color: 'text-purple-600', bgColor: 'bg-purple-100' },
    { name: 'QuickBooks', icon: CreditCard, color: 'text-green-600', bgColor: 'bg-green-100' },
    { name: 'Calendar', icon: Calendar, color: 'text-blue-600', bgColor: 'bg-blue-100' },
    { name: 'Docs', icon: FileText, color: 'text-orange-600', bgColor: 'bg-orange-100' },
    { name: 'CRM', icon: Users, color: 'text-red-600', bgColor: 'bg-red-100' },
    { name: 'Database', icon: Database, color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
  ];

  return (
    <section className="section-padding bg-slate-50">
      <div className="section-container">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-display font-bold text-slate-900 mb-6">
              Define their role. They handle the rest.
            </h2>
            
            <p className="text-xl text-slate-600 mb-8">
              Your digital employees are created with specific job descriptions and autonomously fulfill those responsibilities. 
              You stay in complete control of what they can do, while they handle the complex coordination across all your tools.
            </p>

            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-white font-bold text-sm">1</span>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">Create Custom Job Descriptions</h3>
                  <p className="text-slate-600">
                    Define exactly what your digital employee should do: &quot;Monitor inventory and update pricing across all channels&quot; or 
                    &quot;Handle complete customer onboarding workflows.&quot;
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-white font-bold text-sm">2</span>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">Autonomous Execution</h3>
                  <p className="text-slate-600">
                    Your digital employee proactively fulfills their role, coordinating across multiple systems 
                    and handling complex workflows without waiting for instructions.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-white font-bold text-sm">3</span>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">You Stay in Control</h3>
                  <p className="text-slate-600">
                    Set boundaries, approve key decisions, and monitor everything. Your digital employees work within 
                    the permissions you define, with full transparency into their actions.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Orchestration Diagram */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
              {/* Customer Request */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                viewport={{ once: true }}
                className="text-center mb-8"
              >
                <div className="inline-flex items-center bg-slate-100 rounded-full px-6 py-3 mb-4">
                  <span className="text-slate-700 font-medium">
                    &quot;Monitor inventory and adjust pricing&quot;
                  </span>
                </div>
                <motion.div
                  animate={{ y: [0, 10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <ArrowRight className="w-6 h-6 text-slate-400 mx-auto rotate-90" />
                </motion.div>
              </motion.div>

              {/* Digital Employee */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                viewport={{ once: true }}
                className="text-center mb-8"
              >
                <div className="w-20 h-20 bg-primary-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <span className="text-white font-bold text-lg">DE</span>
                </div>
                <h4 className="font-semibold text-slate-900 mb-2">Digital Employee</h4>
                <p className="text-sm text-slate-600">Fulfilling Job Description</p>
                
                <motion.div
                  animate={{ y: [0, 10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                >
                  <ArrowRight className="w-6 h-6 text-slate-400 mx-auto rotate-90 mt-4" />
                </motion.div>
              </motion.div>

              {/* Tools Grid */}
              <div className="grid grid-cols-3 gap-4">
                {tools.map((tool, index) => {
                  const Icon = tool.icon;
                  return (
                    <motion.div
                      key={tool.name}
                      initial={{ scale: 0, opacity: 0 }}
                      whileInView={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.7 + index * 0.1, duration: 0.4 }}
                      viewport={{ once: true }}
                      className="text-center group"
                    >
                      <div className={`w-12 h-12 ${tool.bgColor} rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform duration-200`}>
                        <Icon className={`w-6 h-6 ${tool.color}`} />
                      </div>
                      <span className="text-xs text-slate-600 font-medium">{tool.name}</span>
                    </motion.div>
                  );
                })}
              </div>

              {/* Success Indicator */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                transition={{ delay: 1.5, duration: 0.5 }}
                viewport={{ once: true }}
                className="text-center mt-8 pt-6 border-t border-slate-200"
              >
                <div className="inline-flex items-center bg-green-50 text-green-700 rounded-full px-4 py-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3 animate-pulse"></div>
                  <span className="text-sm font-medium">All systems updated successfully</span>
                </div>
              </motion.div>
            </div>

            {/* Floating benefits */}
            <motion.div
              animate={{ x: [-5, 5, -5] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-4 -left-4 bg-white rounded-lg shadow-lg p-3 border border-accent-200"
            >
              <div className="text-accent-600 text-sm font-medium">⚡ Always On</div>
            </motion.div>

            <motion.div
              animate={{ x: [5, -5, 5] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 2 }}
              className="absolute -bottom-4 -right-4 bg-white rounded-lg shadow-lg p-3 border border-primary-200"
            >
              <div className="text-primary-600 text-sm font-medium">🎯 Full Control</div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
} 