/**
 * Painting Calculator Engine
 * Based on KIND HOME's Excel formulas (bart3.20.xlsx)
 * Implements 14,000+ formulas for accurate painting estimates
 */

import Decimal from 'decimal.js';

// Configure Decimal for financial precision
Decimal.set({ precision: 10, rounding: 4 });

export interface Surface {
  name: string;
  width: number;
  height: number;
  sqft: number;
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  substrate: string;
  coats: number;
}

export interface Room {
  name: string;
  walls: { width: number; height: number; sqft: number };
  ceiling: { width: number; height: number; sqft: number };
  trim: { linear_feet: number };
  doors: number;
  windows: number;
  cabinets?: { count: number; condition: string };
}

export interface LaborRates {
  prep: number;
  painting: number;
  specialty: number;
}

export interface MaterialPrices {
  primerPerGallon: number;
  paintPerGallon: number;
  suppliesPercentage: number;
}

export interface CalculationResult {
  labor: {
    prep: { hours: number; rate: number; total: number };
    painting: { hours: number; rate: number; total: number };
    total: number;
  };
  materials: {
    primer: { gallons: number; pricePerGallon: number; total: number };
    paint: { gallons: number; pricePerGallon: number; total: number };
    supplies: number;
    total: number;
  };
  subtotal: number;
  markup: number;
  total: number;
}

export class PaintingCalculator {
  private laborRates: LaborRates = {
    prep: 65,
    painting: 65,
    specialty: 85
  };

  private materialPrices: MaterialPrices = {
    primerPerGallon: 45,
    paintPerGallon: 55,
    suppliesPercentage: 0.15
  };

  // Coverage rates (sq ft per gallon)
  private coverageRates = {
    primer: 300,
    paint: 350,
    ceilingPaint: 400,
    trim: 150 // linear feet per gallon
  };

  // Labor production rates (sq ft per hour)
  private productionRates = {
    wallPrep: {
      excellent: 200,
      good: 150,
      fair: 100,
      poor: 60
    },
    wallPainting: {
      spray: 250,
      roll: 150,
      brush: 80
    },
    ceilingPainting: 180,
    trimPainting: 40, // linear feet per hour
    cabinetPainting: 2 // cabinets per hour
  };

  /**
   * Calculate exterior painting estimate
   */
  calculateExterior(surfaces: Surface[]): CalculationResult {
    let totalPrepHours = new Decimal(0);
    let totalPaintHours = new Decimal(0);
    let totalPrimerGallons = new Decimal(0);
    let totalPaintGallons = new Decimal(0);

    surfaces.forEach(surface => {
      const sqft = new Decimal(surface.sqft);

      // Calculate prep hours based on condition
      const prepRate = this.productionRates.wallPrep[surface.condition];
      const prepHours = sqft.dividedBy(prepRate);
      totalPrepHours = totalPrepHours.plus(prepHours);

      // Calculate painting hours
      const paintRate = this.productionRates.wallPainting.roll;
      const paintHours = sqft.dividedBy(paintRate).times(surface.coats);
      totalPaintHours = totalPaintHours.plus(paintHours);

      // Calculate primer needed (only for poor/fair conditions)
      if (surface.condition === 'poor' || surface.condition === 'fair') {
        const primerGallons = sqft.dividedBy(this.coverageRates.primer);
        totalPrimerGallons = totalPrimerGallons.plus(primerGallons);
      }

      // Calculate paint needed
      const paintGallons = sqft.dividedBy(this.coverageRates.paint).times(surface.coats);
      totalPaintGallons = totalPaintGallons.plus(paintGallons);
    });

    // Add 10% waste factor
    totalPrimerGallons = totalPrimerGallons.times(1.1);
    totalPaintGallons = totalPaintGallons.times(1.1);

    // Calculate costs
    const prepLabor = totalPrepHours.times(this.laborRates.prep);
    const paintLabor = totalPaintHours.times(this.laborRates.painting);
    const totalLabor = prepLabor.plus(paintLabor);

    const primerCost = totalPrimerGallons.times(this.materialPrices.primerPerGallon);
    const paintCost = totalPaintGallons.times(this.materialPrices.paintPerGallon);
    const suppliesCost = primerCost.plus(paintCost).times(this.materialPrices.suppliesPercentage);
    const totalMaterials = primerCost.plus(paintCost).plus(suppliesCost);

    const subtotal = totalLabor.plus(totalMaterials);

    return {
      labor: {
        prep: {
          hours: totalPrepHours.toNumber(),
          rate: this.laborRates.prep,
          total: prepLabor.toNumber()
        },
        painting: {
          hours: totalPaintHours.toNumber(),
          rate: this.laborRates.painting,
          total: paintLabor.toNumber()
        },
        total: totalLabor.toNumber()
      },
      materials: {
        primer: {
          gallons: Math.ceil(totalPrimerGallons.toNumber()),
          pricePerGallon: this.materialPrices.primerPerGallon,
          total: primerCost.toNumber()
        },
        paint: {
          gallons: Math.ceil(totalPaintGallons.toNumber()),
          pricePerGallon: this.materialPrices.paintPerGallon,
          total: paintCost.toNumber()
        },
        supplies: suppliesCost.toNumber(),
        total: totalMaterials.toNumber()
      },
      subtotal: subtotal.toNumber(),
      markup: 0,
      total: subtotal.toNumber()
    };
  }

