'use client';

import Link from 'next/link';
import { Paintbrush2, Home, Building2, ArrowRight, CheckCircle, Phone, Mail, Clock, Shield, Users, Award } from 'lucide-react';
import { animated, useSpring, useTrail } from '@react-spring/web';
import { useState } from 'react';

const ServiceCard = ({ icon: Icon, title, description, delay }: any) => {
  const [hovered, setHovered] = useState(false);

  const spring = useSpring({
    transform: hovered ? 'translateY(-12px)' : 'translateY(0px)',
    boxShadow: hovered ? '0 30px 60px rgba(0, 0, 0, 0.15)' : '0 10px 30px rgba(0, 0, 0, 0.1)',
    borderColor: hovered ? 'rgba(220, 38, 38, 0.3)' : 'rgba(220, 38, 38, 0)',
    config: { tension: 300, friction: 20 }
  });

  return (
    <animated.div
      className="bg-white rounded-xl p-8 transition-all duration-300 border-2"
      style={{ animationDelay: `${delay}ms`, ...spring }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="w-16 h-16 bg-gradient-to-br from-red-600 to-red-700 rounded-full flex items-center justify-center text-white mx-auto mb-6 shadow-lg">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </animated.div>
  );
};

const TestimonialCard = ({ name, location, text, rating }: any) => {
  const [hovered, setHovered] = useState(false);

  const spring = useSpring({
    transform: hovered ? 'scale(1.02)' : 'scale(1)',
    config: { tension: 400, friction: 25 }
  });

  return (
    <animated.div
      className="bg-white rounded-lg p-6 shadow-lg"
      style={spring}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
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
    </animated.div>
  );
};

export default function Home() {
  const [buttonHovered, setButtonHovered] = useState(false);

  const heroSpring = useSpring({
    from: { opacity: 0, transform: 'translateY(30px)' },
    to: { opacity: 1, transform: 'translateY(0px)' },
    config: { duration: 1000 }
  });

  const buttonSpring = useSpring({
    transform: buttonHovered ? 'scale(1.08) translateY(-2px)' : 'scale(1) translateY(0px)',
    boxShadow: buttonHovered ? '0 20px 40px rgba(220, 38, 38, 0.3)' : '0 10px 20px rgba(220, 38, 38, 0.2)',
    config: { tension: 400, friction: 25 }
  });

  const features = [
    "Professional residential painting",
    "Commercial property painting",
    "Interior & exterior services",
    "Free detailed estimates",
    "Licensed & insured",
    "Satisfaction guaranteed"
  ];

  const trail = useTrail(features.length, {
    from: { opacity: 0, transform: 'translateX(-20px)' },
    to: { opacity: 1, transform: 'translateX(0px)' },
    delay: 200,
    config: { tension: 200, friction: 20 }
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
                <Paintbrush2 className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-gray-900">KIND HOME</span>
            </div>
            <div className="flex items-center space-x-6">
              <a href="tel:1-800-KINDHOME" className="flex items-center space-x-2 text-gray-700 hover:text-red-600 transition-colors">
                <Phone className="w-5 h-5" />
                <span className="hidden md:inline">1-800-KINDHOME</span>
              </a>
              <Link href="/estimate/new">
                <button className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-all duration-300 shadow-md hover:shadow-lg">
                  Get Free Estimate
                </button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <animated.div style={heroSpring} className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6">
            Transform Your Space with
            <span className="block text-red-600 mt-2">KIND HOME Painting</span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-600 mb-10 leading-relaxed">
            Professional painting services for residential and commercial properties.
            Quality work, competitive prices, and exceptional customer service.
          </p>

          <Link href="/estimate/new">
            <animated.button
              style={buttonSpring}
              className="bg-red-600 text-white text-lg px-10 py-5 rounded-xl hover:bg-red-700 transition-all duration-300 inline-flex items-center font-semibold shadow-xl"
              onMouseEnter={() => setButtonHovered(true)}
              onMouseLeave={() => setButtonHovered(false)}
            >
              Get Your Free Estimate
              <ArrowRight className="w-6 h-6 ml-3" />
            </animated.button>
          </Link>

          <div className="mt-8 flex flex-wrap justify-center gap-6">
            {trail.map((style, index) => (
              <animated.div key={index} style={style} className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-gray-700">{features[index]}</span>
              </animated.div>
            ))}
          </div>
        </animated.div>
      </section>

      {/* Services Section */}
      <section className="bg-gray-50 py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-4">Our Services</h2>
          <p className="text-xl text-center text-gray-600 mb-12 max-w-2xl mx-auto">
            Complete painting solutions for every project, big or small
          </p>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <ServiceCard
              icon={Home}
              title="Residential Painting"
              description="Transform your home with our expert interior and exterior painting services. We handle everything from single rooms to complete home makeovers."
              delay={0}
            />
            <ServiceCard
              icon={Building2}
              title="Commercial Painting"
              description="Professional painting services for offices, retail spaces, and commercial properties. Minimize disruption with our efficient, scheduled work."
              delay={100}
            />
            <ServiceCard
              icon={Shield}
              title="Specialty Coatings"
              description="Protect your investment with our premium coatings and finishes. Weather-resistant, long-lasting solutions for any surface."
              delay={200}
            />
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-12">Why Choose KIND HOME?</h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            <div className="text-center">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-10 h-10 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Expert Team</h3>
              <p className="text-gray-600">Skilled professionals with years of experience</p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-10 h-10 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">On-Time Delivery</h3>
              <p className="text-gray-600">We respect your time and stick to schedules</p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-10 h-10 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Fully Insured</h3>
              <p className="text-gray-600">Licensed, bonded, and insured for your peace of mind</p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="w-10 h-10 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Quality Guarantee</h3>
              <p className="text-gray-600">100% satisfaction guaranteed on every project</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="bg-gray-50 py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-12">What Our Customers Say</h2>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <TestimonialCard
              name="Sarah Johnson"
              location="Denver, CO"
              text="KIND HOME transformed our entire house. The attention to detail was incredible, and they finished ahead of schedule!"
              rating={5}
            />
            <TestimonialCard
              name="Mike Chen"
              location="Boulder, CO"
              text="Professional, courteous, and the quality exceeded our expectations. Our office looks brand new. Highly recommend!"
              rating={5}
            />
            <TestimonialCard
              name="Emily Rodriguez"
              location="Aurora, CO"
              text="Best painting company we've worked with. Fair pricing, excellent communication, and beautiful results."
              rating={5}
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-red-600 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-xl mb-8 opacity-90">
            Get your free, no-obligation estimate today
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/estimate/new">
              <button className="bg-white text-red-600 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-all duration-300 shadow-lg">
                Start Online Estimate
              </button>
            </Link>
            <a href="tel:1-800-KINDHOME">
              <button className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-red-600 transition-all duration-300">
                Call 1-800-KINDHOME
              </button>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
                  <Paintbrush2 className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold text-white">KIND HOME</span>
              </div>
              <p className="text-sm">Professional painting services you can trust.</p>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Services</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Residential Painting</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Commercial Painting</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Interior Painting</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Exterior Painting</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Our Process</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Gallery</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Testimonials</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Contact</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center space-x-2">
                  <Phone className="w-4 h-4" />
                  <span>1-800-KINDHOME</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Mail className="w-4 h-4" />
                  <span>info@kindhomepaint.com</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Clock className="w-4 h-4 mt-1" />
                  <span>Mon-Fri: 8AM-6PM<br />Sat: 9AM-4PM</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
            <p>&copy; 2024 KIND HOME Painting. All rights reserved. | Licensed & Insured</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
