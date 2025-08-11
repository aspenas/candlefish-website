'use client';

import Link from 'next/link';
import { Paintbrush2, Home, Building2, ArrowRight, CheckCircle, Phone, Mail, Clock, Shield, Users, Award } from 'lucide-react';
// import PaintboxLogo from '@/components/ui/PaintboxLogo'; // Temporarily removed for deployment

const ServiceCard = ({ icon: Icon, title, description }: any) => {
  return (
    <div className="bg-white rounded-xl p-8 transition-all duration-300 border-2 hover:shadow-xl hover:-translate-y-2 hover:border-red-200">
      <div className="w-16 h-16 bg-gradient-to-br from-red-600 to-red-700 rounded-full flex items-center justify-center text-white mx-auto mb-6 shadow-lg">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
};

const TestimonialCard = ({ name, location, text, rating }: any) => {
  return (
    <div className="bg-white rounded-lg p-6 shadow-lg hover:shadow-xl transition-shadow">
      <div className="flex mb-4">
        {[...Array(rating)].map((_, i) => (
          <span key={i} className="text-yellow-500 text-xl">★</span>
        ))}
      </div>
      <p className="text-gray-700 mb-4 italic">"{text}"</p>
      <div>
        <p className="font-semibold text-gray-900">{name}</p>
        <p className="text-sm text-gray-500">{location}</p>
      </div>
    </div>
  );
};

export default function Home() {
  const features = [
    "Professional residential painting",
    "Commercial property painting",
    "Interior & exterior services",
    "Free detailed estimates",
    "Licensed & insured",
    "Satisfaction guaranteed"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="text-4xl">🎨</div>
              <span className="text-2xl font-bold text-gray-900">Paintbox</span>
            </div>
            <div className="flex items-center space-x-6">
              <a href="tel:720-903-0002" className="flex items-center space-x-2 text-gray-700 hover:text-red-600 transition-colors">
                <Phone className="w-4 h-4" />
                <span className="font-medium">720-903-0002</span>
              </a>
              <Link href="/workflow/start" className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-2 rounded-lg font-medium hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
                Get Estimate
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-24 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-red-50 via-white to-gray-50 opacity-70"></div>
        <div className="container mx-auto relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
              Transform Your Space with
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-700"> Professional Painting</span>
            </h2>
            <p className="text-xl text-gray-700 mb-8 leading-relaxed">
              Serving Colorado with exceptional residential and commercial painting services.
              Licensed, insured, and committed to excellence.
            </p>
            <Link
              href="/workflow/start"
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-red-600 to-red-700 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
            >
              <span>Get Your Free Estimate</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
            <div className="mt-6 flex items-center justify-center space-x-6 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>Free Consultation</span>
              </div>
              <div className="flex items-center space-x-1">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>Licensed & Insured</span>
              </div>
              <div className="flex items-center space-x-1">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>100% Satisfaction</span>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="container mx-auto mt-16">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {features.map((feature, index) => (
              <div
                key={index}
                className="flex items-center space-x-2 bg-white rounded-lg px-4 py-3 shadow-sm"
              >
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span className="text-sm text-gray-700">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Our Painting Services</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              From single rooms to entire buildings, we deliver quality that lasts
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <ServiceCard
              icon={Home}
              title="Residential Painting"
              description="Transform your home with our expert interior and exterior painting services. We use premium paints and meticulous techniques."
            />
            <ServiceCard
              icon={Building2}
              title="Commercial Painting"
              description="Professional painting solutions for offices, retail spaces, and industrial facilities. Minimal disruption to your business."
            />
            <ServiceCard
              icon={Paintbrush2}
              title="Specialty Finishes"
              description="Decorative finishes, faux painting, and custom color matching. Let us bring your unique vision to life."
            />
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-20 px-4 bg-white">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Why Choose KIND HOME?</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              We're not just painters – we're your partners in creating beautiful spaces
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-red-600 to-red-700 rounded-full flex items-center justify-center text-white mx-auto mb-4">
                <Clock className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">On-Time Service</h3>
              <p className="text-gray-600">We respect your schedule and complete projects on time, every time</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-red-600 to-red-700 rounded-full flex items-center justify-center text-white mx-auto mb-4">
                <Shield className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Fully Licensed</h3>
              <p className="text-gray-600">Licensed, bonded, and insured for your complete peace of mind</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-red-600 to-red-700 rounded-full flex items-center justify-center text-white mx-auto mb-4">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Expert Team</h3>
              <p className="text-gray-600">Skilled professionals with years of experience in all types of painting</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-red-600 to-red-700 rounded-full flex items-center justify-center text-white mx-auto mb-4">
                <Award className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Quality Guarantee</h3>
              <p className="text-gray-600">We stand behind our work with a comprehensive satisfaction guarantee</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">What Our Customers Say</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Don't just take our word for it – hear from our satisfied customers
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <TestimonialCard
              name="Sarah Johnson"
              location="Denver, CO"
              text="KIND HOME did an amazing job painting our entire house. Professional, clean, and the results exceeded our expectations!"
              rating={5}
            />
            <TestimonialCard
              name="Mike Chen"
              location="Boulder, CO"
              text="Best painting contractor we've worked with. They were punctual, detail-oriented, and left our office looking brand new."
              rating={5}
            />
            <TestimonialCard
              name="Emily Rodriguez"
              location="Colorado Springs, CO"
              text="From the estimate to the final coat, everything was handled professionally. I highly recommend KIND HOME!"
              rating={5}
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-gradient-to-r from-red-600 to-red-700">
        <div className="container mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to Transform Your Space?
          </h2>
          <p className="text-xl text-red-100 mb-8 max-w-2xl mx-auto">
            Get your free, no-obligation estimate today and see why Colorado trusts KIND HOME
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <Link
              href="/workflow/start"
              className="bg-white text-red-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-all duration-300 hover:shadow-xl"
            >
              Start Your Estimate
            </Link>
            <a
              href="tel:720-903-0002"
              className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-red-600 transition-all duration-300"
            >
              <Phone className="w-5 h-5 inline mr-2" />
              Call 720-903-0002
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12 px-4">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="flex items-center space-x-2">
                  <div className="text-2xl">🎨</div>
                  <span className="text-lg font-bold">Paintbox</span>
                </div>
              </div>
              <p className="text-sm">Professional painting services in Colorado since 2015.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Services</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/services/residential" className="hover:text-red-400 transition-colors">Residential Painting</Link></li>
                <li><Link href="/services/commercial" className="hover:text-red-400 transition-colors">Commercial Painting</Link></li>
                <li><Link href="/services/exterior" className="hover:text-red-400 transition-colors">Exterior Painting</Link></li>
                <li><Link href="/services/interior" className="hover:text-red-400 transition-colors">Interior Painting</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/about" className="hover:text-red-400 transition-colors">About Us</Link></li>
                <li><Link href="/gallery" className="hover:text-red-400 transition-colors">Our Work</Link></li>
                <li><Link href="/testimonials" className="hover:text-red-400 transition-colors">Testimonials</Link></li>
                <li><Link href="/contact" className="hover:text-red-400 transition-colors">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Contact Info</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center space-x-2">
                  <Phone className="w-4 h-4" />
                  <span>720-903-0002</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Mail className="w-4 h-4" />
                  <span>info@kindhome.com</span>
                </li>
                <li>License #PCL-2019-0001832</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
            <p>&copy; 2024 KIND HOME. All rights reserved. |
              <Link href="/privacy" className="hover:text-red-400 transition-colors ml-2">Privacy Policy</Link> |
              <Link href="/terms" className="hover:text-red-400 transition-colors ml-2">Terms of Service</Link>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
