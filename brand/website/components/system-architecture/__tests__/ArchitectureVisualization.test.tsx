import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import ArchitectureVisualization from '../ArchitectureVisualization'

// Mock IntersectionObserver
const mockIntersectionObserver = jest.fn()
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null
})
window.IntersectionObserver = mockIntersectionObserver

// Mock Canvas context
const mockCanvas = {
  getContext: jest.fn(() => ({
    clearRect: jest.fn(),
    fillRect: jest.fn(),
    strokeStyle: '',
    lineWidth: 0,
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    quadraticCurveTo: jest.fn(),
    stroke: jest.fn(),
    fill: jest.fn(),
    arc: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    createLinearGradient: jest.fn(() => ({
      addColorStop: jest.fn()
    })),
    fillStyle: '',
    globalAlpha: 0,
    shadowColor: '',
    shadowBlur: 0,
    lineCap: '',
    font: '',
    textAlign: '',
    fillText: jest.fn()
  }))
}

// Mock canvas element
HTMLCanvasElement.prototype.getContext = mockCanvas.getContext as any

// Mock requestAnimationFrame
window.requestAnimationFrame = jest.fn(cb => {
  setTimeout(cb, 16)
  return 1
})

window.cancelAnimationFrame = jest.fn()

describe('ArchitectureVisualization', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders system status banner', () => {
    render(<ArchitectureVisualization />)

    expect(screen.getByText(/SYSTEM_STATUS:/)).toBeInTheDocument()
    expect(screen.getByText(/NODES ACTIVE/)).toBeInTheDocument()
  })

  it('renders transformation impact section', () => {
    render(<ArchitectureVisualization />)

    expect(screen.getByText('Transformation Impact')).toBeInTheDocument()
    expect(screen.getByText('Before')).toBeInTheDocument()
    expect(screen.getByText('After')).toBeInTheDocument()
  })

  it('renders system telemetry section', () => {
    render(<ArchitectureVisualization />)

    expect(screen.getByText('System Telemetry')).toBeInTheDocument()
    expect(screen.getByText('Pipeline Status')).toBeInTheDocument()
    expect(screen.getByText('Throughput')).toBeInTheDocument()
    expect(screen.getByText('Efficiency')).toBeInTheDocument()
  })

  it('renders performance summary', () => {
    render(<ArchitectureVisualization />)

    expect(screen.getByText(/45\+ minutes/)).toBeInTheDocument()
    expect(screen.getByText(/<1 minute/)).toBeInTheDocument()
  })

  it('renders canvas element', () => {
    render(<ArchitectureVisualization />)

    const canvas = document.querySelector('canvas')
    expect(canvas).toBeInTheDocument()
    expect(canvas).toHaveAttribute('width', '520')
    expect(canvas).toHaveAttribute('height', '360')
  })

  it('renders node activity indicators', () => {
    render(<ArchitectureVisualization />)

    expect(screen.getByText('Node Activity')).toBeInTheDocument()

    // Check for some of the node labels
    expect(screen.getByText('Intake')).toBeInTheDocument()
    expect(screen.getByText('Validation')).toBeInTheDocument()
    expect(screen.getByText('Processing')).toBeInTheDocument()
  })
})
