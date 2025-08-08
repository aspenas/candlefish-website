import React, { useEffect, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollToPlugin } from 'gsap/ScrollToPlugin'

// Register GSAP plugin
gsap.registerPlugin(ScrollToPlugin)

interface NavLinkProps {
  href: string
  children: React.ReactNode
}

const NavLink: React.FC<NavLinkProps> = ({ href, children }) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    const target = document.querySelector(href)

    if (target) {
      const nav = document.querySelector('.nav')
      const navHeight = nav?.getBoundingClientRect().height || 0
      const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navHeight - 20

      gsap.to(window, {
        scrollTo: targetPosition,
        duration: 1,
        ease: "power2.inOut"
      })
    }
  }

  return (
    <a
      href={href}
      onClick={handleClick}
      className="relative text-gray-400 text-sm font-mono tracking-wide transition-colors duration-200 hover:text-white group"
    >
      {children}
      <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-teal-400 transition-all duration-200 group-hover:w-full"></span>
    </a>
  )
}

const Navigation: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.pageYOffset > 100)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <nav
      className={`nav fixed top-0 left-0 right-0 z-50 transition-all duration-400 ease-out ${
        isScrolled
          ? 'py-4 bg-black/95 backdrop-blur-md shadow-lg shadow-black/30'
          : 'py-6 bg-black/80 backdrop-blur-md'
      } border-b border-gray-700`}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="container mx-auto px-6 max-w-screen-2xl">
        <div className="flex justify-between items-center">
          <a
            href="#"
            className="flex items-center gap-4 text-white no-underline transition-opacity duration-200 hover:opacity-80"
            aria-label="Candlefish AI Home"
          >
            <picture>
              <source srcSet="/logo/candlefish_original.png" type="image/webp" />
              <source srcSet="/logo/candlefish_original.png" type="image/png" />
              <img
                src="/logo/candlefish_original.png"
                alt="Candlefish AI Logo"
                className="w-12 h-12 lg:w-16 lg:h-16 object-contain"
                width="64"
                height="64"
              />
            </picture>
            <span className="text-xl lg:text-2xl font-light tracking-wider">
              CANDLEFISH
            </span>
          </a>

          <div className="hidden lg:flex items-center gap-8">
            <NavLink href="#what-we-do">What We Do</NavLink>
            <NavLink href="#how-it-works">How It Works</NavLink>
            <NavLink href="#pilots">Active Pilots</NavLink>
            <NavLink href="#contact">Contact</NavLink>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navigation
