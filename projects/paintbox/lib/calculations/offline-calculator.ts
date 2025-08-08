import Decimal from 'decimal.js';
import { offlineDB } from '@/lib/db/offline-db';
import { v4 as uuidv4 } from 'uuid';

// Configure Decimal for high precision financial calculations
Decimal.set({
  precision: 10,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -9,
  toExpPos: 21,
  maxE: 9e15,
  minE: -9e15
});

// Pricing constants (these would typically come from the server)
const PRICING_CONFIG = {
  materials: {
    primer: {
      basic: 28.50,
      premium: 42.75,
      specialty: 67.80
    },
    paint: {
      basic: 35.60,
      premium: 58.90,
      specialty: 89.40
    },
    supplies: {
      brushes: 12.50,
      rollers: 18.75,
      dropCloths: 8.90,
      tape: 6.25,
      sandpaper: 15.60
    }
  },
  labor: {
    prep: 45.50, // per hour
    painting: 52.75, // per hour
    cleanup: 38.20, // per hour
    travel: 25.00 // per hour
  },
  multipliers: {
    complexity: {
      simple: 1.0,
      moderate: 1.25,
      complex: 1.65,
      veryComplex: 2.1
    },
    urgency: {
      standard: 1.0,
      rushed: 1.35,
      emergency: 1.75
    },
    seasonality: {
      peak: 1.15,
      standard: 1.0,
      offSeason: 0.92
    }
  },
  coverage: {
    primer: 350, // sq ft per gallon
    paint: 400, // sq ft per gallon
    wastage: 0.1 // 10% wastage factor
  }
};

export interface CalculationInput {
  // Room measurements
  rooms: Array<{
    id: string;
    name: string;
    length: number;
    width: number;
    height: number;
    doors: number;
    windows: number;
    complexity: 'simple' | 'moderate' | 'complex' | 'veryComplex';
  }>;

  // Surface selections
  surfaces: Array<{
    roomId: string;
    type: 'walls' | 'ceiling' | 'trim' | 'doors' | 'windows';
    selected: boolean;
    condition: 'good' | 'fair' | 'poor';
  }>;

  // Material selections
  materials: {
    primerType: 'basic' | 'premium' | 'specialty';
    paintType: 'basic' | 'premium' | 'specialty';
    coats: number;
  };

  // Project details
  project: {
    urgency: 'standard' | 'rushed' | 'emergency';
    season: 'peak' | 'standard' | 'offSeason';
    discount: number; // percentage
  };
}

export interface CalculationResult {
  id: string;

  // Area calculations
  areas: {
    walls: number;
    ceiling: number;
    trim: number;
    doors: number;
    windows: number;
    total: number;
  };

  // Material calculations
  materials: {
    primer: {
      gallons: number;
      cost: number;
    };
    paint: {
      gallons: number;
      cost: number;
    };
    supplies: {
      items: Array<{ name: string; quantity: number; cost: number }>;
      totalCost: number;
    };
    totalCost: number;
  };

  // Labor calculations
  labor: {
    prep: { hours: number; cost: number };
    painting: { hours: number; cost: number };
    cleanup: { hours: number; cost: number };
    travel: { hours: number; cost: number };
    totalHours: number;
    totalCost: number;
  };

  // Final pricing
  pricing: {
    subtotal: number;
    complexity: { multiplier: number; amount: number };
    urgency: { multiplier: number; amount: number };
    seasonality: { multiplier: number; amount: number };
    discount: { percentage: number; amount: number };
    total: number;
  };

  // Good/Better/Best options
  options: {
    good: { materials: any; total: number };
    better: { materials: any; total: number };
    best: { materials: any; total: number };
  };

  calculatedAt: Date;
  cacheKey: string;
}

export class OfflineCalculator {
  private cache = new Map<string, CalculationResult>();

