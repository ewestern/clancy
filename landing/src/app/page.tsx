import { Header } from '@/components/sections/Header';
import { Hero } from '@/components/sections/Hero';
import { Features } from '@/components/sections/Features';
import { ValueDeepDive } from '@/components/sections/ValueDeepDive';
import { Integrations } from '@/components/sections/Integrations';
import { BlogTeaser } from '@/components/sections/BlogTeaser';
import { Testimonials } from '@/components/sections/Testimonials';
import { Pricing } from '@/components/sections/Pricing';
import { FinalCTA } from '@/components/sections/FinalCTA';
import { Footer } from '@/components/sections/Footer';
import { getRecentPosts } from '@/lib/blog';

export default async function Home() {
  const recentPosts = await getRecentPosts(3);

  return (
    <main className="overflow-hidden">
      <Header />
      <Hero />
      <Features />
      <ValueDeepDive />
      <Integrations />
      <BlogTeaser posts={recentPosts} />
      <Testimonials />
      <Pricing />
      <FinalCTA />
      <Footer />
    </main>
  );
}
