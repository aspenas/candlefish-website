/**
 * Calculation Service
 * Integrates the painting calculator with the estimate data
 */

import { paintingCalculator, type Surface, type Room } from '@/lib/calculations/painting-calculator';
import { apiClient } from './api-client';

export interface EstimateData {
  exteriorMeasurements?: any[];
  interiorMeasurements?: any[];
  clientInfo?: any;
}

export interface CalculationResult {
  exterior: any;
  interior: any;
  totals: {
    laborHours: number;
    laborCost: number;
    materialCost: number;
    subtotal: number;
    tax: number;
    total: number;
  };
  pricingTiers: {
    good: any;
    better: any;
    best: any;
  };
  timeline: {
    days: number;
    weeks: number;
    calendarDays: number;
  };
}

class CalculationService {
  async calculateEstimate(estimateData: EstimateData): Promise<CalculationResult> {
    // Transform exterior measurements to Surface format
    const exteriorSurfaces: Surface[] = (estimateData.exteriorMeasurements || []).map(m => ({
      name: m.name || 'Surface',
      width: m.width || 0,
      height: m.height || 0,
      sqft: m.sqft || (m.width * m.height),
      condition: m.condition || 'good',
      substrate: m.substrate || 'wood-siding',
      coats: m.coats || 2
    }));

    // Transform interior measurements to Room format
    const interiorRooms: Room[] = (estimateData.interiorMeasurements || []).map(m => ({
      name: m.name || 'Room',
      walls: {
        width: m.width || 0,
        height: m.height || 0,
        sqft: m.wallSqft || ((m.width + m.length) * 2 * m.height)
      },
      ceiling: {
        width: m.width || 0,
        height: m.length || 0,
        sqft: m.ceilingSqft || (m.width * m.length)
      },
      trim: {
        linear_feet: m.trimLinearFeet || ((m.width + m.length) * 2 + (m.doors || 0) * 7 + (m.windows || 0) * 12)
      },
      doors: m.doors || 0,
      windows: m.windows || 0,
      cabinets: m.cabinets
    }));

    // Calculate exterior
    const exteriorCalc = exteriorSurfaces.length > 0
      ? paintingCalculator.calculateExterior(exteriorSurfaces)
      : { labor: { total: 0 }, materials: { total: 0 }, subtotal: 0, total: 0 };

    // Calculate interior
    const interiorCalc = interiorRooms.length > 0
      ? paintingCalculator.calculateInterior(interiorRooms)
      : { labor: { total: 0 }, materials: { total: 0 }, subtotal: 0, total: 0 };

    // Calculate totals
    const totalLabor = exteriorCalc.labor.total + interiorCalc.labor.total;
    const totalMaterials = exteriorCalc.materials.total + interiorCalc.materials.total;
    const subtotal = totalLabor + totalMaterials;
    const taxRate = 0.0875; // Colorado tax rate
    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    // Calculate pricing tiers
    const baseEstimate = {
      labor: {
        prep: {
          hours: (exteriorCalc.labor.prep?.hours || 0) + (interiorCalc.labor.prep?.hours || 0),
          rate: 65,
          total: (exteriorCalc.labor.prep?.total || 0) + (interiorCalc.labor.prep?.total || 0)
        },
        painting: {
          hours: (exteriorCalc.labor.painting?.hours || 0) + (interiorCalc.labor.painting?.hours || 0),
          rate: 65,
          total: (exteriorCalc.labor.painting?.total || 0) + (interiorCalc.labor.painting?.total || 0)
        },
        total: totalLabor
      },
      materials: {
        primer: {
          gallons: (exteriorCalc.materials.primer?.gallons || 0) + (interiorCalc.materials.primer?.gallons || 0),
          pricePerGallon: 45,
          total: (exteriorCalc.materials.primer?.total || 0) + (interiorCalc.materials.primer?.total || 0)
        },
        paint: {
          gallons: (exteriorCalc.materials.paint?.gallons || 0) + (interiorCalc.materials.paint?.gallons || 0),
          pricePerGallon: 55,
          total: (exteriorCalc.materials.paint?.total || 0) + (interiorCalc.materials.paint?.total || 0)
        },
        supplies: (exteriorCalc.materials.supplies || 0) + (interiorCalc.materials.supplies || 0),
        total: totalMaterials
      },
      subtotal,
      markup: 0,
      total: subtotal
    };

    const pricingTiers = paintingCalculator.calculatePricingTiers(baseEstimate);

    // Apply business rules to each tier
    const tiersWithRules = {
      good: paintingCalculator.applyBusinessRules(pricingTiers.good),
      better: paintingCalculator.applyBusinessRules(pricingTiers.better),
      best: paintingCalculator.applyBusinessRules(pricingTiers.best)
    };

    // Calculate timeline
    const totalHours = baseEstimate.labor.prep.hours + baseEstimate.labor.painting.hours;
    const timeline = paintingCalculator.calculateTimeline(totalHours, 3);

    return {
      exterior: exteriorCalc,
      interior: interiorCalc,
      totals: {
        laborHours: totalHours,
        laborCost: totalLabor,
        materialCost: totalMaterials,
        subtotal,
        tax,
        total
      },
      pricingTiers: tiersWithRules,
      timeline
    };
  }

  async saveEstimate(estimate: any): Promise<{ success: boolean; id: string }> {
    try {
      const response = await apiClient.saveEstimate(estimate);
      return response.data || { success: false, id: '' };
    } catch (error) {
      console.error('Failed to save estimate:', error);
      throw new Error('Failed to save estimate - backend API required for production');
    }
  }
}

export const calculationService = new CalculationService();
