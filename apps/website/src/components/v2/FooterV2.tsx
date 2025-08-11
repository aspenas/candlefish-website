import React from 'react';
import { MapPin, Mail, Github, Linkedin, Twitter } from 'lucide-react';
import './FooterV2.css';

const FooterV2: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer-v2">
      <div className="container">
        <div className="footer-content">
          <div className="footer-brand">
            <img
              src="/logo/candlefish_highquality.png"
              alt="Candlefish AI"
              className="footer-logo"
            />
            <p className="footer-tagline">
              Illuminating the path to AI transformation
            </p>
            <div className="footer-social">
              <a href="https://github.com/candlefish-ai" aria-label="GitHub" className="social-link">
                <Github size={20} />
              </a>
              <a href="https://linkedin.com/company/candlefish-ai" aria-label="LinkedIn" className="social-link">
                <Linkedin size={20} />
              </a>
              <a href="https://twitter.com/candlefishai" aria-label="Twitter" className="social-link">
                <Twitter size={20} />
              </a>
            </div>
          </div>

          <div className="footer-links">
            <div className="footer-column">
              <h3 className="footer-heading">Services</h3>
              <ul className="footer-list">
                <li><a href="#automation">Process Automation</a></li>
                <li><a href="#integration">System Integration</a></li>
                <li><a href="#ai">AI Implementation</a></li>
                <li><a href="#consulting">Consulting</a></li>
              </ul>
            </div>

            <div className="footer-column">
              <h3 className="footer-heading">Company</h3>
              <ul className="footer-list">
                <li><a href="#about">About Us</a></li>
                <li><a href="#projects">Case Studies</a></li>
                <li><a href="#blog">Blog</a></li>
                <li><a href="#careers">Careers</a></li>
              </ul>
            </div>

            <div className="footer-column">
              <h3 className="footer-heading">Resources</h3>
              <ul className="footer-list">
                <li><a href="#docs">Documentation</a></li>
                <li><a href="#api">API Reference</a></li>
                <li><a href="#support">Support</a></li>
                <li><a href="#privacy">Privacy Policy</a></li>
              </ul>
            </div>
          </div>

          <div className="footer-contact">
            <h3 className="footer-heading">Contact</h3>
            <div className="contact-item">
              <Mail size={16} />
              <a href="mailto:hello@candlefish.ai">hello@candlefish.ai</a>
            </div>
            <div className="contact-locations">
              <div className="contact-item">
                <MapPin size={16} />
                <span>Portsmouth, NH</span>
              </div>
              <div className="contact-item">
                <MapPin size={16} />
                <span>Denver, CO</span>
              </div>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p className="footer-copyright">
            © {currentYear} Candlefish AI LLC. All rights reserved.
          </p>
          <div className="footer-legal">
            <a href="#terms">Terms of Service</a>
            <span className="legal-divider">•</span>
            <a href="#privacy">Privacy Policy</a>
            <span className="legal-divider">•</span>
            <a href="#cookies">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default FooterV2;
