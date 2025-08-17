/**
 * @file Formula Parser Tests
 * @description Tests for Excel formula parsing functionality
 */

import { FormulaParser } from '@/lib/excel-engine/formula-parser';
import { createExcelFormula } from '@/__tests__/factories';

describe('FormulaParser', () => {
  let parser: FormulaParser;

  beforeEach(() => {
    parser = new FormulaParser();
  });

  describe('Basic Parsing', () => {
    it('should parse simple arithmetic expressions', () => {
      const result = parser.parse('=5+3');

      expect(result.type).toBe('binary');
      expect(result.operator).toBe('+');
      expect(result.left.value).toBe(5);
      expect(result.right.value).toBe(3);
    });

    it('should parse cell references', () => {
      const result = parser.parse('=A1');

      expect(result.type).toBe('cell');
      expect(result.reference).toBe('A1');
    });

    it('should parse ranges', () => {
      const result = parser.parse('=A1:B5');

      expect(result.type).toBe('range');
      expect(result.start).toBe('A1');
      expect(result.end).toBe('B5');
    });

    it('should parse function calls', () => {
      const result = parser.parse('=SUM(A1:A5)');

      expect(result.type).toBe('function');
      expect(result.name).toBe('SUM');
      expect(result.arguments).toHaveLength(1);
      expect(result.arguments[0].type).toBe('range');
    });
  });

  describe('Operator Precedence', () => {
    it('should handle multiplication before addition', () => {
      const result = parser.parse('=2+3*4');

      expect(result.type).toBe('binary');
      expect(result.operator).toBe('+');
      expect(result.left.value).toBe(2);
      expect(result.right.type).toBe('binary');
      expect(result.right.operator).toBe('*');
    });

    it('should handle parentheses correctly', () => {
      const result = parser.parse('=(2+3)*4');

      expect(result.type).toBe('binary');
      expect(result.operator).toBe('*');
      expect(result.left.type).toBe('binary');
      expect(result.left.operator).toBe('+');
      expect(result.right.value).toBe(4);
    });

    it('should handle exponentiation with highest precedence', () => {
      const result = parser.parse('=2^3*4');

      expect(result.type).toBe('binary');
      expect(result.operator).toBe('*');
      expect(result.left.type).toBe('binary');
      expect(result.left.operator).toBe('^');
    });
  });

  describe('Function Parsing', () => {
    it('should parse SUM with multiple arguments', () => {
      const result = parser.parse('=SUM(A1,B1,C1)');

      expect(result.type).toBe('function');
      expect(result.name).toBe('SUM');
      expect(result.arguments).toHaveLength(3);
      expect(result.arguments[0].reference).toBe('A1');
      expect(result.arguments[1].reference).toBe('B1');
      expect(result.arguments[2].reference).toBe('C1');
    });

    it('should parse nested functions', () => {
      const result = parser.parse('=SUM(MAX(A1:A5),MIN(B1:B5))');

      expect(result.type).toBe('function');
      expect(result.name).toBe('SUM');
      expect(result.arguments).toHaveLength(2);
      expect(result.arguments[0].type).toBe('function');
      expect(result.arguments[0].name).toBe('MAX');
      expect(result.arguments[1].type).toBe('function');
      expect(result.arguments[1].name).toBe('MIN');
    });

    it('should parse IF function with three arguments', () => {
      const result = parser.parse('=IF(A1>10,B1,C1)');

      expect(result.type).toBe('function');
      expect(result.name).toBe('IF');
      expect(result.arguments).toHaveLength(3);
      expect(result.arguments[0].type).toBe('binary'); // A1>10
      expect(result.arguments[0].operator).toBe('>');
    });

    it('should parse VLOOKUP function', () => {
      const result = parser.parse('=VLOOKUP(A1,Table1,2,FALSE)');

      expect(result.type).toBe('function');
      expect(result.name).toBe('VLOOKUP');
      expect(result.arguments).toHaveLength(4);
      expect(result.arguments[0].reference).toBe('A1');
      expect(result.arguments[1].reference).toBe('Table1');
      expect(result.arguments[2].value).toBe(2);
      expect(result.arguments[3].value).toBe(false);
    });
  });

  describe('String Parsing', () => {
    it('should parse string literals', () => {
      const result = parser.parse('="Hello World"');

      expect(result.type).toBe('string');
      expect(result.value).toBe('Hello World');
    });

    it('should parse string concatenation', () => {
      const result = parser.parse('="Hello"&" "&"World"');

      expect(result.type).toBe('binary');
      expect(result.operator).toBe('&');
      expect(result.left.type).toBe('binary');
      expect(result.left.operator).toBe('&');
    });

    it('should handle strings with escaped quotes', () => {
      const result = parser.parse('="He said ""Hello"""');

      expect(result.type).toBe('string');
      expect(result.value).toBe('He said "Hello"');
    });
  });

  describe('Boolean and Comparison Operators', () => {
    it('should parse comparison operators', () => {
      const comparisons = ['>', '<', '>=', '<=', '=', '<>'];

      comparisons.forEach(op => {
        const result = parser.parse(`=A1${op}B1`);
        expect(result.type).toBe('binary');
        expect(result.operator).toBe(op);
      });
    });

    it('should parse boolean literals', () => {
      const trueResult = parser.parse('=TRUE');
      expect(trueResult.type).toBe('boolean');
      expect(trueResult.value).toBe(true);

      const falseResult = parser.parse('=FALSE');
      expect(falseResult.type).toBe('boolean');
      expect(falseResult.value).toBe(false);
    });
  });

  describe('Complex Expressions', () => {
    it('should parse complex nested expressions', () => {
      const result = parser.parse('=IF(AND(A1>0,B1>0),VLOOKUP(C1,Table1,2,FALSE)*D1,0)');

      expect(result.type).toBe('function');
      expect(result.name).toBe('IF');
      expect(result.arguments).toHaveLength(3);

      // First argument: AND(A1>0,B1>0)
      expect(result.arguments[0].type).toBe('function');
      expect(result.arguments[0].name).toBe('AND');

      // Second argument: VLOOKUP(C1,Table1,2,FALSE)*D1
      expect(result.arguments[1].type).toBe('binary');
      expect(result.arguments[1].operator).toBe('*');
      expect(result.arguments[1].left.type).toBe('function');
      expect(result.arguments[1].left.name).toBe('VLOOKUP');
    });

    it('should parse array formulas', () => {
      const result = parser.parse('=SUM(A1:A5*B1:B5)');

      expect(result.type).toBe('function');
      expect(result.name).toBe('SUM');
      expect(result.arguments[0].type).toBe('binary');
      expect(result.arguments[0].operator).toBe('*');
      expect(result.arguments[0].left.type).toBe('range');
      expect(result.arguments[0].right.type).toBe('range');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid syntax', () => {
      expect(() => parser.parse('=5+')).toThrow('Unexpected end of formula');
    });

    it('should handle mismatched parentheses', () => {
      expect(() => parser.parse('=(5+3')).toThrow('Mismatched parentheses');
    });

    it('should handle invalid function calls', () => {
      expect(() => parser.parse('=SUM(')).toThrow('Incomplete function call');
    });

    it('should handle invalid cell references', () => {
      expect(() => parser.parse('=A')).toThrow('Invalid cell reference');
    });
  });

  describe('Cell Reference Parsing', () => {
    it('should parse absolute references', () => {
      const result = parser.parse('=$A$1');

      expect(result.type).toBe('cell');
      expect(result.reference).toBe('$A$1');
      expect(result.absolute).toEqual({ row: true, column: true });
    });

    it('should parse mixed references', () => {
      const result1 = parser.parse('=$A1');
      expect(result1.absolute).toEqual({ row: false, column: true });

      const result2 = parser.parse('=A$1');
      expect(result2.absolute).toEqual({ row: true, column: false });
    });

    it('should parse sheet references', () => {
      const result = parser.parse('=Sheet1!A1');

      expect(result.type).toBe('cell');
      expect(result.sheet).toBe('Sheet1');
      expect(result.reference).toBe('A1');
    });

    it('should parse external workbook references', () => {
      const result = parser.parse('=[Workbook1.xlsx]Sheet1!A1');

      expect(result.type).toBe('cell');
      expect(result.workbook).toBe('Workbook1.xlsx');
      expect(result.sheet).toBe('Sheet1');
      expect(result.reference).toBe('A1');
    });
  });

  describe('Number Parsing', () => {
    it('should parse integers', () => {
      const result = parser.parse('=123');

      expect(result.type).toBe('number');
      expect(result.value).toBe(123);
    });

    it('should parse decimals', () => {
      const result = parser.parse('=123.45');

      expect(result.type).toBe('number');
      expect(result.value).toBe(123.45);
    });

    it('should parse scientific notation', () => {
      const result = parser.parse('=1.23E+5');

      expect(result.type).toBe('number');
      expect(result.value).toBe(123000);
    });

    it('should parse negative numbers', () => {
      const result = parser.parse('=-123');

      expect(result.type).toBe('unary');
      expect(result.operator).toBe('-');
      expect(result.operand.value).toBe(123);
    });
  });

  describe('Function Arguments', () => {
    it('should handle optional arguments', () => {
      const result = parser.parse('=ROUND(A1)');

      expect(result.type).toBe('function');
      expect(result.name).toBe('ROUND');
      expect(result.arguments).toHaveLength(1);
    });

    it('should handle variable arguments', () => {
      const result = parser.parse('=MAX(A1,B1,C1,D1,E1)');

      expect(result.type).toBe('function');
      expect(result.name).toBe('MAX');
      expect(result.arguments).toHaveLength(5);
    });

    it('should handle empty arguments', () => {
      const result = parser.parse('=IF(A1>0,,B1)');

      expect(result.type).toBe('function');
      expect(result.name).toBe('IF');
      expect(result.arguments).toHaveLength(3);
      expect(result.arguments[1].type).toBe('empty');
    });
  });

  describe('Performance', () => {
    it('should parse formulas efficiently', () => {
      const startTime = Date.now();
      const formulaCount = 1000;

      for (let i = 0; i < formulaCount; i++) {
        parser.parse('=SUM(A1:A10)*B1+C1');
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1000); // Should parse 1000 formulas in under 1 second
    });

    it('should handle complex formulas without performance degradation', () => {
      const complexFormula = '=IF(AND(A1>0,B1>0),VLOOKUP(C1,Table1,MATCH(D1,Headers,0),FALSE)*E1*(1+F1),IF(G1="default",H1,I1))';

      const startTime = Date.now();

      for (let i = 0; i < 100; i++) {
        parser.parse(complexFormula);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(500); // Should parse 100 complex formulas in under 500ms
    });
  });

  describe('AST Structure', () => {
    it('should generate correct AST for binary operations', () => {
      const result = parser.parse('=A1+B1*C1');

      expect(result).toMatchObject({
        type: 'binary',
        operator: '+',
        left: { type: 'cell', reference: 'A1' },
        right: {
          type: 'binary',
          operator: '*',
          left: { type: 'cell', reference: 'B1' },
          right: { type: 'cell', reference: 'C1' }
        }
      });
    });

    it('should include position information in AST nodes', () => {
      const result = parser.parse('=A1+B1');

      expect(result.position).toBeDefined();
      expect(result.position.start).toBe(0);
      expect(result.position.end).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle formulas with whitespace', () => {
      const result = parser.parse('= A1 + B1 ');

      expect(result.type).toBe('binary');
      expect(result.operator).toBe('+');
      expect(result.left.reference).toBe('A1');
      expect(result.right.reference).toBe('B1');
    });

    it('should handle very long cell ranges', () => {
      const result = parser.parse('=SUM(A1:ZZ1000)');

      expect(result.type).toBe('function');
      expect(result.arguments[0].type).toBe('range');
      expect(result.arguments[0].start).toBe('A1');
      expect(result.arguments[0].end).toBe('ZZ1000');
    });

    it('should handle formulas with many nested levels', () => {
      const nestedFormula = '=((((A1+B1)*C1)+D1)*E1)';

      expect(() => parser.parse(nestedFormula)).not.toThrow();
    });
  });
});
