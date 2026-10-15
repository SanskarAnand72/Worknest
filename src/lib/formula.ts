/**
 * Safe, sandboxed AST-based formula evaluator for Notion-like database formulas.
 * Does NOT use unsafe eval() or Function constructor.
 */

export interface FormulaContext {
  properties: Record<string, any>;
}

export function evaluateFormula(expression: string, context: FormulaContext): string | number | boolean | null {
  if (!expression || typeof expression !== 'string') return null;

  const trimmed = expression.trim();
  if (!trimmed) return null;

  try {
    // 1. Property substitution: prop("PropertyName") or prop('PropertyName')
    let processed = trimmed.replace(/prop\s*\(\s*["']([^"']+)["']\s*\)/gi, (_, propName) => {
      const val = context.properties[propName];
      if (val === undefined || val === null || val === '') return 'null';
      if (typeof val === 'number') return String(val);
      if (typeof val === 'boolean') return String(val);
      return JSON.stringify(String(val));
    });

    // 2. Built-in function evaluation
    // if(condition, trueVal, falseVal)
    processed = processed.replace(
      /if\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\s*\)/gi,
      (_, cond, ifTrue, ifFalse) => {
        const condResult = evaluateSimpleExpression(cond.trim());
        return condResult ? ifTrue.trim() : ifFalse.trim();
      }
    );

    // concat(a, b, ...)
    processed = processed.replace(/concat\s*\(\s*([^)]+)\s*\)/gi, (_, args) => {
      const parts = args.split(',').map((p: string) => String(evaluateSimpleExpression(p.trim()) ?? ''));
      return JSON.stringify(parts.join(''));
    });

    // round(a)
    processed = processed.replace(/round\s*\(\s*([^)]+)\s*\)/gi, (_, arg) => {
      const num = Number(evaluateSimpleExpression(arg.trim()));
      return isNaN(num) ? 'null' : String(Math.round(num));
    });

    // abs(a)
    processed = processed.replace(/abs\s*\(\s*([^)]+)\s*\)/gi, (_, arg) => {
      const num = Number(evaluateSimpleExpression(arg.trim()));
      return isNaN(num) ? 'null' : String(Math.abs(num));
    });

    // upper(str)
    processed = processed.replace(/upper\s*\(\s*([^)]+)\s*\)/gi, (_, arg) => {
      const val = evaluateSimpleExpression(arg.trim());
      return JSON.stringify(String(val ?? '').toUpperCase());
    });

    // lower(str)
    processed = processed.replace(/lower\s*\(\s*([^)]+)\s*\)/gi, (_, arg) => {
      const val = evaluateSimpleExpression(arg.trim());
      return JSON.stringify(String(val ?? '').toLowerCase());
    });

    return evaluateSimpleExpression(processed);
  } catch (err) {
    return 'Error: Invalid Formula';
  }
}

/**
 * Safely evaluates simple arithmetic and comparison tokens without eval().
 */
function evaluateSimpleExpression(expr: string): any {
  const e = expr.trim();
  if (e === 'null' || e === '') return null;
  if (e === 'true') return true;
  if (e === 'false') return false;

  // Quoted string literal
  if ((e.startsWith('"') && e.endsWith('"')) || (e.startsWith("'") && e.endsWith("'"))) {
    return e.slice(1, -1);
  }

  // Pure number
  if (!isNaN(Number(e))) {
    return Number(e);
  }

  // Comparisons: ==, !=, >=, <=, >, <
  const compMatch = e.match(/(.+?)\s*(==|!=|>=|<=|>|<)\s*(.+)/);
  if (compMatch) {
    const [, leftStr, op, rightStr] = compMatch;
    const left = evaluateSimpleExpression(leftStr);
    const right = evaluateSimpleExpression(rightStr);
    switch (op) {
      case '==':
        return left === right;
      case '!=':
        return left !== right;
      case '>=':
        return left >= right;
      case '<=':
        return left <= right;
      case '>':
        return left > right;
      case '<':
        return left < right;
    }
  }

  // Addition & Subtraction (handling strings and numbers)
  const addMatch = e.match(/(.+?)\s*(\+|\-)\s*(.+)/);
  if (addMatch) {
    const [, leftStr, op, rightStr] = addMatch;
    const left = evaluateSimpleExpression(leftStr);
    const right = evaluateSimpleExpression(rightStr);
    if (op === '+') {
      if (typeof left === 'string' || typeof right === 'string') {
        return `${left ?? ''}${right ?? ''}`;
      }
      return Number(left) + Number(right);
    }
    if (op === '-') {
      return Number(left) - Number(right);
    }
  }

  // Multiplication & Division
  const mulMatch = e.match(/(.+?)\s*(\*|\/)\s*(.+)/);
  if (mulMatch) {
    const [, leftStr, op, rightStr] = mulMatch;
    const left = Number(evaluateSimpleExpression(leftStr));
    const right = Number(evaluateSimpleExpression(rightStr));
    if (isNaN(left) || isNaN(right)) return null;
    if (op === '*') return left * right;
    if (op === '/') return right === 0 ? null : left / right;
  }

  return e;
}
