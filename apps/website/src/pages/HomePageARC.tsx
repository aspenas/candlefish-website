import React from 'react'
import NavigationARC from '../components/NavigationARC'
import HeroARC from '../components/sections/HeroARC'
import '../styles/design-system.css'

const HomePageARC: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      <NavigationARC />
      <HeroARC />

      {/* Services Section */}
      <section id="services" className="py-24 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mb-16">
            <h2 className="text-5xl font-bold text-gray-900 mb-6">
              What We Do
            </h2>
            <p className="text-xl text-gray-600">
              We deliver AI transformation through focused, measurable implementations.
              Each module is designed to solve specific business challenges while
              integrating seamlessly with your existing infrastructure.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Process Analysis</h3>
              <p className="text-gray-600 mb-4">
                We identify your most time-consuming processes and design AI solutions
                that deliver immediate, measurable improvements.
              </p>
              <ul className="space-y-2 text-sm text-gray-500">
                <li className="flex items-center">
                  <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full mr-2"></span>
                  Workflow mapping
                </li>
                <li className="flex items-center">
                  <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full mr-2"></span>
                  Bottleneck identification
                </li>
                <li className="flex items-center">
                  <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full mr-2"></span>
                  ROI projections
                </li>
              </ul>
            </div>

            <div className="bg-white p-8 rounded-2xl hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">🔧</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Modular Implementation</h3>
              <p className="text-gray-600 mb-4">
                Custom AI modules built to your specifications, delivered as
                production-ready code with full documentation.
              </p>
              <ul className="space-y-2 text-sm text-gray-500">
                <li className="flex items-center">
                  <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full mr-2"></span>
                  Custom model training
                </li>
                <li className="flex items-center">
                  <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full mr-2"></span>
                  API development
                </li>
                <li className="flex items-center">
                  <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full mr-2"></span>
                  System integration
                </li>
              </ul>
            </div>

            <div className="bg-white p-8 rounded-2xl hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">📈</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Continuous Optimization</h3>
              <p className="text-gray-600 mb-4">
                Ongoing monitoring and refinement to ensure your AI systems
                continue delivering value as your business evolves.
              </p>
              <ul className="space-y-2 text-sm text-gray-500">
                <li className="flex items-center">
                  <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full mr-2"></span>
                  Performance monitoring
                </li>
                <li className="flex items-center">
                  <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full mr-2"></span>
                  Model retraining
                </li>
                <li className="flex items-center">
                  <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full mr-2"></span>
                  Feature expansion
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Approach Section */}
      <section id="approach" className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mb-16">
            <h2 className="text-5xl font-bold text-gray-900 mb-6">
              Our Approach
            </h2>
            <p className="text-xl text-gray-600">
              We believe in starting small, proving value, and scaling systematically.
              Our modular approach means you see results in weeks, not months.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="space-y-8">
                <div className="flex">
                  <div className="flex-shrink-0 w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center text-cyan-600 font-bold">
                    1
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Discovery Sprint</h3>
                    <p className="text-gray-600">
                      2-3 days analyzing your workflows to identify the highest-impact opportunities
                      for AI implementation.
                    </p>
                  </div>
                </div>

                <div className="flex">
                  <div className="flex-shrink-0 w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center text-cyan-600 font-bold">
                    2
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Pilot Module</h3>
                    <p className="text-gray-600">
                      2-4 weeks building and deploying your first AI module, complete with
                      metrics to measure success.
                    </p>
                  </div>
                </div>

                <div className="flex">
                  <div className="flex-shrink-0 w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center text-cyan-600 font-bold">
                    3
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Scale & Expand</h3>
                    <p className="text-gray-600">
                      Add new modules based on proven ROI, building a comprehensive AI
                      ecosystem tailored to your needs.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-2xl p-8">
              <h3 className="text-sm uppercase tracking-wider text-gray-500 font-semibold mb-6">
                Typical Timeline
              </h3>
              <div className="space-y-4">
                <div className="bg-white rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-gray-900">Week 1</span>
                    <span className="text-sm text-gray-500">Discovery</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-cyan-500 h-2 rounded-full" style={{width: '25%'}}></div>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-gray-900">Week 2-3</span>
                    <span className="text-sm text-gray-500">Development</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-cyan-500 h-2 rounded-full" style={{width: '50%'}}></div>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-gray-900">Week 4</span>
                    <span className="text-sm text-gray-500">Deployment</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-cyan-500 h-2 rounded-full" style={{width: '75%'}}></div>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-gray-900">Ongoing</span>
                    <span className="text-sm text-gray-500">Optimization</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-gradient-to-r from-cyan-500 to-cyan-300 h-2 rounded-full animate-pulse" style={{width: '100%'}}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Case Studies Section */}
      <section id="case-studies" className="py-24 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mb-16">
            <h2 className="text-5xl font-bold text-gray-900 mb-6">
              Case Studies
            </h2>
            <p className="text-xl text-gray-600">
              Real implementations delivering measurable results for enterprises
              across industries.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl overflow-hidden hover:shadow-lg transition-shadow">
              <div className="p-8">
                <div className="flex items-center mb-4">
                  <span className="text-3xl mr-3">🏭</span>
                  <span className="text-sm text-gray-500 font-medium uppercase tracking-wider">Manufacturing</span>
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                  Quality Control Automation
                </h3>
                <p className="text-gray-600 mb-6">
                  Reduced defect rates by 87% using computer vision models to identify
                  quality issues in real-time on the production line.
                </p>
                <div className="grid grid-cols-2 gap-4 pb-6 border-b border-gray-200">
                  <div>
                    <div className="text-2xl font-bold text-cyan-600">87%</div>
                    <div className="text-sm text-gray-500">Defect reduction</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-cyan-600">3 weeks</div>
                    <div className="text-sm text-gray-500">Implementation</div>
                  </div>
                </div>
                <div className="pt-6">
                  <div className="text-sm text-gray-500 mb-2">Technologies used:</div>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-600">Computer Vision</span>
                    <span className="px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-600">TensorFlow</span>
                    <span className="px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-600">Edge Computing</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl overflow-hidden hover:shadow-lg transition-shadow">
              <div className="p-8">
                <div className="flex items-center mb-4">
                  <span className="text-3xl mr-3">💼</span>
                  <span className="text-sm text-gray-500 font-medium uppercase tracking-wider">Financial Services</span>
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                  Document Processing Pipeline
                </h3>
                <p className="text-gray-600 mb-6">
                  Automated 95% of manual document review processes, reducing processing
                  time from days to minutes.
                </p>
                <div className="grid grid-cols-2 gap-4 pb-6 border-b border-gray-200">
                  <div>
                    <div className="text-2xl font-bold text-cyan-600">95%</div>
                    <div className="text-sm text-gray-500">Automation rate</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-cyan-600">120x</div>
                    <div className="text-sm text-gray-500">Speed increase</div>
                  </div>
                </div>
                <div className="pt-6">
                  <div className="text-sm text-gray-500 mb-2">Technologies used:</div>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-600">NLP</span>
                    <span className="px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-600">OCR</span>
                    <span className="px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-600">GPT-4</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Technology Section */}
      <section id="technology" className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mb-16">
            <h2 className="text-5xl font-bold text-gray-900 mb-6">
              Technology Stack
            </h2>
            <p className="text-xl text-gray-600">
              We use best-in-class tools and frameworks to deliver robust,
              scalable AI solutions.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            <div className="group">
              <div className="bg-gray-50 rounded-xl p-6 hover:bg-white hover:shadow-lg transition-all">
                <div className="text-sm text-gray-500 font-medium mb-3 uppercase tracking-wider">Models</div>
                <ul className="space-y-2 text-gray-700">
                  <li>GPT-4 / Claude</li>
                  <li>Custom LLMs</li>
                  <li>Computer Vision</li>
                  <li>Time Series</li>
                </ul>
              </div>
            </div>
            <div className="group">
              <div className="bg-gray-50 rounded-xl p-6 hover:bg-white hover:shadow-lg transition-all">
                <div className="text-sm text-gray-500 font-medium mb-3 uppercase tracking-wider">Frameworks</div>
                <ul className="space-y-2 text-gray-700">
                  <li>TensorFlow</li>
                  <li>PyTorch</li>
                  <li>LangChain</li>
                  <li>Hugging Face</li>
                </ul>
              </div>
            </div>
            <div className="group">
              <div className="bg-gray-50 rounded-xl p-6 hover:bg-white hover:shadow-lg transition-all">
                <div className="text-sm text-gray-500 font-medium mb-3 uppercase tracking-wider">Infrastructure</div>
                <ul className="space-y-2 text-gray-700">
                  <li>AWS / Azure / GCP</li>
                  <li>Kubernetes</li>
                  <li>Edge Devices</li>
                  <li>Vector DBs</li>
                </ul>
              </div>
            </div>
            <div className="group">
              <div className="bg-gray-50 rounded-xl p-6 hover:bg-white hover:shadow-lg transition-all">
                <div className="text-sm text-gray-500 font-medium mb-3 uppercase tracking-wider">Integration</div>
                <ul className="space-y-2 text-gray-700">
                  <li>REST APIs</li>
                  <li>GraphQL</li>
                  <li>Webhooks</li>
                  <li>Event Streams</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-cyan-500 to-cyan-600">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-5xl font-bold text-white mb-6">
            Ready to Transform Your Business?
          </h2>
          <p className="text-xl text-cyan-50 mb-12 max-w-2xl mx-auto">
            Let's identify your biggest bottleneck and turn it into your
            competitive advantage in just 4 weeks.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#contact"
              className="inline-flex items-center justify-center px-8 py-4 bg-white hover:bg-gray-100 text-cyan-600 font-semibold rounded-lg transition-colors"
            >
              Schedule Discovery Call
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
            <a
              href="mailto:hello@candlefish.ai"
              className="inline-flex items-center justify-center px-8 py-4 border-2 border-white hover:bg-white/10 text-white font-semibold rounded-lg transition-colors"
            >
              hello@candlefish.ai
            </a>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl p-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                Let's Start a Conversation
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                Tell us about your challenges and we'll show you how modular AI
                can solve them.
              </p>

              <div className="grid md:grid-cols-2 gap-8 mb-8">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Quick Contact</h3>
                  <div className="space-y-3">
                    <a href="mailto:hello@candlefish.ai" className="flex items-center text-gray-600 hover:text-cyan-600">
                      <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      hello@candlefish.ai
                    </a>
                    <a href="https://linkedin.com/company/candlefish-ai" className="flex items-center text-gray-600 hover:text-cyan-600">
                      <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                      </svg>
                      LinkedIn
                    </a>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Office Locations</h3>
                  <div className="space-y-3 text-gray-600">
                    <div>
                      <div className="font-medium">Portsmouth, NH</div>
                      <div className="text-sm">East Coast Operations</div>
                    </div>
                    <div>
                      <div className="font-medium">Denver, CO</div>
                      <div className="text-sm">West Coast Operations</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-gray-200">
                <p className="text-sm text-gray-500 text-center">
                  Candlefish AI LLC - Illuminating the path to AI transformation
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-white border-t border-gray-200">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <img
                src="/logo/candlefish_original.png"
                alt="Candlefish AI"
                className="w-8 h-8"
              />
              <span className="text-gray-600">© 2024 Candlefish AI LLC</span>
            </div>
            <div className="flex space-x-6 text-sm text-gray-500">
              <a href="#" className="hover:text-gray-900">Privacy Policy</a>
              <a href="#" className="hover:text-gray-900">Terms of Service</a>
              <a href="https://github.com/candlefish-ai" className="hover:text-gray-900">GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default HomePageARC
