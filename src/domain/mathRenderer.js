import { toEnglishDigits } from './terminology.js';

/**
 * Offline Mathematical Expression Renderer
 * Converts math tokens inside `$...$` into isolated LTR HTML spans with
 * stacked fractions, square roots, superscripts, subscripts, sets, and intervals.
 */

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function findMatchingBrace(str, startIdx) {
  let depth = 0;
  for (let i = startIdx; i < str.length; i++) {
    if (str[i] === '{') depth++;
    else if (str[i] === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

export function renderMathFragment(rawExpr) {
  let expr = toEnglishDigits(rawExpr.trim());

  // Replace standard LaTeX math symbols
  const symbolMap = [
    ['\\cap', '∩'],
    ['\\cup', '∪'],
    ['\\subseteq', '⊆'],
    ['\\subset', '⊂'],
    ['\\in', '∈'],
    ['\\notin', '∉'],
    ['\\emptyset', '∅'],
    ['\\le', '≤'],
    ['\\ge', '≥'],
    ['\\ne', '≠'],
    ['\\approx', '≈'],
    ['\\times', '×'],
    ['\\cdot', '·'],
    ['\\pm', '±'],
    ['\\infty', '∞'],
    ['\\mid', '|'],
    ['\\Rightarrow', '⇒'],
    ['\\rightarrow', '→'],
    ['\\mathbb{R}', 'ℝ'],
    ['\\mathbb{Z}', 'ℤ'],
    ['\\mathbb{N}', 'ℕ'],
    ['\\mathbb{Q}', 'ℚ'],
    ['\\{', '{'],
    ['\\}', '}'],
    ['\\left(', '('],
    ['\\right)', ')'],
    ['\\left[', '['],
    ['\\right]', ']'],
    ['\\left|', '|'],
    ['\\right|', '|'],
  ];

  for (const [k, v] of symbolMap) {
    expr = expr.split(k).join(v);
  }
  expr = expr.replace(/\\text\{([^}]*)\}/g, "$1");

  function parseSegment(s) {
    let out = '';
    let i = 0;
    while (i < s.length) {
      if (s.startsWith('\\frac{', i)) {
        const numStart = i + 5;
        const numEnd = findMatchingBrace(s, numStart);
        if (numEnd !== -1 && s[numEnd + 1] === '{') {
          const denStart = numEnd + 1;
          const denEnd = findMatchingBrace(s, denStart);
          if (denEnd !== -1) {
            const num = parseSegment(s.slice(numStart + 1, numEnd));
            const den = parseSegment(s.slice(denStart + 1, denEnd));
            out += `<span class="m-frac"><span class="m-num">${num}</span><span class="m-den">${den}</span></span>`;
            i = denEnd + 1;
            continue;
          }
        }
      }
      if (s.startsWith('\\sqrt[', i)) {
        const idxEnd = s.indexOf(']', i + 6);
        if (idxEnd !== -1 && s[idxEnd + 1] === '{') {
          const radEnd = findMatchingBrace(s, idxEnd + 1);
          if (radEnd !== -1) {
            const deg = parseSegment(s.slice(i + 6, idxEnd));
            const rad = parseSegment(s.slice(idxEnd + 2, radEnd));
            out += `<span class="m-root"><sup class="m-rdeg">${deg}</sup><span class="m-rsym">√</span><span class="m-rad">${rad}</span></span>`;
            i = radEnd + 1;
            continue;
          }
        }
      }
      if (s.startsWith('\\sqrt{', i)) {
        const radEnd = findMatchingBrace(s, i + 5);
        if (radEnd !== -1) {
          const rad = parseSegment(s.slice(i + 6, radEnd));
          out += `<span class="m-root"><span class="m-rsym">√</span><span class="m-rad">${rad}</span></span>`;
          i = radEnd + 1;
          continue;
        }
      }
      if (s[i] === '^') {
        if (s[i + 1] === '{') {
          const end = findMatchingBrace(s, i + 1);
          if (end !== -1) {
            out += `<sup class="m-sup">${parseSegment(s.slice(i + 2, end))}</sup>`;
            i = end + 1;
            continue;
          }
        } else if (i + 1 < s.length) {
          out += `<sup class="m-sup">${escapeHtml(s[i + 1])}</sup>`;
          i += 2;
          continue;
        }
      }
      if (s[i] === '_') {
        if (s[i + 1] === '{') {
          const end = findMatchingBrace(s, i + 1);
          if (end !== -1) {
            out += `<sub class="m-sub">${parseSegment(s.slice(i + 2, end))}</sub>`;
            i = end + 1;
            continue;
          }
        } else if (i + 1 < s.length) {
          out += `<sub class="m-sub">${escapeHtml(s[i + 1])}</sub>`;
          i += 2;
          continue;
        }
      }
      out += escapeHtml(s[i]);
      i++;
    }
    return out;
  }

  return `<span class="math-expr" dir="ltr">${parseSegment(expr)}</span>`;
}

/**
 * Renders Persian text containing `$...$` math blocks and English identifiers,
 * isolating math and English tokens in LTR while preserving RTL Persian flow.
 */
export function renderRichText(text) {
  if (!text) return '';
  const normalized = toEnglishDigits(text);
  const parts = normalized.split(/(\$[^$]+\$)/g);
  return parts
    .map((part) => {
      if (part.startsWith('$') && part.endsWith('$') && part.length >= 2) {
        return renderMathFragment(part.slice(1, -1));
      }
      // Escape HTML and isolate English codes/identifiers like ID-402 or CIPHER
      const escaped = escapeHtml(part);
      return escaped.replace(/\b([A-Za-z][A-Za-z0-9_:-]{1,})\b/g, '<span class="ltr-token" dir="ltr">$1</span>');
    })
    .join('');
}
