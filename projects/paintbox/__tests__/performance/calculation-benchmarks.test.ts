/**
 * @file Calculation Performance Benchmarks
 * @description Performance tests for critical calculation paths
 */

import { PaintingCalculator } from '@/lib/calculations/painting-calculator';
import { FormulaEngine } from '@/lib/excel-engine/formula-engine';
import {
  createTestRoom,
  createPerformanceTestEstimate,
  createExcelValidationCase
} from '@/__tests__/factories';

describe('Calculation Performance Benchmarks', () => {
  let calculator: PaintingCalculator;
  let formulaEngine: FormulaEngine;

  beforeAll(() => {
    calculator = new PaintingCalculator({ enableCache: true });
    formulaEngine = new FormulaEngine({ enableCache: true });
  });

  describe('Room Calculation Performance', () => {
    it('should calculate single room estimate under 50ms', async () => {
      const room = createTestRoom({
        dimensions: { length: 12, width: 10, height: 9 },
        doors: 2,
        windows: 3,
      });

      const iterations = 100;
      const startTime = process.hrtime.bigint();

      for (let i = 0; i < iterations; i++) {
        await calculator.calculateCompleteRoomEstimate(room);
      }

      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1_000_000;
      const avgTimePerCalculation = durationMs / iterations;

      expect(avgTimePerCalculation).toBeLessThan(50); // Under 50ms per calculation
      console.log(`Average room calculation time: ${avgTimePerCalculation.toFixed(2)}ms`);
    });

    it('should handle large multi-room projects efficiently', async () => {
      const rooms = Array.from({ length: 20 }, () => createTestRoom());

      const startTime = process.hrtime.bigint();

      const result = await calculator.calculateMultiRoomEstimate(rooms);

      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1_000_000;

      expect(durationMs).toBeLessThan(500); // Under 500ms for 20 rooms
      expect(result.rooms).toHaveLength(20);

      console.log(`20-room calculation time: ${durationMs.toFixed(2)}ms`);
    });

    it('should scale linearly with room count', async () => {
      const roomCounts = [1, 5, 10, 20, 50];
      const timings: number[] = [];

      for (const count of roomCounts) {
        const rooms = Array.from({ length: count }, () => createTestRoom());

        const startTime = process.hrtime.bigint();
        await calculator.calculateMultiRoomEstimate(rooms);
        const endTime = process.hrtime.bigint();

        const durationMs = Number(endTime - startTime) / 1_000_000;
        timings.push(durationMs);
      }

      // Check that scaling is roughly linear (not exponential)
      const timePerRoom = timings.map((time, i) => time / roomCounts[i]);
      const maxTimePerRoom = Math.max(...timePerRoom);
      const minTimePerRoom = Math.min(...timePerRoom);

      // Variance should be less than 2x
      expect(maxTimePerRoom / minTimePerRoom).toBeLessThan(2);

      console.log('Scaling analysis:', {
        roomCounts,
        timings: timings.map(t => `${t.toFixed(2)}ms`),
        timePerRoom: timePerRoom.map(t => `${t.toFixed(2)}ms/room`),
      });
    });
  });

  describe('Formula Engine Performance', () => {
    it('should evaluate simple formulas under 1ms', async () => {
      const testData = { A1: 100, B1: 200, C1: 300 };
      formulaEngine.setWorksheetData(testData);

      const formulas = [
        '=A1+B1',
        '=A1*B1',
        '=A1/B1',
        '=SUM(A1:C1)',
        '=AVERAGE(A1:C1)',
      ];

      const iterations = 1000;
      const timings: number[] = [];

      for (const formula of formulas) {
        const startTime = process.hrtime.bigint();

        for (let i = 0; i < iterations; i++) {
          await formulaEngine.evaluate(`D${i}`, formula);
        }

        const endTime = process.hrtime.bigint();
        const durationMs = Number(endTime - startTime) / 1_000_000;
        const avgTime = durationMs / iterations;

        timings.push(avgTime);
        expect(avgTime).toBeLessThan(1); // Under 1ms per formula
      }

      console.log('Formula evaluation times:', {
        formulas,
        avgTimes: timings.map(t => `${t.toFixed(3)}ms`),
      });
    });

    it('should handle complex nested formulas efficiently', async () => {
      const testData = {
        A1: 100, B1: 200, C1: 300, D1: 400, E1: 500,
        rate: 45, markup: 1.35, overhead: 0.20,
        condition: 'good', type: 'premium',
      };

      formulaEngine.setWorksheetData(testData);

      const complexFormula = '=IF(AND(A1>0,condition="good"),SUM(A1:E1)*rate*markup*(1+overhead),0)';

      const iterations = 500;
      const startTime = process.hrtime.bigint();

      for (let i = 0; i < iterations; i++) {
        await formulaEngine.evaluate(`RESULT${i}`, complexFormula);
      }

      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1_000_000;
      const avgTime = durationMs / iterations;

      expect(avgTime).toBeLessThan(5); // Under 5ms for complex formulas
      console.log(`Complex formula avg time: ${avgTime.toFixed(3)}ms`);
    });

    it('should handle large datasets without performance degradation', async () => {
      // Create large dataset
      const largeDataset: Record<string, number> = {};
      for (let i = 1; i <= 1000; i++) {
        largeDataset[`A${i}`] = i;
        largeDataset[`B${i}`] = i * 2;
      }

      formulaEngine.setWorksheetData(largeDataset);

      const startTime = process.hrtime.bigint();

      // Perform calculations on large ranges
      await formulaEngine.evaluate('SUM_ALL', '=SUM(A1:A1000)');
      await formulaEngine.evaluate('AVG_ALL', '=AVERAGE(B1:B1000)');
      await formulaEngine.evaluate('MAX_ALL', '=MAX(A1:A1000)');

      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1_000_000;

      expect(durationMs).toBeLessThan(100); // Under 100ms for large datasets
      console.log(`Large dataset calculation time: ${durationMs.toFixed(2)}ms`);
    });
  });

  describe('Cache Performance', () => {
    it('should provide significant speedup with caching enabled', async () => {
      const room = createTestRoom();

      // Without cache
      const calculatorNoCache = new PaintingCalculator({ enableCache: false });
      const startTimeNoCache = process.hrtime.bigint();

      for (let i = 0; i < 50; i++) {
        await calculatorNoCache.calculateCompleteRoomEstimate(room);
      }

      const endTimeNoCache = process.hrtime.bigint();
      const timeWithoutCache = Number(endTimeNoCache - startTimeNoCache) / 1_000_000;

      // With cache (second run should be much faster)
      const calculatorWithCache = new PaintingCalculator({ enableCache: true });

      // Prime the cache
      await calculatorWithCache.calculateCompleteRoomEstimate(room);

      const startTimeWithCache = process.hrtime.bigint();

      for (let i = 0; i < 50; i++) {
        await calculatorWithCache.calculateCompleteRoomEstimate(room);
      }

      const endTimeWithCache = process.hrtime.bigint();
      const timeWithCache = Number(endTimeWithCache - startTimeWithCache) / 1_000_000;

      const speedupRatio = timeWithoutCache / timeWithCache;
      expect(speedupRatio).toBeGreaterThan(2); // At least 2x speedup

      console.log('Cache performance:', {
        withoutCache: `${timeWithoutCache.toFixed(2)}ms`,
        withCache: `${timeWithCache.toFixed(2)}ms`,
        speedup: `${speedupRatio.toFixed(1)}x`,
      });
    });

    it('should handle cache misses gracefully', async () => {
      const rooms = Array.from({ length: 100 }, () => createTestRoom());

      const startTime = process.hrtime.bigint();

      // Each room is unique, so cache misses expected
      for (const room of rooms) {
        await calculator.calculateCompleteRoomEstimate(room);
      }

      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1_000_000;
      const avgTimePerRoom = durationMs / rooms.length;

      // Should still be reasonably fast even with cache misses
      expect(avgTimePerRoom).toBeLessThan(100);
      console.log(`Cache miss performance: ${avgTimePerRoom.toFixed(2)}ms per room`);
    });
  });

  describe('Memory Usage Benchmarks', () => {
    it('should not leak memory during intensive calculations', async () => {
      const initialMemory = process.memoryUsage();

      // Perform many calculations
      for (let batch = 0; batch < 10; batch++) {
        const rooms = Array.from({ length: 50 }, () => createTestRoom());
        await calculator.calculateMultiRoomEstimate(rooms);

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseMB = memoryIncrease / (1024 * 1024);

      // Memory increase should be reasonable (under 50MB for 500 room calculations)
      expect(memoryIncreaseMB).toBeLessThan(50);

      console.log('Memory usage:', {
        initial: `${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        final: `${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        increase: `${memoryIncreaseMB.toFixed(2)}MB`,
      });
    });

    it('should handle large formula datasets efficiently', async () => {
      const initialMemory = process.memoryUsage();

      // Create very large dataset
      const hugeDataset: Record<string, number> = {};
      for (let i = 1; i <= 10000; i++) {
        hugeDataset[`A${i}`] = Math.random() * 1000;
        hugeDataset[`B${i}`] = Math.random() * 1000;
      }

      formulaEngine.setWorksheetData(hugeDataset);

      // Perform calculations
      await formulaEngine.evaluate('HUGE_SUM', '=SUM(A1:A10000)');
      await formulaEngine.evaluate('HUGE_AVG', '=AVERAGE(B1:B10000)');

      const finalMemory = process.memoryUsage();
      const memoryIncreaseMB = (finalMemory.heapUsed - initialMemory.heapUsed) / (1024 * 1024);

      // Should handle large datasets without excessive memory usage
      expect(memoryIncreaseMB).toBeLessThan(100);

      console.log(`Large dataset memory usage: ${memoryIncreaseMB.toFixed(2)}MB`);
    });
  });

  describe('Concurrent Performance', () => {
    it('should handle concurrent calculations efficiently', async () => {
      const concurrency = 20;
      const calculationsPerWorker = 10;

      const startTime = process.hrtime.bigint();

      const promises = Array.from({ length: concurrency }, async () => {
        for (let i = 0; i < calculationsPerWorker; i++) {
          const room = createTestRoom();
          await calculator.calculateCompleteRoomEstimate(room);
        }
      });

      await Promise.all(promises);

      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1_000_000;
      const totalCalculations = concurrency * calculationsPerWorker;
      const avgTimePerCalculation = durationMs / totalCalculations;

      expect(avgTimePerCalculation).toBeLessThan(100); // Should scale well

      console.log('Concurrent performance:', {
        concurrency,
        totalCalculations,
        totalTime: `${durationMs.toFixed(2)}ms`,
        avgTime: `${avgTimePerCalculation.toFixed(2)}ms`,
      });
    });

    it('should not have race conditions in concurrent access', async () => {
      const sharedRoom = createTestRoom();
      const concurrency = 50;

      const promises = Array.from({ length: concurrency }, () =>
        calculator.calculateCompleteRoomEstimate(sharedRoom)
      );

      const results = await Promise.all(promises);

      // All results should be identical (no race conditions)
      const firstResult = results[0];
      for (const result of results) {
        expect(result.pricing.good).toBe(firstResult.pricing.good);
        expect(result.pricing.better).toBe(firstResult.pricing.better);
        expect(result.pricing.best).toBe(firstResult.pricing.best);
      }
    });
  });

  describe('Real-World Performance Scenarios', () => {
    it('should handle typical customer workflow under target times', async () => {
      // Simulate a typical customer estimate workflow
      const estimate = createPerformanceTestEstimate();

      const workflowSteps = [
        'Calculate room areas',
        'Calculate material requirements',
        'Calculate labor hours',
        'Apply pricing tiers',
        'Generate final estimate',
      ];

      const stepTimings: number[] = [];

      for (const step of workflowSteps) {
        const startTime = process.hrtime.bigint();

        // Simulate the step with actual calculations
        await calculator.calculateMultiRoomEstimate(estimate.measurements.rooms);

        const endTime = process.hrtime.bigint();
        const stepTime = Number(endTime - startTime) / 1_000_000;
        stepTimings.push(stepTime);
      }

      const totalWorkflowTime = stepTimings.reduce((sum, time) => sum + time, 0);

      // Entire workflow should complete in under 2 seconds
      expect(totalWorkflowTime).toBeLessThan(2000);

      console.log('Workflow performance:', {
        steps: workflowSteps.map((step, i) => `${step}: ${stepTimings[i].toFixed(2)}ms`),
        total: `${totalWorkflowTime.toFixed(2)}ms`,
      });
    });

    it('should maintain performance under load spikes', async () => {
      // Simulate sudden load spike
      const normalLoad = 5;
      const spikeLoad = 50;

      // Baseline performance
      const baselineResults = [];
      for (let i = 0; i < normalLoad; i++) {
        const room = createTestRoom();
        const startTime = process.hrtime.bigint();
        await calculator.calculateCompleteRoomEstimate(room);
        const endTime = process.hrtime.bigint();
        baselineResults.push(Number(endTime - startTime) / 1_000_000);
      }

      const baselineAvg = baselineResults.reduce((sum, time) => sum + time, 0) / baselineResults.length;

      // Load spike performance
      const spikePromises = Array.from({ length: spikeLoad }, () => {
        const room = createTestRoom();
        const startTime = process.hrtime.bigint();
        return calculator.calculateCompleteRoomEstimate(room).then(() => {
          const endTime = process.hrtime.bigint();
          return Number(endTime - startTime) / 1_000_000;
        });
      });

      const spikeResults = await Promise.all(spikePromises);
      const spikeAvg = spikeResults.reduce((sum, time) => sum + time, 0) / spikeResults.length;

      // Performance degradation should be minimal (less than 3x)
      const degradationRatio = spikeAvg / baselineAvg;
      expect(degradationRatio).toBeLessThan(3);

      console.log('Load spike analysis:', {
        baseline: `${baselineAvg.toFixed(2)}ms`,
        spike: `${spikeAvg.toFixed(2)}ms`,
        degradation: `${degradationRatio.toFixed(1)}x`,
      });
    });
  });

  afterAll(() => {
    // Clean up any resources
    console.log('\nPerformance benchmark summary completed');
  });
});
