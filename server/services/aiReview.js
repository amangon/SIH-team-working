/**
 * AI Code Review service with swappable drivers.
 *
 * AI_DRIVER=mock      → deterministic heuristic review (default, no API key needed)
 * AI_DRIVER=anthropic → real review via Claude (requires ANTHROPIC_API_KEY and
 *                       `npm i @anthropic-ai/sdk`)
 *
 * Both drivers return the same shape, so the frontend never changes:
 * {
 *   summary, score, bugs[], security[], codeSmells[], optimizations[],
 *   bestPractices[], complexity: { rating, details }, improvedCode
 * }
 */

const REVIEW_SHAPE_PROMPT = `You are an expert code reviewer. Analyze the given code and respond ONLY with valid JSON matching this exact shape:
{
  "summary": "one-paragraph overview",
  "score": <0-100 integer quality score>,
  "bugs": [{"line": <number|null>, "issue": "...", "fix": "..."}],
  "security": [{"line": <number|null>, "issue": "...", "severity": "low|medium|high|critical", "fix": "..."}],
  "codeSmells": [{"line": <number|null>, "issue": "...", "suggestion": "..."}],
  "optimizations": [{"issue": "...", "suggestion": "..."}],
  "bestPractices": ["..."],
  "complexity": {"rating": "low|medium|high", "details": "..."},
  "improvedCode": "full improved version of the code"
}`;

/* ── Mock driver: static-analysis heuristics, useful without any API key ── */
const mockDriver = {
  async review(code, language) {
    const lines = code.split('\n');
    const bugs = [];
    const security = [];
    const codeSmells = [];
    const optimizations = [];
    const bestPractices = [];

    lines.forEach((line, i) => {
      const n = i + 1;
      const t = line.trim();
      if (/\bvar\s+\w+/.test(t))
        codeSmells.push({ line: n, issue: '`var` is function-scoped and hoisted', suggestion: 'Use `const` or `let` instead' });
      if (/==[^=]/.test(t) && !/[!=<>]==/.test(t))
        bugs.push({ line: n, issue: 'Loose equality `==` can cause type-coercion bugs', fix: 'Use strict equality `===`' });
      if (/console\.log/.test(t))
        codeSmells.push({ line: n, issue: 'Debug statement left in code', suggestion: 'Remove console.log or use a proper logger' });
      if (/\beval\s*\(/.test(t))
        security.push({ line: n, issue: 'eval() executes arbitrary code', severity: 'critical', fix: 'Remove eval; parse input safely instead' });
      if (/innerHTML\s*=/.test(t))
        security.push({ line: n, issue: 'innerHTML assignment can enable XSS', severity: 'high', fix: 'Use textContent or sanitize input' });
      if (/(password|secret|api[_-]?key|token)\s*[:=]\s*['"][^'"]{4,}['"]/i.test(t))
        security.push({ line: n, issue: 'Possible hardcoded credential', severity: 'high', fix: 'Move secrets to environment variables' });
      if (/SELECT .* FROM .*\+|query\(.*\+.*\)/i.test(t))
        security.push({ line: n, issue: 'String-concatenated SQL query (injection risk)', severity: 'critical', fix: 'Use parameterized queries' });
      if (t.length > 120)
        codeSmells.push({ line: n, issue: `Line is ${t.length} characters long`, suggestion: 'Break into shorter lines (<100 chars)' });
      if (/catch\s*(\(\s*\w*\s*\))?\s*{\s*}/.test(t))
        bugs.push({ line: n, issue: 'Empty catch block swallows errors', fix: 'Log or handle the error' });
      if (/for\s*\(.*\.length/.test(t))
        optimizations.push({ issue: `Line ${n}: .length accessed inside loop condition`, suggestion: 'Cache length or use for...of / array methods' });
      if (/setTimeout\(.*,\s*0\s*\)/.test(t))
        optimizations.push({ issue: `Line ${n}: setTimeout(fn, 0)`, suggestion: 'Consider queueMicrotask or restructuring async flow' });
    });

    // Function-length heuristic
    const fnMatches = code.match(/function\s+\w+|=>\s*{/g) || [];
    if (lines.length > 80 && fnMatches.length <= 2)
      codeSmells.push({ line: null, issue: 'Very long function/file with few subdivisions', suggestion: 'Extract smaller, single-purpose functions' });

    if (!/try\s*{/.test(code) && /await |\.then\(/.test(code))
      bestPractices.push('Add try/catch (or .catch) around async operations to handle failures gracefully.');
    if (!/^\s*\/\//m.test(code) && !/\/\*/.test(code) && lines.length > 30)
      bestPractices.push('Add brief comments explaining non-obvious logic.');
    bestPractices.push('Write unit tests covering the main paths of this code.');
    bestPractices.push(`Follow consistent ${language} naming conventions and formatting (use a linter/formatter).`);

    const nesting = Math.max(...lines.map((l) => (l.match(/^\s*/)[0].length / 2) | 0), 0);
    const complexity = {
      rating: nesting > 5 || lines.length > 150 ? 'high' : nesting > 3 || lines.length > 60 ? 'medium' : 'low',
      details: `~${lines.length} lines, max nesting depth ≈ ${nesting}. ${nesting > 4 ? 'Deep nesting hurts readability — consider early returns or extracting helpers.' : 'Structure is reasonable.'}`,
    };

    const deductions = bugs.length * 8 + security.length * 12 + codeSmells.length * 3;
    const score = Math.max(20, Math.min(95, 90 - deductions));

    return {
      summary: `Heuristic review of ${lines.length} lines of ${language}. Found ${bugs.length} potential bug(s), ${security.length} security issue(s), and ${codeSmells.length} code smell(s). This is a mock review — set AI_DRIVER=anthropic with an API key for a full AI-powered analysis.`,
      score,
      bugs,
      security,
      codeSmells,
      optimizations,
      bestPractices,
      complexity,
      improvedCode: '',
      driver: 'mock',
    };
  },
};

/* ── Anthropic driver: real AI review via Claude ── */
const anthropicDriver = {
  async review(code, language) {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: REVIEW_SHAPE_PROMPT,
      messages: [{ role: 'user', content: `Language: ${language}\n\n\`\`\`${language}\n${code}\n\`\`\`` }],
    });
    const text = response.content.find((b) => b.type === 'text')?.text || '{}';
    const json = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
    return { ...json, driver: 'anthropic' };
  },
};

const driver = process.env.AI_DRIVER === 'anthropic' ? anthropicDriver : mockDriver;

export const reviewCode = (code, language = 'javascript') => driver.review(code, language);