  /**
   * Calculate painting estimate with full breakdown
   */
  async calculate(input: CalculationInput): Promise<CalculationResult> {
    const calculationId = uuidv4();
    const cacheKey = this.generateCacheKey(input);

    try {
      // Check cache first
      const cachedResult = await this.getCachedCalculation(cacheKey);
      if (cachedResult) {
        console.log('OfflineCalculator: Using cached result');
        return cachedResult;
      }

      console.log('OfflineCalculator: Computing new calculation');

      // Calculate areas
      const areas = this.calculateAreas(input.rooms, input.surfaces);

      // Calculate materials
      const materials = this.calculateMaterials(areas, input.materials);

      // Calculate labor
      const labor = this.calculateLabor(areas, input.rooms, input.materials);

      // Calculate pricing with multipliers
      const pricing = this.calculatePricing(
        materials.totalCost + labor.totalCost,
        input.project,
        input.rooms
      );

      // Generate Good/Better/Best options
      const options = this.generateOptions(input, areas);

      const result: CalculationResult = {
        id: calculationId,
        areas,
        materials,
        labor,
        pricing,
        options,
        calculatedAt: new Date(),
        cacheKey
      };

      // Cache the result
      await this.cacheCalculation(cacheKey, input, result);

      return result;

    } catch (error) {
      console.error('OfflineCalculator: Calculation failed:', error);
      throw new Error(`Calculation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Calculate surface areas for all rooms
   */
  private calculateAreas(rooms: CalculationInput['rooms'], surfaces: CalculationInput['surfaces']): CalculationResult['areas'] {
    let totalWalls = 0;
    let totalCeiling = 0;
    let totalTrim = 0;
    let totalDoors = 0;
    let totalWindows = 0;

    for (const room of rooms) {
      const { length, width, height, doors, windows } = room;

      // Calculate perimeter and areas
      const perimeter = new Decimal(length).plus(width).times(2);
      const wallArea = perimeter.times(height);
      const ceilingArea = new Decimal(length).times(width);

      // Door and window areas to subtract
      const doorArea = new Decimal(doors).times(21); // 3' x 7' door = 21 sq ft
      const windowArea = new Decimal(windows).times(15); // Average window 15 sq ft

      // Net wall area (subtract doors and windows)
      const netWallArea = wallArea.minus(doorArea).minus(windowArea);

      // Trim calculations (perimeter of doors and windows)
      const doorTrim = new Decimal(doors).times(20); // 20 linear feet per door
      const windowTrim = new Decimal(windows).times(12); // 12 linear feet per window
      const totalTrimLength = doorTrim.plus(windowTrim);

      // Check which surfaces are selected for this room
      const roomSurfaces = surfaces.filter(s => s.roomId === room.id && s.selected);

      for (const surface of roomSurfaces) {
        switch (surface.type) {
          case 'walls':
            totalWalls = new Decimal(totalWalls).plus(netWallArea).toNumber();
            break;
          case 'ceiling':
            totalCeiling = new Decimal(totalCeiling).plus(ceilingArea).toNumber();
            break;
          case 'trim':
            totalTrim = new Decimal(totalTrim).plus(totalTrimLength).toNumber();
            break;
          case 'doors':
            totalDoors = new Decimal(totalDoors).plus(doorArea).toNumber();
            break;
          case 'windows':
            totalWindows = new Decimal(totalWindows).plus(windowArea).toNumber();
            break;
        }
      }
    }

    const total = new Decimal(totalWalls)
      .plus(totalCeiling)
      .plus(totalTrim)
      .plus(totalDoors)
      .plus(totalWindows)
      .toNumber();

    return {
      walls: Math.round(totalWalls),
      ceiling: Math.round(totalCeiling),
      trim: Math.round(totalTrim),
      doors: Math.round(totalDoors),
      windows: Math.round(totalWindows),
      total: Math.round(total)
    };
  }

  /**
   * Calculate material requirements and costs
   */
  private calculateMaterials(areas: CalculationResult['areas'], materials: CalculationInput['materials']): CalculationResult['materials'] {
    const { primerType, paintType, coats } = materials;

    // Calculate paint coverage area (primer + paint coats)
    const totalPaintArea = new Decimal(areas.total).times(coats);
    const totalPrimerArea = new Decimal(areas.total); // Primer always 1 coat

    // Account for wastage
    const wastageMultiplier = new Decimal(1).plus(PRICING_CONFIG.coverage.wastage);

    // Calculate gallons needed
    const primerGallons = totalPrimerArea
      .times(wastageMultiplier)
      .div(PRICING_CONFIG.coverage.primer)
      .ceil()
      .toNumber();

    const paintGallons = totalPaintArea
      .times(wastageMultiplier)
      .div(PRICING_CONFIG.coverage.paint)
      .ceil()
      .toNumber();

    // Calculate costs
    const primerCost = new Decimal(primerGallons)
      .times(PRICING_CONFIG.materials.primer[primerType])
      .toNumber();

    const paintCost = new Decimal(paintGallons)
      .times(PRICING_CONFIG.materials.paint[paintType])
      .toNumber();

    // Calculate supplies based on project size
    const supplies = this.calculateSupplies(areas.total);
    const supplyCost = supplies.reduce((total, item) =>
      new Decimal(total).plus(item.cost).toNumber(), 0
    );

    const totalCost = new Decimal(primerCost).plus(paintCost).plus(supplyCost).toNumber();

    return {
      primer: {
        gallons: primerGallons,
        cost: Math.round(primerCost * 100) / 100
      },
      paint: {
        gallons: paintGallons,
        cost: Math.round(paintCost * 100) / 100
      },
      supplies: {
        items: supplies,
        totalCost: Math.round(supplyCost * 100) / 100
      },
      totalCost: Math.round(totalCost * 100) / 100
    };
  }

  /**
   * Calculate supply requirements
   */
  private calculateSupplies(totalArea: number): Array<{ name: string; quantity: number; cost: number }> {
    const supplies = [];

    // Brushes (1 set per 1000 sq ft)
    const brushSets = Math.max(1, Math.ceil(totalArea / 1000));
    supplies.push({
      name: 'Brush Set',
      quantity: brushSets,
      cost: new Decimal(brushSets).times(PRICING_CONFIG.materials.supplies.brushes).toNumber()
    });

    // Rollers (1 set per 500 sq ft)
    const rollerSets = Math.max(1, Math.ceil(totalArea / 500));
    supplies.push({
      name: 'Roller Set',
      quantity: rollerSets,
      cost: new Decimal(rollerSets).times(PRICING_CONFIG.materials.supplies.rollers).toNumber()
    });

    // Drop cloths (1 per 300 sq ft)
    const dropCloths = Math.max(1, Math.ceil(totalArea / 300));
    supplies.push({
      name: 'Drop Cloths',
      quantity: dropCloths,
      cost: new Decimal(dropCloths).times(PRICING_CONFIG.materials.supplies.dropCloths).toNumber()
    });

    // Tape (1 roll per 200 sq ft)
    const tapeRolls = Math.max(1, Math.ceil(totalArea / 200));
    supplies.push({
      name: 'Painter\'s Tape',
      quantity: tapeRolls,
      cost: new Decimal(tapeRolls).times(PRICING_CONFIG.materials.supplies.tape).toNumber()
    });

    // Sandpaper (1 pack per 400 sq ft for poor condition surfaces)
    const sandpaperPacks = Math.max(1, Math.ceil(totalArea / 400));
    supplies.push({
      name: 'Sandpaper',
      quantity: sandpaperPacks,
      cost: new Decimal(sandpaperPacks).times(PRICING_CONFIG.materials.supplies.sandpaper).toNumber()
    });

    return supplies;
  }

  /**
   * Calculate labor hours and costs
   */
  private calculateLabor(areas: CalculationResult['areas'], rooms: CalculationInput['rooms'], materials: CalculationInput['materials']): CalculationResult['labor'] {
    const totalArea = areas.total;

    // Base labor rates (sq ft per hour)
    const prepRate = 120; // sq ft per hour for prep
    const paintRate = 180; // sq ft per hour for painting
    const cleanupRate = 300; // sq ft per hour for cleanup

    // Calculate complexity multiplier
    const avgComplexity = this.calculateAverageComplexity(rooms);
    const complexityMultiplier = PRICING_CONFIG.multipliers.complexity[avgComplexity];

    // Calculate hours
    const prepHours = new Decimal(totalArea)
      .div(prepRate)
      .times(complexityMultiplier)
      .toNumber();

    const paintHours = new Decimal(totalArea)
      .div(paintRate)
      .times(materials.coats)
      .times(complexityMultiplier)
      .toNumber();

    const cleanupHours = new Decimal(totalArea)
      .div(cleanupRate)
      .toNumber();

    // Travel time (2 hours standard)
    const travelHours = 2;

    // Calculate costs
    const prepCost = new Decimal(prepHours).times(PRICING_CONFIG.labor.prep).toNumber();
    const paintCost = new Decimal(paintHours).times(PRICING_CONFIG.labor.painting).toNumber();
    const cleanupCost = new Decimal(cleanupHours).times(PRICING_CONFIG.labor.cleanup).toNumber();
    const travelCost = new Decimal(travelHours).times(PRICING_CONFIG.labor.travel).toNumber();

    const totalHours = new Decimal(prepHours).plus(paintHours).plus(cleanupHours).plus(travelHours).toNumber();
    const totalCost = new Decimal(prepCost).plus(paintCost).plus(cleanupCost).plus(travelCost).toNumber();

    return {
      prep: {
        hours: Math.round(prepHours * 10) / 10,
        cost: Math.round(prepCost * 100) / 100
      },
      painting: {
        hours: Math.round(paintHours * 10) / 10,
        cost: Math.round(paintCost * 100) / 100
      },
      cleanup: {
        hours: Math.round(cleanupHours * 10) / 10,
        cost: Math.round(cleanupCost * 100) / 100
      },
      travel: {
        hours: Math.round(travelHours * 10) / 10,
        cost: Math.round(travelCost * 100) / 100
      },
      totalHours: Math.round(totalHours * 10) / 10,
      totalCost: Math.round(totalCost * 100) / 100
    };
  }

  /**
   * Calculate final pricing with multipliers
   */
  private calculatePricing(
    subtotal: number,
    project: CalculationInput['project'],
    rooms: CalculationInput['rooms']
  ): CalculationResult['pricing'] {
    const avgComplexity = this.calculateAverageComplexity(rooms);

    // Get multipliers
    const complexityMultiplier = PRICING_CONFIG.multipliers.complexity[avgComplexity];
    const urgencyMultiplier = PRICING_CONFIG.multipliers.urgency[project.urgency];
    const seasonalityMultiplier = PRICING_CONFIG.multipliers.seasonality[project.season];

    // Calculate adjustments
    const complexityAmount = new Decimal(subtotal).times(complexityMultiplier - 1).toNumber();
    const urgencyAmount = new Decimal(subtotal).times(urgencyMultiplier - 1).toNumber();
    const seasonalityAmount = new Decimal(subtotal).times(seasonalityMultiplier - 1).toNumber();

    // Calculate total before discount
    const beforeDiscount = new Decimal(subtotal)
      .plus(complexityAmount)
      .plus(urgencyAmount)
      .plus(seasonalityAmount)
      .toNumber();

    // Apply discount
    const discountAmount = new Decimal(beforeDiscount).times(project.discount / 100).toNumber();
    const total = new Decimal(beforeDiscount).minus(discountAmount).toNumber();

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      complexity: {
        multiplier: complexityMultiplier,
        amount: Math.round(complexityAmount * 100) / 100
      },
      urgency: {
        multiplier: urgencyMultiplier,
        amount: Math.round(urgencyAmount * 100) / 100
      },
      seasonality: {
        multiplier: seasonalityMultiplier,
        amount: Math.round(seasonalityAmount * 100) / 100
      },
      discount: {
        percentage: project.discount,
        amount: Math.round(discountAmount * 100) / 100
      },
      total: Math.round(total * 100) / 100
    };
  }

  /**
   * Generate Good/Better/Best pricing options
   */
  private generateOptions(input: CalculationInput, areas: CalculationResult['areas']): CalculationResult['options'] {
    // Good option - basic materials, standard timeline
    const goodInput = {
      ...input,
      materials: {
        primerType: 'basic' as const,
        paintType: 'basic' as const,
        coats: 1
      },
      project: {
        ...input.project,
        urgency: 'standard' as const
      }
    };

    // Better option - premium materials, 2 coats
    const betterInput = {
      ...input,
      materials: {
        primerType: 'premium' as const,
        paintType: 'premium' as const,
        coats: 2
      }
    };

    // Best option - specialty materials, 2 coats, premium service
    const bestInput = {
      ...input,
      materials: {
        primerType: 'specialty' as const,
        paintType: 'specialty' as const,
        coats: 2
      }
    };

    // Calculate each option
    const goodMaterials = this.calculateMaterials(areas, goodInput.materials);
    const betterMaterials = this.calculateMaterials(areas, betterInput.materials);
    const bestMaterials = this.calculateMaterials(areas, bestInput.materials);

    const goodLabor = this.calculateLabor(areas, input.rooms, goodInput.materials);
    const betterLabor = this.calculateLabor(areas, input.rooms, betterInput.materials);
    const bestLabor = this.calculateLabor(areas, input.rooms, bestInput.materials);

    const goodPricing = this.calculatePricing(
      goodMaterials.totalCost + goodLabor.totalCost,
      goodInput.project,
      input.rooms
    );
    const betterPricing = this.calculatePricing(
      betterMaterials.totalCost + betterLabor.totalCost,
      betterInput.project,
      input.rooms
    );
    const bestPricing = this.calculatePricing(
      bestMaterials.totalCost + bestLabor.totalCost,
      bestInput.project,
      input.rooms
    );

    return {
      good: {
        materials: goodMaterials,
        total: goodPricing.total
      },
      better: {
        materials: betterMaterials,
        total: betterPricing.total
      },
      best: {
        materials: bestMaterials,
        total: bestPricing.total
      }
    };
  }

  /**
   * Calculate average complexity across all rooms
   */
  private calculateAverageComplexity(rooms: CalculationInput['rooms']): 'simple' | 'moderate' | 'complex' | 'veryComplex' {
    const complexityScores = {
      simple: 1,
      moderate: 2,
      complex: 3,
      veryComplex: 4
    };

    const avgScore = rooms.reduce((sum, room) =>
      sum + complexityScores[room.complexity], 0
    ) / rooms.length;

    if (avgScore <= 1.5) return 'simple';
    if (avgScore <= 2.5) return 'moderate';
    if (avgScore <= 3.5) return 'complex';
    return 'veryComplex';
  }

  /**
   * Generate cache key for calculation
   */
  private generateCacheKey(input: CalculationInput): string {
    const normalizedInput = {
      rooms: input.rooms.sort((a, b) => a.id.localeCompare(b.id)),
      surfaces: input.surfaces.sort((a, b) => a.roomId.localeCompare(b.roomId) || a.type.localeCompare(b.type)),
      materials: input.materials,
      project: input.project
    };

    return btoa(JSON.stringify(normalizedInput)).slice(0, 32);
  }

  /**
   * Cache calculation result
   */
  private async cacheCalculation(cacheKey: string, input: CalculationInput, result: CalculationResult): Promise<void> {
    try {
      // Store in IndexedDB
      await offlineDB.cacheCalculation(cacheKey, input, result, 30); // 30 minutes TTL

      // Store in memory cache
      this.cache.set(cacheKey, result);

      // Limit memory cache size
      if (this.cache.size > 100) {
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }
    } catch (error) {
      console.error('Failed to cache calculation:', error);
    }
  }

  /**
   * Get cached calculation result
   */
  private async getCachedCalculation(cacheKey: string): Promise<CalculationResult | null> {
    try {
      // Check memory cache first
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey)!;
      }

      // Check IndexedDB
      const cached = await offlineDB.getCachedCalculation(cacheKey);
      if (cached) {
        // Store in memory cache
        this.cache.set(cacheKey, cached.result);
        return cached.result;
      }

      return null;
    } catch (error) {
      console.error('Failed to get cached calculation:', error);
      return null;
    }
  }

  /**
   * Clear calculation cache
   */
  async clearCache(): Promise<void> {
    this.cache.clear();

    try {
      // Clear IndexedDB cache (expired items will be cleaned automatically)
      const now = new Date();
      await offlineDB.calculations.where('expiresAt').below(now).delete();
    } catch (error) {
      console.error('Failed to clear calculation cache:', error);
    }
  }
}

// Export singleton instance
export const offlineCalculator = new OfflineCalculator();