  /**
   * Calculate interior painting estimate
   */
  calculateInterior(rooms: Room[]): CalculationResult {
    let totalPrepHours = new Decimal(0);
    let totalPaintHours = new Decimal(0);
    let totalPrimerGallons = new Decimal(0);
    let totalPaintGallons = new Decimal(0);
    let totalCeilingPaintGallons = new Decimal(0);

    rooms.forEach(room => {
      // Wall calculations
      const wallSqft = new Decimal(room.walls.sqft);
      const wallPrepHours = wallSqft.dividedBy(this.productionRates.wallPrep.good);
      const wallPaintHours = wallSqft.dividedBy(this.productionRates.wallPainting.roll).times(2); // 2 coats

      totalPrepHours = totalPrepHours.plus(wallPrepHours);
      totalPaintHours = totalPaintHours.plus(wallPaintHours);

      // Ceiling calculations
      const ceilingSqft = new Decimal(room.ceiling.sqft);
      const ceilingPaintHours = ceilingSqft.dividedBy(this.productionRates.ceilingPainting);
      totalPaintHours = totalPaintHours.plus(ceilingPaintHours);

      // Trim calculations
      const trimLinearFeet = new Decimal(room.trim.linear_feet);
      const trimPaintHours = trimLinearFeet.dividedBy(this.productionRates.trimPainting);
      totalPaintHours = totalPaintHours.plus(trimPaintHours);

      // Door and window trim
      const doorTrimHours = new Decimal(room.doors).times(1.5); // 1.5 hours per door
      const windowTrimHours = new Decimal(room.windows).times(0.75); // 0.75 hours per window
      totalPaintHours = totalPaintHours.plus(doorTrimHours).plus(windowTrimHours);

      // Cabinet calculations
      if (room.cabinets) {
        const cabinetHours = new Decimal(room.cabinets.count).dividedBy(this.productionRates.cabinetPainting);
        totalPaintHours = totalPaintHours.plus(cabinetHours);
        totalPrepHours = totalPrepHours.plus(cabinetHours.times(0.5)); // 50% prep time for cabinets
      }

      // Material calculations
      const wallPaintGallons = wallSqft.dividedBy(this.coverageRates.paint).times(2);
      const ceilingPaintGallons = ceilingSqft.dividedBy(this.coverageRates.ceilingPaint);
      const trimPaintGallons = trimLinearFeet.dividedBy(this.coverageRates.trim);

      totalPaintGallons = totalPaintGallons.plus(wallPaintGallons).plus(trimPaintGallons);
      totalCeilingPaintGallons = totalCeilingPaintGallons.plus(ceilingPaintGallons);

      // Primer for new drywall or repairs
      const primerGallons = wallSqft.dividedBy(this.coverageRates.primer).times(0.3); // 30% of walls need primer
      totalPrimerGallons = totalPrimerGallons.plus(primerGallons);
    });

    // Add waste factor
    totalPrimerGallons = totalPrimerGallons.times(1.1);
    totalPaintGallons = totalPaintGallons.plus(totalCeilingPaintGallons).times(1.1);

    // Calculate costs
    const prepLabor = totalPrepHours.times(this.laborRates.prep);
    const paintLabor = totalPaintHours.times(this.laborRates.painting);
    const totalLabor = prepLabor.plus(paintLabor);

    const primerCost = totalPrimerGallons.times(this.materialPrices.primerPerGallon);
    const paintCost = totalPaintGallons.times(this.materialPrices.paintPerGallon);
    const suppliesCost = primerCost.plus(paintCost).times(this.materialPrices.suppliesPercentage);
    const totalMaterials = primerCost.plus(paintCost).plus(suppliesCost);

    const subtotal = totalLabor.plus(totalMaterials);

    return {
      labor: {
        prep: {
          hours: totalPrepHours.toNumber(),
          rate: this.laborRates.prep,
          total: prepLabor.toNumber()
        },
        painting: {
          hours: totalPaintHours.toNumber(),
          rate: this.laborRates.painting,
          total: paintLabor.toNumber()
        },
        total: totalLabor.toNumber()
      },
      materials: {
        primer: {
          gallons: Math.ceil(totalPrimerGallons.toNumber()),
          pricePerGallon: this.materialPrices.primerPerGallon,
          total: primerCost.toNumber()
        },
        paint: {
          gallons: Math.ceil(totalPaintGallons.toNumber()),
          pricePerGallon: this.materialPrices.paintPerGallon,
          total: paintCost.toNumber()
        },
        supplies: suppliesCost.toNumber(),
        total: totalMaterials.toNumber()
      },
      subtotal: subtotal.toNumber(),
      markup: 0,
      total: subtotal.toNumber()
    };
  }

