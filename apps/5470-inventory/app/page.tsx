'use client';

import { useState, useEffect } from 'react';
import {
  Search, Grid3x3, List, Filter, Plus, Download, Upload,
  Home, Package, DollarSign, Users, TrendingUp, Settings,
  ChevronRight, Eye, Edit, Trash2, ShoppingCart
} from 'lucide-react';

// Mock data for now - will be replaced with API calls
const mockItems = [
  {
    id: '1',
    name: 'Herringbone runner rug',
    room: 'Foyer / Main Entry',
    category: 'Rug / Carpet',
    status: 'SELL',
    askingPrice: 450,
    designerInvoicePrice: 600,
    condition: 'EXCELLENT',
    quantity: 1,
    image: null,
  },
  {
    id: '2',
    name: 'Custom Benches Green (2)',
    room: 'Foyer / Main Entry',
    category: 'Furniture',
    status: 'KEEP',
    askingPrice: 1200,
    designerInvoicePrice: 1500,
    condition: 'GOOD',
    quantity: 2,
    image: null,
  },
  // Add more mock items as needed
];

const statusColors = {
  SELL: 'bg-green-500/20 text-green-400 border-green-500/50',
  KEEP: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
  UNSURE: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  SOLD: 'bg-purple-500/20 text-purple-400 border-purple-500/50',
};

export default function HomePage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [items, setItems] = useState(mockItems);

  // Stats calculation
  const stats = {
    totalItems: items.length,
    totalValue: items.reduce((sum, item) => sum + (item.askingPrice || 0), 0),
    forSale: items.filter(i => i.status === 'SELL').length,
    buyers: 3, // Mock value
  };

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Navigation Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-semibold text-gradient">5470 Inventory</h1>
              <nav className="hidden md:flex space-x-6">
                <a href="#" className="text-slate-300 hover:text-white transition">Dashboard</a>
                <a href="#" className="text-slate-300 hover:text-white transition">Inventory</a>
                <a href="#" className="text-slate-300 hover:text-white transition">Buyers</a>
                <a href="#" className="text-slate-300 hover:text-white transition">Analytics</a>
                <a href="#" className="text-slate-300 hover:text-white transition">Invoices</a>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <button className="p-2 glass-button rounded-lg">
                <Upload className="w-4 h-4" />
              </button>
              <button className="p-2 glass-button rounded-lg">
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="glass-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total Items</p>
                <p className="text-2xl font-semibold">{stats.totalItems}</p>
              </div>
              <Package className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total Value</p>
                <p className="text-2xl font-semibold">${stats.totalValue.toLocaleString()}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-400" />
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">For Sale</p>
                <p className="text-2xl font-semibold">{stats.forSale}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-400" />
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Active Buyers</p>
                <p className="text-2xl font-semibold">{stats.buyers}</p>
              </div>
              <Users className="w-8 h-8 text-yellow-400" />
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="glass-card p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 transition"
                />
              </div>
            </div>
            <select
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
              className="px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 transition"
            >
              <option value="all">All Rooms</option>
              <option value="foyer">Foyer / Main Entry</option>
              <option value="living">Living Room</option>
              <option value="kitchen">Kitchen</option>
            </select>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 transition"
            >
              <option value="all">All Categories</option>
              <option value="furniture">Furniture</option>
              <option value="electronics">Electronics</option>
              <option value="decor">Art / Decor</option>
            </select>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 transition"
            >
              <option value="all">All Status</option>
              <option value="sell">For Sale</option>
              <option value="keep">Keeping</option>
              <option value="unsure">Unsure</option>
            </select>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition ${viewMode === 'grid' ? 'bg-blue-500/20 text-blue-400' : 'glass-button'}`}
              >
                <Grid3x3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition ${viewMode === 'list' ? 'bg-blue-500/20 text-blue-400' : 'glass-button'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
            <button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Item
            </button>
          </div>
        </div>

        {/* Items Grid/List */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map((item) => (
              <div key={item.id} className="glass-card p-4 hover:border-slate-700 transition-all duration-200">
                <div className="aspect-square bg-slate-800/50 rounded-lg mb-3 flex items-center justify-center">
                  <Package className="w-12 h-12 text-slate-600" />
                </div>
                <h3 className="font-semibold mb-1 truncate">{item.name}</h3>
                <p className="text-sm text-slate-400 mb-2">{item.room}</p>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-lg font-semibold">${item.askingPrice}</span>
                  <span className={`px-2 py-1 rounded-full text-xs border ${statusColors[item.status as keyof typeof statusColors]}`}>
                    {item.status}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button className="flex-1 py-1 glass-button rounded text-sm">View</button>
                  <button className="flex-1 py-1 glass-button rounded text-sm">Select</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-card overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-800/50 border-b border-slate-700">
                <tr>
                  <th className="text-left p-4">Item</th>
                  <th className="text-left p-4">Room</th>
                  <th className="text-left p-4">Category</th>
                  <th className="text-left p-4">Status</th>
                  <th className="text-left p-4">Price</th>
                  <th className="text-left p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition">
                    <td className="p-4 font-medium">{item.name}</td>
                    <td className="p-4 text-slate-400">{item.room}</td>
                    <td className="p-4 text-slate-400">{item.category}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs border ${statusColors[item.status as keyof typeof statusColors]}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="p-4 font-semibold">${item.askingPrice}</td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button className="p-1 glass-button rounded">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-1 glass-button rounded">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="p-1 glass-button rounded">
                          <ShoppingCart className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
