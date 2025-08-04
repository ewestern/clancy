"use client";

import { motion } from "framer-motion";
import { Check, Star } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { pricingTiers } from "@/lib/data";

export function Pricing() {
  return (
    <section id="pricing" className="section-padding bg-white">
      <div className="section-container">
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-display font-bold text-slate-900 mb-4"
          >
            Simple, transparent pricing
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
            className="text-xl text-slate-600 max-w-2xl mx-auto"
          >
            Start free and scale as you grow. All plans include our core
            automation features and 24/7 support to help you succeed.
          </motion.p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 mb-16">
          {pricingTiers.map((tier, index) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div
                className={`
                  rounded-2xl p-8 h-full border-2 transition-all duration-300
                  ${
                    tier.isPopular
                      ? "border-primary-500 bg-primary-50 shadow-xl scale-105"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-lg"
                  }
                `}
              >
                {/* Popular badge */}
                {tier.isPopular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-primary-500 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center">
                      <Star className="w-4 h-4 mr-1 fill-current" />
                      Most Popular
                    </div>
                  </div>
                )}

                {/* Plan name and price */}
                <div className="text-center mb-8">
                  <h3 className="text-xl font-display font-semibold text-slate-900 mb-2">
                    {tier.name}
                  </h3>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-slate-900">
                      {tier.price}
                    </span>
                    {tier.price !== "Custom" && (
                      <span className="text-slate-600 text-lg">/month</span>
                    )}
                  </div>
                  <p className="text-slate-600">{tier.description}</p>
                </div>

                {/* Features */}
                <div className="space-y-4 mb-8">
                  {tier.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-start">
                      <div className="flex-shrink-0 w-5 h-5 bg-green-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                        <Check className="w-3 h-3 text-green-600" />
                      </div>
                      <span className="text-slate-700">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                <div className="mt-auto">
                  <Button
                    variant={tier.isPopular ? "primary" : "secondary"}
                    href={tier.ctaLink}
                    className="w-full justify-center"
                  >
                    {tier.ctaText}
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* FAQ Section */}
        {/*
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <h3 className="text-2xl font-display font-semibold text-slate-900 mb-8">
            Frequently asked questions
          </h3>
          
          <div className="grid md:grid-cols-2 gap-8 text-left max-w-4xl mx-auto">
                         <div>
               <h4 className="font-semibold text-slate-900 mb-2">
                 What counts as an &quot;action&quot;?
               </h4>
              <p className="text-slate-600">
                An action is any single operation your digital employee performs, like sending 
                an email, updating a spreadsheet, or creating a calendar event.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-slate-900 mb-2">
                Can I change plans at any time?
              </h4>
              <p className="text-slate-600">
                Yes! You can upgrade or downgrade your plan at any time. Changes will be 
                reflected in your next billing cycle.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-slate-900 mb-2">
                Do you offer custom integrations?
              </h4>
              <p className="text-slate-600">
                Professional and Enterprise plans include custom connectors. We can build 
                integrations for your specific tools and APIs.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-slate-900 mb-2">
                What kind of support do you provide?
              </h4>
              <p className="text-slate-600">
                All plans include email support. Professional plans get priority support, 
                and Enterprise customers get a dedicated success manager.
              </p>
            </div>
          </div>
          
          <div className="mt-12 p-8 bg-slate-50 rounded-2xl">
            <h3 className="text-xl font-semibold text-slate-900 mb-4">
              Still have questions?
            </h3>
            <p className="text-slate-600 mb-6">
              Our team is here to help you choose the right plan for your needs.
            </p>
            <Button variant="primary" href="/contact">
              Contact Sales
            </Button>
          </div>
        </motion.div>

          */}
      </div>
    </section>
  );
}
