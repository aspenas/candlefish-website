# Units, Rounding, and Coverage Policies - Paintbox Excel Formula Engine

## Executive Summary

This document establishes the normative policies for units of measurement, rounding behaviors, and test coverage requirements for the Paintbox Excel Formula Engine. These policies ensure consistency with the original BART 3.20 Excel workbook and maintain financial accuracy for painting estimates.

## 1. Units of Measurement Standards

### 1.1 Primary Measurement Units

Based on analysis of the BART 3.20 workbook, the following units are standardized:

#### **Linear Measurements**
- **Primary Unit**: Feet (decimal notation)
- **Precision**: 2 decimal places (0.01 ft)
- **Range**: 0.01 - 999.99 feet
- **Examples**: 
  - Wall width: 24.50 ft
  - Room height: 9.25 ft
  - Trim length: 156.75 ft

#### **Area Measurements**  
- **Primary Unit**: Square Feet (sq ft)
- **Precision**: 2 decimal places (0.01 sq ft)
- **Range**: 0.01 - 99,999.99 sq ft
- **Calculation**: Length × Width (both in feet)
- **Examples**:
  - Wall area: 294.75 sq ft
  - Ceiling area: 168.50 sq ft
  - Total surface: 2,847.25 sq ft

#### **Volume Measurements**
- **Paint**: Gallons (decimal notation)
- **Precision**: 2 decimal places for calculations, rounded up for ordering
- **Range**: 0.01 - 999.99 gallons
- **Examples**:
  - Calculated: 23.47 gallons
  - Ordered: 24 gallons (ceiling)

#### **Time Measurements**
- **Labor Hours**: Decimal hours
- **Precision**: 2 decimal places (0.01 hours = 0.6 minutes)
- **Range**: 0.01 - 9,999.99 hours
- **Examples**:
  - Prep time: 47.25 hours
  - Paint time: 156.75 hours
  - Total project: 847.50 hours

#### **Currency Measurements**
- **Primary Unit**: US Dollars (USD)
- **Precision**: 2 decimal places (cents)
- **Range**: $0.01 - $999,999.99
- **Format**: $12,345.67
- **Examples**:
  - Labor cost: $55,087.50
  - Material cost: $8,247.25
  - Total estimate: $75,842.95

### 1.2 Unit Conversion Standards

#### **Imperial to Decimal Feet**
```typescript
// Standard conversions used in BART workbook
const conversions = {
  inchesToFeet: (inches: number) => inches / 12,
  feetAndInchesToFeet: (feet: number, inches: number) => feet + (inches / 12),
  
  // Examples from workbook:
  // 8' 6" = 8.50 ft
  // 12' 3" = 12.25 ft
  // 24' 9" = 24.75 ft
};
```

#### **Coverage Rate Standards**
Based on BART workbook analysis:

```typescript
const coverageRates = {
  // Paint coverage (sq ft per gallon)
  primer: 300,        // Primer on raw surfaces
  paint: 350,         // Standard wall paint
  ceilingPaint: 400,  // Ceiling-specific paint
  trim: 150,          // Linear feet per gallon for trim
  
  // Specialty coatings
  stain: 250,         // Wood stain coverage
  sealant: 200,       // Protective sealants
  texture: 100        // Textured finishes
};
```

### 1.3 Measurement Validation Rules

#### **Input Validation**
- All measurements must be positive numbers
- Maximum precision: 2 decimal places
- Minimum values: 0.01 for all unit types
- Maximum room dimensions: 100 ft × 100 ft × 20 ft height

#### **Consistency Checks**
- Total area ≤ (Length × Width × 4) + (Length × Width) for rooms
- Paint quantity ≥ (Total Area ÷ Coverage Rate)
- Labor hours ≥ (Total Area ÷ Production Rate)

## 2. Rounding Policies

### 2.1 Excel-Compatible Rounding

**Standard**: All rounding follows Excel ROUND_HALF_UP behavior.

```typescript
// Decimal.js configuration for Excel compatibility
Decimal.set({
  precision: 15,
  rounding: Decimal.ROUND_HALF_UP,  // 0.5 always rounds up
  toExpNeg: -7,
  toExpPos: 21
});
```

### 2.2 Category-Specific Rounding

