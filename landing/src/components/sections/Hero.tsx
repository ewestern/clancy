"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Image from "next/image";
import slack from "../../assets/logos/slack.svg";
import quickbooks from "../../assets/logos/quickbooks.svg";
import googleCalendar from "../../assets/logos/google-calendar.svg";
import microsoftTeams from "../../assets/logos/microsoft-teams.svg";
import gmailLogo from "../../assets/logos/gmail.svg";
// Additional logos for diverse toolsets
import shopify from "../../assets/logos/shopify.svg";
import zoom from "../../assets/logos/zoom.svg";
import salesforce from "../../assets/logos/salesforce.svg";
import { useState, useEffect } from "react";

interface Tool {
  name: string;
  logo: string;
}

interface AIEmployee {
  jobDescription: string;
  trigger: string;
  tools: Tool[];
}

export function Hero() {
  const aiEmployees: AIEmployee[] = [
    {
      jobDescription:
        "Monitor inventory levels and adjust pricing across all sales channels",
      trigger: "When stock levels change or competitor pricing updates",
      tools: [
        { name: "Shopify", logo: shopify },
        { name: "QuickBooks", logo: quickbooks },
        { name: "Slack", logo: slack },
      ],
    },
    {
      jobDescription: "Schedule meetings and keep team calendars conflict-free",
      trigger: "When new meeting requests arrive or conflicts are detected",
      tools: [
        { name: "Google Calendar", logo: googleCalendar },
        { name: "Microsoft Teams", logo: microsoftTeams },
        { name: "Zoom", logo: zoom },
        { name: "Slack", logo: slack },
      ],
    },
    {
      jobDescription:
        "Follow up on overdue invoices and send payment reminders",
      trigger: "Daily at 8 AM and whenever an invoice becomes overdue",
      tools: [
        { name: "QuickBooks", logo: quickbooks },
        { name: "Salesforce", logo: salesforce },
        { name: "Gmail", logo: gmailLogo },
        { name: "Slack", logo: slack },
      ],
    },
  ];

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % aiEmployees.length);
    }, 10000); // Change every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const aiEmployee = aiEmployees[currentIndex];

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
                Autonomous employees for{" "}
                <span className="text-primary-500">every workflow</span>
              </span>
            </h1>

            <p className="text-xl text-slate-600 mb-8 max-w-2xl text-balance">
              Create AI employees with custom job descriptions who autonomously
              fulfill their roles. You define what they do, they handle the
              execution across all your tools.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button
                variant="primary"
                size="lg"
                href="http://localhost:5173/signup"
                className="group"
              >
                Get Early Access
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
              </Button>
            </div>
          </motion.div>

          {/* Visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <div className="bg-white rounded-2xl shadow-2xl p-8 border border-slate-100">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-slate-800">
                  AI Employee in Action
                </h3>
                <p className="text-sm text-slate-500">
                  See how they work autonomously
                </p>
              </div>

              {/* Job Description */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="text-center mb-6"
              >
                <div className="inline-flex items-center bg-slate-100 rounded-full px-6 py-3 mb-4">
                  <span className="text-slate-700 font-medium">
                    &quot;{aiEmployee.jobDescription}&quot;
                  </span>
                </div>
                <motion.div
                  animate={{ y: [0, 10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <ArrowRight className="w-6 h-6 text-slate-400 mx-auto rotate-90" />
                </motion.div>
              </motion.div>

              {/* Trigger */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="text-center mb-6"
              >
                <div className="inline-flex items-center bg-amber-50 border border-amber-200 rounded-full px-4 py-2 mb-4">
                  <div className="w-2 h-2 bg-amber-500 rounded-full mr-3 animate-pulse"></div>
                  <span className="text-amber-700 text-sm font-medium">
                    {aiEmployee.trigger}
                  </span>
                </div>
                <motion.div
                  animate={{ y: [0, 10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                >
                  <ArrowRight className="w-6 h-6 text-slate-400 mx-auto rotate-90" />
                </motion.div>
              </motion.div>

              {/* AI Employee Avatar */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="text-center mb-8"
              >
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg border-2 border-primary-500">
                  <Image
                    src={"/favicon.svg"}
                    alt="Clancy Logo"
                    width={40}
                    height={40}
                    className="w-10 h-10"
                  />
                </div>

                <motion.div
                  animate={{ y: [0, 10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                >
                  <ArrowRight className="w-6 h-6 text-slate-400 mx-auto rotate-90 mt-4" />
                </motion.div>
              </motion.div>

              {/* Tools Grid */}
              <div
                className="grid gap-3 mb-8"
                style={{
                  gridTemplateColumns: `repeat(${aiEmployee.tools.length}, minmax(0, 1fr))`,
                }}
              >
                {aiEmployee.tools.map((tool, index) => (
                  <motion.div
                    key={tool.name}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.7 + index * 0.1, duration: 0.4 }}
                    className="text-center group"
                  >
                    <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform duration-200 border border-slate-200">
                      <Image
                        src={tool.logo}
                        alt={`${tool.name} logo`}
                        width={20}
                        height={20}
                        className="w-5 h-5"
                        onError={(e) => {
                          // Fallback to a placeholder if logo fails to load
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                          target.parentElement!.innerHTML += `<div class="w-5 h-5 bg-slate-400 rounded opacity-50"></div>`;
                        }}
                      />
                    </div>
                    <span className="text-xs text-slate-600 font-medium">
                      {tool.name}
                    </span>
                  </motion.div>
                ))}
              </div>

              {/* Success Indicator */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 1.5, duration: 0.5 }}
                className="text-center pt-6 border-t border-slate-200"
              >
                <div className="inline-flex items-center bg-green-50 text-green-700 rounded-full px-4 py-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3 animate-pulse"></div>
                  <span className="text-sm font-medium">
                    All systems updated successfully
                  </span>
                </div>
              </motion.div>
            </div>

            {/* Floating benefits */}
            <motion.div
              animate={{ x: [-5, 5, -5] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-4 -left-4 bg-white rounded-lg shadow-lg p-3 border border-accent-200"
            >
              <div className="text-accent-600 text-sm font-medium">
                ⚡ Always On
              </div>
            </motion.div>

            <motion.div
              animate={{ x: [5, -5, 5] }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 2,
              }}
              className="absolute -bottom-4 -right-4 bg-white rounded-lg shadow-lg p-3 border border-primary-200"
            >
              <div className="text-primary-600 text-sm font-medium">
                🎯 Full Control
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
