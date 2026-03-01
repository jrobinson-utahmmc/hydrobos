/**
 * JSON Parser Utility
 * Handles parsing and cleaning of AI-generated JSON responses.
 *
 * Ported from del_when_sone_SEO_optimizer — adapted to CommonJS module
 * resolution used by HydroBOS services.
 */

export interface ParseResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  cleanedJson?: string;
}

/**
 * Clean and repair malformed JSON from AI responses.
 */
export function cleanAndParseJSON<T = unknown>(text: string): ParseResult<T> {
  let jsonStr = text;

  // Step 1: Extract from markdown code blocks
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch && codeBlockMatch[1]) {
    jsonStr = codeBlockMatch[1].trim();
  }

  // Step 2: Find outermost JSON object / array
  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      jsonStr = arrayMatch[0];
    } else {
      return { success: false, error: 'No JSON object or array found in response' };
    }
  } else {
    jsonStr = jsonMatch[0];
  }

  // Step 3: Try raw parse
  try {
    const data = JSON.parse(jsonStr) as T;
    return { success: true, data, cleanedJson: jsonStr };
  } catch {
    // continue
  }

  // Step 4: Cleaning
  let cleaned = jsonStr;
  cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');
  cleaned = cleaned.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
  cleaned = cleaned.replace(/^\uFEFF/, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');

  try {
    const data = JSON.parse(cleaned) as T;
    return { success: true, data, cleanedJson: cleaned };
  } catch {
    // continue
  }

  // Step 5: Balance braces
  const openBraces = (cleaned.match(/\{/g) || []).length;
  const closeBraces = (cleaned.match(/\}/g) || []).length;
  const openBrackets = (cleaned.match(/\[/g) || []).length;
  const closeBrackets = (cleaned.match(/\]/g) || []).length;
  if (openBraces > closeBraces) cleaned += '}'.repeat(openBraces - closeBraces);
  if (openBrackets > closeBrackets) cleaned += ']'.repeat(openBrackets - closeBrackets);

  try {
    const data = JSON.parse(cleaned) as T;
    return { success: true, data, cleanedJson: cleaned };
  } catch (e) {
    const error = e instanceof Error ? e.message : 'Unknown parse error';
    return { success: false, error, cleanedJson: cleaned };
  }
}

/**
 * Safely stringify with circular-reference handling.
 */
export function safeStringify(obj: unknown, space?: number): string {
  const seen = new WeakSet();
  return JSON.stringify(obj, (_, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) return '[Circular]';
      seen.add(value);
    }
    return value;
  }, space);
}

/**
 * Convenience: extract first JSON object from arbitrary text.
 */
export function extractJSON<T = unknown>(text: string): T | null {
  const result = cleanAndParseJSON<T>(text);
  return result.success ? result.data! : null;
}
