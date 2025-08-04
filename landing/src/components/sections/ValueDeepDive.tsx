"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import slack from "../../assets/logos/slack.svg";
import quickbooks from "../../assets/logos/quickbooks.svg";
import googleCalendar from "../../assets/logos/google-calendar.svg";
import googleDrive from "../../assets/logos/google-drive.svg";
import hubspot from "../../assets/logos/hubspot.svg";

// Import logos (these will need to be downloaded to the logos directory)
// For now, we'll use placeholder imports that can be replaced when actual logos are available
//const LogoImports = {
//  slack: '/src/assets/logos/slack.svg',
//  quickbooks: '/src/assets/logos/quickbooks.svg',
//  calendar: '/src/assets/logos/google-calendar.svg',
//  docs: '/src/assets/logos/google-docs.svg',
//  crm: '/src/assets/logos/hubspot.svg',
//  database: '/src/assets/logos/database.svg',
//};

interface Tool {
  name: string;
  logo: string;
  //color: string;
  //bgColor: string;
}

interface AIEmployee {
  jobDescription: string;
  trigger: string;
  tools: Tool[];
}

export function ValueDeepDive() {
  //const aiEmployee: AIEmployee = {
  //  jobDescription: "Monitor inventory and adjust pricing across all channels",
  //  trigger: "When inventory levels change or competitor pricing updates",
  //  tools: [
  //    {
  //      name: 'Slack',
  //      logo: slack,
  //    },
  //    {
  //      name: 'QuickBooks',
  //      logo: quickbooks,
  //    },
  //    {
  //      name: 'Calendar',
  //      logo: googleCalendar,
  //      //color: 'text-blue-600',
  //      //bgColor: 'bg-blue-100'
  //    },
  //    {
  //      name: 'Google Drive',
  //      logo: googleDrive,
  //      //color: 'text-orange-600',
  //      //bgColor: 'bg-orange-100'
  //    },
  //    {
  //      name: 'Hubspot',
  //      logo: hubspot,
  //      //color: 'text-red-600',
  //      //bgColor: 'bg-red-100'
  //    },
  //  ]
  //};

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
              Your digital employees are created with specific job descriptions
              and autonomously fulfill those responsibilities. You stay in
              complete control of what they can do, while they handle the
              complex coordination across all your tools.
            </p>

            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-white font-bold text-sm">1</span>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">
                    Create Custom Job Descriptions
                  </h3>
                  <p className="text-slate-600">
                    Define exactly what your digital employee should do:
                    &quot;Monitor inventory and update pricing across all
                    channels&quot; or &quot;Handle complete customer onboarding
                    workflows.&quot;
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-white font-bold text-sm">2</span>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">
                    Autonomous Execution
                  </h3>
                  <p className="text-slate-600">
                    Your digital employee proactively fulfills their role,
                    coordinating across multiple systems and handling complex
                    workflows without waiting for instructions.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-white font-bold text-sm">3</span>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">
                    You Stay in Control
                  </h3>
                  <p className="text-slate-600">
                    Set boundaries, approve key decisions, and monitor
                    everything. Your digital employees work within the
                    permissions you define, with full transparency into their
                    actions.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Activity Feed */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
              {/* Header */}
              {/*
              <div className="text-center mb-6">
                <div className="inline-flex items-center bg-primary-50 border border-primary-200 rounded-full px-4 py-2 mb-3">
                  <Image 
                    src={'/favicon.svg'} 
                    alt="Clancy Logo" 
                    width={20}
                    height={20}
                    className="w-5 h-5 mr-2"
                  />
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                  <span className="text-primary-700 text-sm font-medium">Live Activity Feed</span>
                </div>
                <p className="text-xs text-slate-500">Real-time autonomous actions</p>
              </div>
              */}

              {/* Activity Feed */}
              <div className="space-y-4 h-128 overflow-hidden">
                {/* Activity Items */}
                {[
                  {
                    id: 1,
                    time: "2 min ago",
                    action: "Inventory levels dropped on Shopify",
                    result: "Updated prices in QuickBooks",
                    tools: [quickbooks, slack],
                    delay: 0,
                  },
                  {
                    id: 2,
                    time: "5 min ago",
                    action: "New lead captured in HubSpot",
                    result: "Sent welcome email via Gmail",
                    tools: [hubspot, googleDrive],
                    delay: 2,
                  },
                  {
                    id: 3,
                    time: "8 min ago",
                    action: "Calendar meeting completed",
                    result: "Updated project status in Slack",
                    tools: [googleCalendar, slack],
                    delay: 4,
                  },
                  {
                    id: 4,
                    time: "12 min ago",
                    action: "Customer support ticket received",
                    result: "Created follow-up task in HubSpot",
                    tools: [slack, hubspot],
                    delay: 6,
                  },
                  {
                    id: 5,
                    time: "15 min ago",
                    action: "Monthly report generated",
                    result: "Shared with team via Google Drive",
                    tools: [quickbooks, googleDrive],
                    delay: 8,
                  },
                ].map((activity, index) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: activity.delay,
                      duration: 0.6,
                      repeat: Infinity,
                      repeatDelay: 10,
                    }}
                    className="border border-slate-200 rounded-lg p-4 bg-slate-50"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xs text-slate-500 font-medium">
                        {activity.time}
                      </span>
                      <div className="flex space-x-1">
                        {activity.tools.map((tool, toolIndex) => (
                          <div
                            key={toolIndex}
                            className="w-4 h-4 bg-white rounded border border-slate-200 flex items-center justify-center"
                          >
                            <Image
                              src={tool}
                              alt="Tool logo"
                              width={10}
                              height={10}
                              className="w-2.5 h-2.5"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="text-sm">
                      <div className="text-slate-600 mb-1">
                        <span className="font-medium text-slate-800">
                          Trigger:
                        </span>{" "}
                        {activity.action}
                      </div>
                      <div className="text-slate-600">
                        <span className="font-medium text-green-700">
                          Action:
                        </span>{" "}
                        {activity.result}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Status Bar */}
              {/*
              <div className="mt-6 pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                    <span className="text-sm text-slate-600">5 workflows completed in last 15 min</span>
                  </div>
                </div>
              </div>
              */}
            </div>

            {/* Floating indicators */}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
