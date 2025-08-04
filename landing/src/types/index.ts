export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  thumbnail?: string;
  publishedAt: string;
  author: {
    name: string;
    bio?: string;
    avatar?: string;
  };
}

export interface Integration {
  name: string;
  logo: string;
  category:
    | "productivity"
    | "communication"
    | "finance"
    | "education"
    | "ecommerce"
    | "crm"
    | "other";
  description?: string;
}

export interface Feature {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

export interface Testimonial {
  quote: string;
  author: {
    name: string;
    title: string;
    company: string;
    avatar?: string;
  };
}

export interface PricingTier {
  name: string;
  price: string;
  description: string;
  features: string[];
  isPopular?: boolean;
  ctaText: string;
  ctaLink: string;
}

export interface NavItem {
  label: string;
  href: string;
}

export interface CTAButton {
  text: string;
  href: string;
  variant: "primary" | "secondary" | "accent";
}
