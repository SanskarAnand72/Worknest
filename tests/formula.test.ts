import { describe, it, expect } from 'vitest';
import { evaluateFormula } from '../src/lib/formula';

describe('Safe Formula Evaluator Engine', () => {
  it('evaluates basic arithmetic expressions safely', () => {
    const ctx = { properties: {} };
    expect(evaluateFormula('10 + 25', ctx)).toBe(35);
    expect(evaluateFormula('100 - 45', ctx)).toBe(55);
    expect(evaluateFormula('8 * 7', ctx)).toBe(56);
    expect(evaluateFormula('100 / 4', ctx)).toBe(25);
  });

  it('substitutes property values dynamically', () => {
    const ctx = {
      properties: {
        'Story Points': 8,
        'Hourly Rate': 50,
        Status: 'Done',
      },
    };

    expect(evaluateFormula('prop("Story Points") * 2', ctx)).toBe(16);
    expect(evaluateFormula('prop("Story Points") * prop("Hourly Rate")', ctx)).toBe(400);
    expect(evaluateFormula('concat("Status: ", prop("Status"))', ctx)).toBe('Status: Done');
  });

  it('evaluates conditional if() statements', () => {
    const ctx = {
      properties: {
        'Story Points': 12,
      },
    };

    expect(evaluateFormula('if(prop("Story Points") > 10, "Large", "Small")', ctx)).toBe('Large');
  });

  it('supports string functions upper(), lower(), and round()', () => {
    const ctx = { properties: { Name: 'Frontend Module' } };
    expect(evaluateFormula('upper(prop("Name"))', ctx)).toBe('FRONTEND MODULE');
    expect(evaluateFormula('lower(prop("Name"))', ctx)).toBe('frontend module');
    expect(evaluateFormula('round(14.7)', ctx)).toBe(15);
  });
});