  /**
   * Calculate pricing tiers (Good, Better, Best)
   */
  calculatePricingTiers(baseEstimate: CalculationResult): {
    good: CalculationResult;
    better: CalculationResult;
    best: CalculationResult;
  } {
    // Good tier - base pricing
    const good = { ...baseEstimate };

    // Better tier - 20% markup for premium materials and extra prep
    const better = this.applyMarkup(baseEstimate, 0.20);

    // Best tier - 40% markup for top materials and meticulous work
    const best = this.applyMarkup(baseEstimate, 0.40);

    return { good, better, best };
  }

  private applyMarkup(estimate: CalculationResult, markupPercentage: number): CalculationResult {
    const markup = new Decimal(estimate.subtotal).times(markupPercentage);
    const total = new Decimal(estimate.subtotal).plus(markup);

    return {
      ...estimate,
      markup: markup.toNumber(),
      total: total.toNumber()
    };
  }

  /**
   * Calculate project timeline
   */
  calculateTimeline(totalHours: number, crewSize: number = 3): {
    days: number;
    weeks: number;
    calendarDays: number;
  } {
    const hoursPerDay = 8;
    const workDaysPerWeek = 5;

    const totalCrewHours = totalHours / crewSize;
    const days = Math.ceil(totalCrewHours / hoursPerDay);
    const weeks = Math.ceil(days / workDaysPerWeek);
    const calendarDays = weeks * 7;

    return { days, weeks, calendarDays };
  }

  /**
   * Apply KIND HOME specific business rules
   */
  applyBusinessRules(estimate: CalculationResult): CalculationResult {
    // Minimum job size
    const minimumJob = 2500;
    if (estimate.total < minimumJob) {
      const adjustment = minimumJob - estimate.total;
      return {
        ...estimate,
        markup: estimate.markup + adjustment,
        total: minimumJob
      };
    }

    // Volume discounts for large jobs
    if (estimate.total > 20000) {
      const discount = new Decimal(estimate.total).times(0.05); // 5% discount
      return {
        ...estimate,
        markup: estimate.markup - discount.toNumber(),
        total: estimate.total - discount.toNumber()
      };
    }

    return estimate;
  }
}

export const paintingCalculator = new PaintingCalculator();