#### **Financial Calculations**
- **Currency**: Always round to 2 decimal places
- **Method**: ROUND_HALF_UP (banker's rounding)
- **Examples**:
  ```typescript
  12.345 → 12.35  // 0.5 rounds up
  12.344 → 12.34  // <0.5 rounds down
  12.346 → 12.35  // >0.5 rounds up
  ```

#### **Measurement Calculations**  
- **Area**: 2 decimal places for calculations, displayed as needed
- **Linear**: 2 decimal places
- **Examples**:
  ```typescript
  // Room calculation: 12.3456 × 9.8765
  const area = new Decimal(12.3456).times(9.8765).toDecimalPlaces(2);
  // Result: 121.93 sq ft
  ```

#### **Material Quantities**
- **Paint**: Calculate to 2 decimals, round UP to next gallon for ordering
- **Labor**: Calculate to 2 decimals, round to nearest 0.25 hours for scheduling
- **Examples**:
  ```typescript
  // Paint calculation
  const calculated = 23.47; // gallons
  const ordered = Math.ceil(calculated); // 24 gallons
  
  // Labor scheduling  
  const calculated = 47.23; // hours
  const scheduled = Math.round(calculated * 4) / 4; // 47.25 hours
  ```

#### **Production Rates**
- **Labor Production**: Calculate to 2 decimals
- **Coverage Rates**: Use whole numbers (standard industry rates)
- **Waste Factors**: Calculate to 3 decimals, apply to 2 decimal results

### 2.3 Rounding Consistency Rules

#### **Calculation Chain Rounding**
- Intermediate calculations maintain full precision
- Only final results rounded for display/storage
- Error accumulation minimized through proper order of operations

```typescript
// CORRECT: Maintain precision through calculation
const length = new Decimal(24.567);
const width = new Decimal(12.234);
const height = new Decimal(9.125);

const wallArea = length.plus(width).times(2).times(height);
const ceilingArea = length.times(width);
const totalArea = wallArea.plus(ceilingArea);

// Only round final result
const finalArea = totalArea.toDecimalPlaces(2);

// INCORRECT: Round intermediate values
const wallAreaRounded = Math.round(wallArea * 100) / 100; // Loses precision
```

### 2.4 Error Tolerance

#### **Precision Tolerances**
- **Financial**: ±$0.01 (one cent)
- **Area**: ±0.01 sq ft  
- **Linear**: ±0.01 ft
- **Volume**: ±0.01 gallons
- **Time**: ±0.01 hours

#### **Excel Parity Tolerance**
- **Numeric Results**: ±1e-10 (Excel floating point precision)
- **Currency Results**: ±$0.01
- **Boolean Results**: Exact match required
- **Text Results**: Exact match required

## 3. Test Coverage Policies

### 3.1 Coverage Requirements by Component

#### **Formula Engine Core** - Target: 95%
- Formula parsing and execution
- Error handling and propagation  
- Dependency resolution
- Calculation ordering

#### **Excel Functions** - Target: 90%
- All implemented Excel functions
- Parameter validation
- Error case handling
- Type conversion

#### **Calculation Services** - Target: 85%
- Painting calculator algorithms
- Material quantity calculations
- Labor hour estimations
- Pricing tier calculations

#### **Integration Layer** - Target: 80%
- BART workbook integration
- Real-time calculation updates
- Caching and performance
- Error recovery

### 3.2 Test Categories and Requirements

#### **Unit Tests** ✅ **Implemented**
- **Files Created**:
  - `/lib/calculations/__tests__/formula-precision.test.ts`
  - `/lib/calculations/__tests__/excel-parity.test.ts`
- **Coverage**: Individual function and method testing
- **Requirements**: All public methods, error conditions, edge cases

#### **Integration Tests** 🔄 **Partial**
- **Excel Parity**: Compare results with original BART workbook
- **Cross-Component**: Validate consistency between calculators
- **Performance**: Ensure calculation speed requirements
- **Memory**: Monitor resource usage patterns

#### **Property-Based Tests** 📋 **Planned**
- **Random Input Generation**: Test with varied but valid inputs
- **Invariant Checking**: Verify mathematical properties hold
- **Boundary Condition Testing**: Edge cases and limits

#### **Regression Tests** 📋 **Needed**
- **Golden Master**: Known good results from Excel
- **Historical Data**: Past estimate calculations
- **Bug Reproduction**: Tests for each fixed issue

### 3.3 Specific Test Scenarios

#### **Real Formula Tests** (from BART workbook)
```typescript
const realFormulaTests = [
  {
    description: "Client info reference",
    cell: "Ext Measure!B4",
    formula: "='New Client Info Page'!A2",
    setup: { "'New Client Info Page'!A2": "John Smith Construction" },
    expected: "John Smith Construction"
  },
  {
    description: "Nested IF surface type logic", 
    cell: "Ext Measure!L50",
    formula: "=IF(D50=\"Brick Unpainted\", \"Brick Unpainted\",IF(D50=\"Stucco\",\"Flat\",IF(D50=\"Cedar_Stain\",\"Stain\",\"Body\")))",
    setup: { "D50": "Stucco" },
    expected: "Flat"
  },
  {
    description: "Range SUM calculation",
    cell: "Exterior Formula Sheet!P143", 
    formula: "=SUM(P138:Q142)",
    setup: {
      "P138": 1250.50, "Q138": 300.50,
      "P139": 875.25,  "Q139": 175.25,
      "P140": 2100.75, "Q140": 500.75,
      "P141": 650.00,  "Q141": 150.00,
      "P142": 425.30,  "Q142": 95.30
    },
    expected: 6523.10
  }
];
```

#### **Precision Tests**
```typescript
const precisionTests = [
  {
    description: "Currency precision maintenance",
    inputs: { labor: 847.5, rate: 65.00 },
    calculation: "labor * rate",
    expected: 55087.50,
    tolerance: 0.01
  },
  {
    description: "Material calculation precision",
    inputs: { gallons: 23.47, price: 47.95 },
    calculation: "gallons * price", 
    expected: 1125.37,
    tolerance: 0.01
  },
  {
    description: "Complex estimate calculation",
    inputs: { subtotal: 12500.00, markup: 0.25, tax: 0.0875 },
    calculation: "(subtotal * (1 + markup)) * (1 + tax)",
    expected: 16992.19,
    tolerance: 0.01
  }
];
```

#### **Performance Benchmarks**
```typescript
const performanceTargets = {
  singleFormula: 1,      // ms
  complexFormula: 10,    // ms  
  fullRecalc: 5000,      // ms (14,683 formulas)
  incrementalUpdate: 100, // ms
  memoryUsage: 100       // MB for full workbook
};
```

### 3.4 Continuous Testing Strategy

#### **Pre-commit Hooks**
- Run precision tests
- Validate Excel parity on core formulas
- Check code coverage thresholds
- Verify no precision configuration changes

#### **CI/CD Pipeline**
- Full test suite execution
- Performance regression detection
- Memory leak monitoring
- Excel workbook comparison

#### **Production Monitoring**
- Calculate estimate accuracy vs historical data
- Monitor calculation performance
- Track precision drift over time
- Alert on calculation failures

## 4. Quality Assurance Policies

### 4.1 Code Review Requirements

#### **Formula Changes**
- All formula implementations require review by 2+ developers
- Excel parity tests must pass
- Performance impact assessment required
- Documentation updates mandatory

#### **Precision Changes**
- Any Decimal.js configuration changes require architecture approval
- Full regression testing required
- Impact analysis on existing estimates
- Customer notification for significant changes

### 4.2 Deployment Standards

#### **Staging Validation**
- Full Excel workbook comparison
- Performance benchmark validation
- Sample estimate calculations
- Error condition testing

#### **Production Deployment**
- Blue-green deployment with calculation validation
- Rollback plan for calculation errors
- Real-time monitoring of estimate accuracy
- Customer impact assessment

### 4.3 Documentation Requirements

#### **Formula Documentation**
- Every formula must have:
  - Purpose and business logic
  - Input parameter specifications
  - Expected output format
  - Error conditions and handling
  - Excel reference (if applicable)

#### **Test Documentation**
- Test case descriptions and rationale
- Expected vs actual results
- Coverage reports and gap analysis
- Performance benchmarking results

## 5. Implementation Guidelines

### 5.1 Development Standards

#### **Code Organization**
```
lib/
├── calculations/
│   ├── __tests__/           # Unit tests
│   ├── painting-calculator.ts
│   └── optimized-calculator.ts
├── excel-engine/
│   ├── __tests__/           # Engine tests  
│   ├── formula-engine.ts
│   └── excel-functions.ts
├── config/
│   └── decimal-config.ts    # Centralized precision config
└── types/
    └── calculation-types.ts # Shared type definitions
```

#### **Naming Conventions**
- Units in variable names: `lengthFeet`, `areaSqFt`, `timeHours`
- Precision indicators: `priceUsd`, `gallonsExact`, `hoursScheduled`
- Calculation stages: `basePrice`, `markedUpPrice`, `finalPrice`

### 5.2 Error Handling Standards

#### **Validation Errors**
```typescript
class ValidationError extends Error {
  constructor(
    public field: string,
    public value: any,
    public expected: string,
    message?: string
  ) {
    super(message || `Invalid ${field}: expected ${expected}, got ${value}`);
  }
}
```

#### **Calculation Errors**
```typescript
class CalculationError extends Error {
  constructor(
    public formula: string,
    public inputs: Record<string, any>,
    public stage: string,
    message?: string
  ) {
    super(message || `Calculation failed in ${stage} for formula ${formula}`);
  }
}
```

### 5.3 Performance Guidelines

#### **Optimization Targets**
- Cache frequently calculated values
- Batch similar calculations
- Use incremental updates where possible
- Monitor memory usage and implement cleanup

#### **Profiling Requirements**  
- Profile calculation chains end-to-end
- Identify bottlenecks in formula execution
- Monitor memory allocation patterns
- Track calculation accuracy over time

## Conclusion

These policies ensure the Paintbox Excel Formula Engine maintains:

1. **Measurement Consistency**: Standardized units across all calculations
2. **Financial Accuracy**: Excel-compatible rounding for all currency operations  
3. **Quality Assurance**: Comprehensive testing coverage with real-world validation
4. **Performance**: Efficient calculation execution within defined targets
5. **Maintainability**: Clear standards for ongoing development and enhancement

**Success Metrics**:
- 100% Excel parity on core formulas
- <$0.01 currency calculation errors
- 95%+ test coverage on core components
- <5 second full recalculation time
- Zero production calculation failures

---

**Document Version**: 1.0  
**Policy Effective Date**: August 22, 2025  
**Review Cycle**: Quarterly  
**Compliance**: Mandatory for all formula engine development
