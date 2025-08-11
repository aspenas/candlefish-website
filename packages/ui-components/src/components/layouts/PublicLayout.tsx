import React from 'react'

interface NavigationItem {
  label: string;
  href: string;
}

interface PublicLayoutProps {
  children: React.ReactNode;
  navigationItems?: NavigationItem[];
  showSearch?: boolean;
}

export const PublicLayout: React.FC<PublicLayoutProps> = ({
  children,
  navigationItems = [],
  showSearch = false
}) => {
  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-gray-800">
        <nav className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="text-xl font-bold">Candlefish AI</div>
            {navigationItems.length > 0 && (
              <div className="hidden md:flex space-x-6">
                {navigationItems.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="hover:text-candlefish-400 transition-colors"
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        </nav>
      </header>
      <main>
        {children}
      </main>
    </div>
  )
}
