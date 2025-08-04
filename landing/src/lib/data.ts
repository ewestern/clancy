import { Bot, Zap, Brain, Users, Shield, Rocket } from "lucide-react";
import {
  Feature,
  Integration,
  Testimonial,
  PricingTier,
  NavItem,
} from "@/types";
import slack from "../assets/logos/slack.svg";
import discord from "../assets/logos/discord.svg";
import microsoft365 from "../assets/logos/microsoft-365.svg";
import notion from "../assets/logos/notion.svg";
import shopify from "../assets/logos/shopify.svg";
import salesforce from "../assets/logos/salesforce.svg";
import googleDrive from "../assets/logos/google-drive.svg";
import hubspot from "../assets/logos/hubspot.svg";
import quickbooks from "../assets/logos/quickbooks.svg";
import microsoftTeams from "../assets/logos/microsoft-teams.svg";

export const navItems: NavItem[] = [
  { label: "Features", href: "#features" },
  { label: "Integrations", href: "#integrations" },
  { label: "Pricing", href: "#pricing" },
  { label: "Blog", href: "/blog" },
  { label: "Docs", href: "/docs" },
];

export const features: Feature[] = [
  {
    icon: Bot,
    title: "Created with Custom Job Descriptions",
    description:
      "Define exactly what each digital employee should do. They autonomously fulfill their role, handling complex workflows without constant supervision.",
  },
  {
    icon: Zap,
    title: "Works with Tools You Already Love",
    description:
      "Out-of-the-box connectors for Slack, Google Workspace, QuickBooks, Canvas, and dozens more mean zero rip-and-replace.",
  },
  {
    icon: Brain,
    title: "You Define the Boundaries",
    description:
      "Stay in complete control with granular permissions, approval workflows, and full transparency into every action your digital employees take.",
  },
];

export const additionalFeatures: Feature[] = [
  {
    icon: Shield,
    title: "Enterprise-Grade Security",
    description:
      "SSO with Auth0, granular permissions, and no raw credential exposure keep IT and security teams happy.",
  },
  {
    icon: Users,
    title: "Scales Effortlessly",
    description:
      "Whether you're automating one workflow or thousands, Clancy grows with you—no extra setup required.",
  },
  {
    icon: Rocket,
    title: "Fast Time-to-Value",
    description:
      "Deploy your first digital employee in minutes and start saving hours of manual effort from day one.",
  },
];

export const integrations: Integration[] = [
  // Communication
  { name: "Slack", logo: slack, category: "communication" },
  { name: "Microsoft Teams", logo: microsoftTeams, category: "communication" },
  { name: "Discord", logo: discord, category: "communication" },

  // Productivity
  { name: "Google Drive", logo: googleDrive, category: "productivity" },
  { name: "Microsoft 365", logo: microsoft365, category: "productivity" },
  { name: "Notion", logo: notion, category: "productivity" },

  // Finance
  { name: "QuickBooks", logo: quickbooks, category: "finance" },
  //{ name: 'Stripe', logo: stripe, category: 'finance' },
  //{ name: 'PayPal', logo: paypal, category: 'finance' },

  // Education
  //{ name: 'Canvas', logo: '/logos/canvas.svg', category: 'education' },
  //{ name: 'Google Classroom', logo: '/logos/google-classroom.svg', category: 'education' },
  //{ name: 'Blackboard', logo: '/logos/blackboard.svg', category: 'education' },

  // E-commerce
  { name: "Shopify", logo: shopify, category: "ecommerce" },
  //{ name: 'WooCommerce', logo: '/logos/woocommerce.svg', category: 'ecommerce' },
  //{ name: 'Magento', logo: '/logos/magento.svg', category: 'ecommerce' },

  // CRM
  { name: "Salesforce", logo: salesforce, category: "crm" },
  { name: "HubSpot", logo: hubspot, category: "crm" },
  //{ name: 'Pipedrive', logo: pipedrive, category: 'crm' },
];

export const testimonials: Testimonial[] = [
  {
    quote:
      "Clancy's digital employees have transformed how we handle customer onboarding. What used to take our team 3 hours now happens automatically in minutes.",
    author: {
      name: "Sarah Chen",
      title: "Operations Director",
      company: "TechFlow Solutions",
    },
  },
  {
    quote:
      "The seamless integration with our existing tools was incredible. We were up and running with our first automation in under 20 minutes.",
    author: {
      name: "Marcus Johnson",
      title: "IT Manager",
      company: "EduTech Innovations",
    },
  },
];

export const pricingTiers: PricingTier[] = [
  {
    name: "Starter",
    price: "$49",
    description: "Perfect for small teams getting started with automation",
    features: [
      "Up to 3 digital employees",
      "10 integrations included",
      "Basic workflow automation",
      "Email support",
      "1,000 monthly actions",
    ],
    ctaText: "Start Free Trial",
    ctaLink: "/signup",
  },
  {
    name: "Professional",
    price: "$149",
    description: "Ideal for growing businesses with complex workflows",
    features: [
      "Up to 10 digital employees",
      "All integrations included",
      "Advanced workflow logic",
      "Priority support",
      "10,000 monthly actions",
      "Custom connectors",
      "Team collaboration tools",
    ],
    isPopular: true,
    ctaText: "Start Free Trial",
    ctaLink: "/signup",
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For large organizations with enterprise requirements",
    features: [
      "Unlimited digital employees",
      "All integrations + custom",
      "Advanced security & compliance",
      "Dedicated success manager",
      "Unlimited actions",
      "On-premise deployment",
      "SLA guarantees",
      "Custom training",
    ],
    ctaText: "Contact Sales",
    ctaLink: "/contact",
  },
];

export const partnerLogos = [
  "/logos/partners/techstars.svg",
  "/logos/partners/y-combinator.svg",
  "/logos/partners/sequoia.svg",
  "/logos/partners/andreessen-horowitz.svg",
];
