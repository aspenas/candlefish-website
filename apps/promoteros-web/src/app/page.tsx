import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Calendar, Users, BarChart3, CheckCircle } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-primary/10 to-background">
        <div className="container mx-auto px-4 py-24">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl font-bold mb-6">
              Event Management for Modern Venues
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Streamline your booking process, manage events efficiently, and deliver exceptional experiences for 1,200-3,500 capacity venues.
            </p>
            <div className="flex gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/auth/signin">Get Started</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/request/demo">Request Demo</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            Everything You Need to Run Your Venue
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard
              icon={<Calendar className="h-8 w-8" />}
              title="Smart Scheduling"
              description="Intelligent calendar management with conflict detection and automated task creation."
            />
            <FeatureCard
              icon={<Users className="h-8 w-8" />}
              title="Promoter Portal"
              description="Self-service booking requests with automated vetting and communication."
            />
            <FeatureCard
              icon={<BarChart3 className="h-8 w-8" />}
              title="Revenue Tracking"
              description="Track splits, guarantees, and settlements with complete financial transparency."
            />
            <FeatureCard
              icon={<CheckCircle className="h-8 w-8" />}
              title="Task Management"
              description="Never miss a deadline with automated task templates and runsheet generation."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary text-primary-foreground py-24">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Transform Your Venue Operations?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join venues that have streamlined their booking and event management.
          </p>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/auth/signin">Start Free Trial</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-semibold mb-4">PromoterOS</h3>
              <p className="text-sm text-muted-foreground">
                Professional event management for mid-size venues.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/features" className="hover:underline">Features</Link></li>
                <li><Link href="/pricing" className="hover:underline">Pricing</Link></li>
                <li><Link href="/docs" className="hover:underline">Documentation</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/about" className="hover:underline">About</Link></li>
                <li><Link href="/contact" className="hover:underline">Contact</Link></li>
                <li><Link href="/privacy" className="hover:underline">Privacy</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Connect</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="mailto:support@promoteros.com" className="hover:underline">support@promoteros.com</a></li>
                <li><a href="https://twitter.com/promoteros" className="hover:underline">Twitter</a></li>
                <li><a href="https://linkedin.com/company/promoteros" className="hover:underline">LinkedIn</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
            © 2025 PromoterOS. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-primary/10 text-primary mb-4">
        {icon}
      </div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
