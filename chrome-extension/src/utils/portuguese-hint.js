/**
 * Cheap, dependency-free heuristic that tells whether a text looks Portuguese.
 * It is only used to show an honest UI note (Gemini Nano does not officially list Portuguese),
 * never to change scoring. Matching is accent-insensitive and counts Portuguese-distinctive
 * stopwords that are not common in English, Spanish, German, French or Japanese.
 */
const PT_STOPWORDS = new Set([
  'nao', 'voce', 'voces', 'pra', 'uma', 'meu', 'minha', 'seu', 'sua', 'esse', 'essa', 'isso',
  'mae', 'oi', 'ola', 'obrigado', 'obrigada', 'mas', 'muito', 'tambem', 'aqui', 'favor',
  'preciso', 'numero', 'novo', 'faz', 'faca', 'ate', 'depois', 'entao', 'estou', 'tenho',
  'vou', 'sao', 'pelo', 'pela', 'conta', 'senha', 'banco', 'agora', 'hoje', 'quando', 'porque'
]);

const SAMPLE_LIMIT = 3000;
const MIN_DISTINCT_HITS = 3;
const MIN_HIT_DENSITY = 0.06;

export function looksPortuguese(text) {
  if (typeof text !== 'string' || !text) return false;
  const normalized = text.slice(0, SAMPLE_LIMIT).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const tokens = normalized.match(/[a-z]+/g);
  if (!tokens || tokens.length < 4) return false;

  const distinct = new Set();
  let hits = 0;
  for (const token of tokens) {
    if (PT_STOPWORDS.has(token)) {
      distinct.add(token);
      hits++;
    }
  }
  return distinct.size >= MIN_DISTINCT_HITS && hits / tokens.length >= MIN_HIT_DENSITY;
}
