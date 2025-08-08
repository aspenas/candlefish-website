"use client"

import * as React from "react"
import {
  Button,
  ButtonGroup,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  FeatureCard,
  MetricCard,
  Badge,
  StatusBadge,
  ValidationBadge,
  Logo,
  LogoWithTagline,
  AnimatedLogo,
  Navigation,
  Breadcrumb,
  Hero,
  CandlefishHero,
  SplitHero,
} from "@/components/ui"
import {
  Zap,
  Shield,
  Brain,
  Sparkles,
  ArrowRight,
  Download,
  ExternalLink,
  ChevronRight,
} from "lucide-react"

export default function ComponentShowcase() {
  const [theme, setTheme] = React.useState<"dark" | "light">("dark")

  React.useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light")
  }, [theme])

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <Navigation
        items={[
          { label: "What We Do", href: "#features" },
          { label: "How It Works", href: "#process" },
          { label: "Active Pilots", href: "#pilots" },
          { label: "Contact", href: "#contact" },
        ]}
        actions={
          <Button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? "☀️" : "🌙"} Mode
          </Button>
        }
      />

      {/* Hero Section */}
      <CandlefishHero
        title="Illuminating the path to AI transformation"
        titleAccent="AI transformation"
        subtitle="We turn your slowest business processes into your fastest competitive advantages through discrete, composable AI modules."
        actions={
          <>
            <Button size="lg" glow>
              Explore Partnership <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="ghost">
              View Case Studies
            </Button>
          </>
        }
      />

      {/* Component Sections */}
      <div className="container mx-auto px-6 py-20 space-y-20">
        {/* Logos Section */}
        <section>
          <h2 className="text-3xl font-light mb-8">Logo Variations</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card padding="lg" className="flex items-center justify-center">
              <Logo size="xl" />
            </Card>
            <Card padding="lg" className="flex items-center justify-center">
              <Logo layout="vertical" size="lg" iconVariant="glow" />
            </Card>
            <Card padding="lg" className="flex items-center justify-center">
              <AnimatedLogo size="lg" />
            </Card>
          </div>
          <div className="mt-8">
            <Card variant="glass" padding="lg" className="text-center">
              <LogoWithTagline size="xl" />
            </Card>
          </div>
        </section>

        {/* Buttons Section */}
        <section>
          <h2 className="text-3xl font-light mb-8">Button System</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-mono uppercase tracking-wider text-muted-foreground mb-4">
                Variants
              </h3>
              <div className="flex flex-wrap gap-4">
                <Button>Default</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="link">Link</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="glow">Glow Effect</Button>
                <Button variant="glass">Glassmorphism</Button>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-mono uppercase tracking-wider text-muted-foreground mb-4">
                Sizes
              </h3>
              <div className="flex flex-wrap items-center gap-4">
                <Button size="sm">Small</Button>
                <Button size="default">Default</Button>
                <Button size="lg">Large</Button>
                <Button size="xl">Extra Large</Button>
                <Button size="icon"><Sparkles className="h-4 w-4" /></Button>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-mono uppercase tracking-wider text-muted-foreground mb-4">
                States
              </h3>
              <div className="flex flex-wrap gap-4">
                <Button loading>Processing</Button>
                <Button disabled>Disabled</Button>
                <Button variant="glow" glow>
                  With Glow <Sparkles className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-mono uppercase tracking-wider text-muted-foreground mb-4">
                Button Groups
              </h3>
              <ButtonGroup attached>
                <Button variant="outline">Previous</Button>
                <Button variant="outline">1</Button>
                <Button>2</Button>
                <Button variant="outline">3</Button>
                <Button variant="outline">Next</Button>
              </ButtonGroup>
            </div>
          </div>
        </section>

        {/* Badges Section */}
        <section>
          <h2 className="text-3xl font-light mb-8">Badge System</h2>
          <div className="space-y-6">
            <div className="flex flex-wrap gap-4">
              <ValidationBadge />
              <ValidationBadge phase="ACTIVE PILOT" />
              <ValidationBadge phase="ENTERPRISE" />
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="destructive">Error</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="info">Info</Badge>
              <Badge variant="glow">Glow</Badge>
            </div>

            <div>
              <h3 className="text-sm font-mono uppercase tracking-wider text-muted-foreground mb-4">
                Status Badges
              </h3>
              <div className="flex flex-wrap gap-4">
                <StatusBadge status="active" />
                <StatusBadge status="inactive" />
                <StatusBadge status="pending" />
                <StatusBadge status="error" />
                <StatusBadge status="success" />
              </div>
            </div>
          </div>
        </section>

        {/* Cards Section */}
        <section>
          <h2 className="text-3xl font-light mb-8">Card System</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Default Card</CardTitle>
                <CardDescription>
                  Standard card with subtle border and shadow
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Perfect for content sections and feature displays.
                </p>
              </CardContent>
              <CardFooter>
                <Button variant="outline" size="sm">Learn More</Button>
              </CardFooter>
            </Card>

            <Card variant="glass">
              <CardHeader>
                <CardTitle>Glass Card</CardTitle>
                <CardDescription>
                  Glassmorphism effect with backdrop blur
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Modern translucent design for overlays.
                </p>
              </CardContent>
            </Card>

            <Card variant="glow" hoverable>
              <CardHeader>
                <CardTitle>Glow Card</CardTitle>
                <CardDescription>
                  Subtle glow effect on hover
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Interactive cards that respond to user attention.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <FeatureCard
              icon={<Brain className="h-6 w-6" />}
              badge="NEW"
            >
              <CardHeader>
                <CardTitle>Neural Processing</CardTitle>
                <CardDescription>
                  Advanced AI models for complex analysis
                </CardDescription>
              </CardHeader>
            </FeatureCard>

            <FeatureCard
              icon={<Shield className="h-6 w-6" />}
            >
              <CardHeader>
                <CardTitle>Enterprise Security</CardTitle>
                <CardDescription>
                  SOC 2 Type II certified infrastructure
                </CardDescription>
              </CardHeader>
            </FeatureCard>

            <FeatureCard
              icon={<Zap className="h-6 w-6" />}
            >
              <CardHeader>
                <CardTitle>Lightning Fast</CardTitle>
                <CardDescription>
                  10x faster processing with edge deployment
                </CardDescription>
              </CardHeader>
            </FeatureCard>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <MetricCard
              label="Active Users"
              value="12,543"
              change={{ value: 12.5, trend: "up" }}
              icon={<Brain className="h-8 w-8" />}
            />
            <MetricCard
              label="Processing Speed"
              value="0.3s"
              change={{ value: -23.2, trend: "down" }}
              icon={<Zap className="h-8 w-8" />}
            />
            <MetricCard
              label="Accuracy Rate"
              value="99.7%"
              change={{ value: 0.8, trend: "up" }}
              icon={<Shield className="h-8 w-8" />}
            />
            <MetricCard
              label="API Calls"
              value="2.1M"
              change={{ value: 0, trend: "neutral" }}
              icon={<Sparkles className="h-8 w-8" />}
            />
          </div>
        </section>

        {/* Navigation Examples */}
        <section>
          <h2 className="text-3xl font-light mb-8">Navigation</h2>
          <Card variant="glass" padding="none">
            <Breadcrumb
              className="p-6"
              items={[
                { label: "Home", href: "/" },
                { label: "Documentation", href: "/docs" },
                { label: "Components", href: "/docs/components" },
                { label: "Button" },
              ]}
            />
          </Card>
        </section>

        {/* Theme Toggle */}
        <section>
          <h2 className="text-3xl font-light mb-8">Theme Support</h2>
          <Card padding="lg" className="text-center">
            <p className="mb-6">
              All components support both light and dark themes with consistent contrast ratios.
            </p>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              Switch to {theme === "dark" ? "Light" : "Dark"} Mode
            </Button>
          </Card>
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="container mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <LogoWithTagline size="sm" />
            <p className="text-sm text-muted-foreground">
              © 2025 Candlefish AI. All rights reserved.
            </p>
            <div className="flex gap-4">
              <Button variant="ghost" size="sm">
                Privacy Policy
              </Button>
              <Button variant="ghost" size="sm">
                Terms of Service
              </Button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
