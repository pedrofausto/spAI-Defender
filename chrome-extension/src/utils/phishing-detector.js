/**
 * Phishing Detector
 * Detects phishing attempts using native AI with hybrid scoring
 */

import { HybridScorer } from './hybrid-scorer.js';
import { SentimentAnalyzer } from './sentiment-analyzer.js';
import { LinguisticAnalyzer } from './linguistic-analyzer.js';
import { LocalAIThreatClassifier } from './local-ai-threat-classifier.js';
import { QUICK_DETECT_PATTERNS } from './message-risk-patterns.js';
import { scoreMessage } from './scam-rules.js';

const THREAT_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const THREAT_HISTORY_LIMIT = 250;
const THREAT_CLASSIFICATIONS = new Set(['SAFE', 'SUSPICIOUS', 'PHISHING', 'SCAM', 'SOCIAL_ENGINEERING', 'INCONCLUSIVE', 'UNKNOWN']);
const THREAT_PLATFORMS = new Set(['WEB', 'WHATSAPP', 'TELEGRAM', 'GMAIL', 'OUTLOOK']);
const THREAT_RECORD_FIELDS = new Set(['timestamp', 'riskLevel', 'riskScore', 'classification', 'platform', 'signalCount', 'evidenceCount']);

function boundedCount(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(100, Math.round(number))) : 0;
}

export class PhishingDetector {
  constructor(aiManager) {
    this.aiManager = aiManager;
    this.threatsToday = 0;
    this.riskLevels = { LOW: 0, MEDIUM: 1, MEDIUM_HIGH: 2, HIGH: 3, CRITICAL: 4 };
    this.hybridScorer = new HybridScorer();
    this.localAIClassifier = new LocalAIThreatClassifier(aiManager);

    // Legacy keyword lists, kept for consumers that read them. quickDetect now scores with the
    // scam-pattern rules in scam-rules.js.
    this.quickPatterns = QUICK_DETECT_PATTERNS;
  }

  /**
   * Quick rule-based detection (instant, no AI)
   * @param {string} content - Text to analyze
   * @returns {Object} Quick detection result
   */
  quickDetect(content) {
    if (!content || typeof content !== 'string') {
      return { score: 0, level: 'SAFE', matches: [], semanticSignals: [], suspiciousPhrases: [], evidence: [], context: { educational: false, negated: false } };
    }

    // Scam-pattern combinations over accent-insensitive, negation-aware text (see scam-rules.js).
    const result = scoreMessage(content);
    const score = result.score;
    const level = score >= 80 ? 'HIGH'
      : score >= 55 ? 'MEDIUM'
      : score >= 25 ? 'LOW'
      : 'SAFE';

    return {
      score,
      level,
      matches: result.matches,
      semanticSignals: result.semanticSignals,
      suspiciousPhrases: result.evidence.slice(0, 8),
      evidence: result.evidence,
      context: result.context
    };
  }

  mergeHeuristicSignals(analysis, quickResult) {
    const heuristicSignals = Array.isArray(quickResult?.semanticSignals) ? quickResult.semanticSignals : [];
    const heuristicPhrases = Array.isArray(quickResult?.suspiciousPhrases) ? quickResult.suspiciousPhrases : [];
    const modelSignals = Array.isArray(analysis?.semanticSignals) ? analysis.semanticSignals : [];
    const modelEvidence = Array.isArray(analysis?.evidence) ? analysis.evidence : (Array.isArray(analysis?.redFlags) ? analysis.redFlags : []);
    const mergedSignals = Array.from(new Set([...modelSignals, ...heuristicSignals]));
    const mergedEvidence = Array.from(new Set([...modelEvidence, ...heuristicPhrases])).slice(0, 8);
    const baseRiskScore = Number(analysis?.riskScore || analysis?.finalRiskScore || 0);
    const heuristicScore = Number(quickResult?.score || 0);
    const combinedScore = analysis?.status === 'VALID'
      ? Math.round((baseRiskScore * 0.75) + (heuristicScore * 0.25))
      : Math.round(Math.max(baseRiskScore, heuristicScore));
    // Deterministic floor: the AI may raise the risk above the heuristic level but never lower it.
    const mergedRiskScore = Math.max(baseRiskScore, combinedScore, heuristicScore);

    const finalRiskScore = Math.max(Number(analysis?.finalRiskScore || baseRiskScore || 0), mergedRiskScore);
    const clampedFinalScore = Math.max(0, Math.min(100, finalRiskScore));
    const merged = {
      ...analysis,
      riskScore: clampedFinalScore,
      finalRiskScore: clampedFinalScore,
      semanticSignals: mergedSignals,
      evidence: mergedEvidence,
      redFlags: mergedEvidence,
      suspiciousPhrases: Array.from(new Set([...(analysis?.suspiciousPhrases || []), ...heuristicPhrases])).slice(0, 8),
      heuristicScore,
      heuristicContext: quickResult?.context || { educational: false, negated: false }
    };

    if (merged.status !== 'VALID' && quickResult?.score >= 80) {
      merged.classification = merged.classification === 'INCONCLUSIVE' ? 'SUSPICIOUS' : merged.classification;
      merged.recommendation = merged.recommendation === 'SAFE' ? 'CAUTION' : merged.recommendation;
    }

    if (merged.finalRiskScore >= 1) {
      if (merged.finalRiskScore >= 75) merged.riskLevel = 'HIGH';
      else if (merged.finalRiskScore >= 50) merged.riskLevel = 'MEDIUM_HIGH';
      else if (merged.finalRiskScore >= 30) merged.riskLevel = 'MEDIUM';
      else merged.riskLevel = 'LOW';
    } else if (merged.status !== 'VALID') {
      merged.riskLevel = analysis?.riskLevel || 'UNKNOWN';
      merged.classification = analysis?.classification || 'INCONCLUSIVE';
    }

    // A low or SAFE verdict cannot stand against a strong heuristic signal, with or without model evidence.
    // Rules are the primary signal (Gemini Nano may only raise risk, notably for Portuguese content).
    const lowVerdict = analysis?.classification === 'SAFE' || analysis?.riskLevel === 'LOW';
    if (lowVerdict && heuristicScore >= 55) {
      merged.status = 'INCONCLUSIVE';
      merged.classification = 'INCONCLUSIVE';
      if (merged.recommendation === 'SAFE') merged.recommendation = 'CAUTION';
    }

    return merged;
  }

  /**
   * Robustly parse JSON with common AI response formatting issues
   */
  robustJsonParse(jsonStr) {
    try {
      return JSON.parse(jsonStr);
    } catch (e1) {
      try {
        const fixed1 = jsonStr.replace(/,(\s*[}\]])/g, '$1');
        return JSON.parse(fixed1);
      } catch (e2) {
        try {
          const fixed2 = jsonStr.replace(/\[\s*"([^"]*)"/g, '["$1"');
          return JSON.parse(fixed2);
        } catch (e3) {
          try {
            const fixed3 = jsonStr.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');
            return JSON.parse(fixed3);
          } catch (e4) {
            console.warn('Could not parse JSON after multiple fixes:', e4.message);
            return null;
          }
        }
      }
    }
  }

  /**
   * Detecta phishing na página atual (inclui análise de imagens)
   * Uses advanced hybrid scoring if available, falls back to simple analysis
   */
  async detectPhishing(url, content, title = '', images = [], useAdvanced = true) {
    try {
      // STEP 1: Run quick rule-based detection FIRST (instant, no AI)
      const quickResult = this.quickDetect(content);
      console.log(`🔍 Quick detection result: score=${quickResult.score}, level=${quickResult.level}`);

      // Strong deterministic indicators are evidence, but Gemini Nano remains the primary classifier.
      if (quickResult.score >= 80) {
        console.log('Strong deterministic phishing signals detected; continuing with local Gemini Nano analysis');
      }

      // STEP 2: Run advanced/simple detection
      let result;
      if (useAdvanced) {
        try {
          result = await this.detectPhishingAdvanced(url, content, title, images);
        } catch (error) {
          console.warn('Advanced detection failed, falling back to simple:', error);
          result = await this._detectPhishingSimple(url, content, title, images);
        }
      } else {
        result = await this._detectPhishingSimple(url, content, title, images);
      }

      // STEP 3: Deterministic rules support the decision. They only override when Nano is inconclusive
      // and the deterministic evidence is independently strong.
      const deterministicPhrases = quickResult.matches.map(m => m.pattern);
      if (result.status === 'INCONCLUSIVE' && quickResult.score >= 80) {
        console.log(`Gemini Nano inconclusive; using strong deterministic evidence (${quickResult.score})`);
        result.riskScore = quickResult.score;
        result.finalRiskScore = quickResult.score;
        result.riskLevel = quickResult.level;
        result.isPhishing = true;
        result.classification = 'SUSPICIOUS';
        result.suspiciousPhrases = (result.suspiciousPhrases || []).concat(deterministicPhrases);
        result.redFlags = (result.redFlags || []).concat(deterministicPhrases);
        result.deterministicSignals = deterministicPhrases;
        result.detectionMethod = 'deterministic_after_gemini_inconclusive';
      } else if (quickResult.score > 0) {
        result.deterministicSignals = deterministicPhrases;
      }

      return result;

    } catch (error) {
      console.error('Error in phishing detection:', error);

      // Even on error, try quick detection as fallback
      const quickResult = this.quickDetect(content);
      if (quickResult.score > 0) {
        return {
          riskScore: quickResult.score,
          finalRiskScore: quickResult.score,
          riskLevel: quickResult.level,
          isPhishing: quickResult.score >= 50,
          redFlags: quickResult.matches.map(m => m.pattern),
          suspiciousPhrases: quickResult.matches.map(m => m.pattern),
          confidence: 70,
          detectionMethod: 'quick_pattern_fallback',
          error: error.message
        };
      }

      return {
        riskScore: 0,
        riskLevel: 'UNKNOWN',
        isPhishing: false,
        error: error.message
      };
    }
  }

  /**
   * Simple phishing detection (shared helper method)
   * @private
   */
  async _detectPhishingSimple(url, content, title = '', images = []) {
    // Validate input
    if (!content || typeof content !== 'string') {
      console.warn('Invalid content provided to _detectPhishingSimple');
      return {
        riskScore: 0,
        riskLevel: 'UNKNOWN',
        isPhishing: false,
        redFlags: ['Invalid content provided'],
        confidence: 0,
        error: 'Invalid content'
      };
    }

    const quickResult = this.quickDetect(content);
    const deterministicSignals = Array.from(new Set([
      ...quickResult.matches.map(match => `${match.severity}:${match.pattern}`),
      ...(quickResult.semanticSignals || [])
    ]));

    const analysis = await this.localAIClassifier.classify({
      inputType: 'PAGE',
      platform: 'WEB',
      sourceUrl: url,
      title,
      content,
      deterministicSignals
    });

    const mergedAnalysis = this.mergeHeuristicSignals(analysis, quickResult);

    // Track threats - Lower threshold for better detection (was 70, now 50)
    if (mergedAnalysis.isPhishing || mergedAnalysis.finalRiskScore > 50) {
      this.threatsToday++;
      this.trackThreat(url, { ...mergedAnalysis, platform: 'WEB' });
    }

    return mergedAnalysis;
  }

  /**
   * Advanced phishing detection with hybrid scoring
   * Combines all analysis components for comprehensive risk assessment
   */
  async detectPhishingAdvanced(url, content, title = '', images = []) {
    try {
      // Validate input
      if (!content || typeof content !== 'string') {
        console.warn('Invalid content provided to detectPhishingAdvanced');
        return {
          finalRiskScore: 0,
          riskLevel: 'UNKNOWN',
          isPhishing: false,
          redFlags: ['Invalid content provided'],
          confidence: 0,
          error: 'Invalid content'
        };
      }

      console.log('🔬 Starting advanced phishing detection with hybrid scoring...');

      // OPTIMIZED: Parallelize all 3 analyzers for 3x speedup + timeout protection
      const ANALYSIS_TIMEOUT = 10000; // 10 seconds timeout for all analyses combined

      const analysisPromise = Promise.all([
        // Step 1: Get sentiment analysis (parallel)
        (async () => {
          const sentimentAnalyzer = new SentimentAnalyzer(this.aiManager);
          return await sentimentAnalyzer.analyzeAdvanced(content, url);
        })(),

        // Step 2: Get traditional phishing analysis (parallel)
        this.detectPhishingFallback(url, content, title, images),

        // Step 3: Get linguistic features (parallel)
        (async () => {
          const linguisticAnalyzer = new LinguisticAnalyzer();
          return linguisticAnalyzer.analyze(content);
        })()
      ]);

      // Apply timeout with fallback
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Advanced detection timeout (10s)')), ANALYSIS_TIMEOUT)
      );

      let sentimentAnalysis, phishingAnalysis, linguisticFeatures;

      try {
        const [sentiment, phishing, linguistic] = await Promise.race([
          analysisPromise,
          timeoutPromise
        ]);
        sentimentAnalysis = sentiment;
        phishingAnalysis = phishing;
        linguisticFeatures = linguistic;
        console.log('✅ Advanced detection completed within timeout');
      } catch (timeoutError) {
        console.warn('⏱️ Advanced detection timeout, falling back to simple detection:', timeoutError.message);
        // Fallback to simple detection if advanced analysis times out
        return await this._detectPhishingSimple(url, content, title, images);
      }

      // Step 4: Use hybrid scorer to combine all analyses (image analysis disabled)
      const quickResult = this.quickDetect(content);
      const heuristicScore = quickResult.score;
      const hybridScore = this.hybridScorer.calculateHybridScore({
        sentimentAnalysis,
        phishingAnalysis: {
          riskScore: phishingAnalysis.riskScore / 100,
          confidence: phishingAnalysis.confidence / 100,
          heuristicScore: heuristicScore / 100,
          isPhishing: phishingAnalysis.isPhishing,
          redFlags: phishingAnalysis.redFlags,
          indicators: phishingAnalysis.indicators
        },
        imageAnalysis: {}, // Disabled for performance
        linguisticFeatures
      });

      // Deterministic floor: hybrid weighting must not reduce risk below the heuristic level.
      const floredFinalRiskScore = Math.max(hybridScore.finalRiskScore, heuristicScore);

      // Combine all analysis components
      return {
        ...hybridScore,
        finalRiskScore: floredFinalRiskScore,
        riskLevel: floredFinalRiskScore > hybridScore.finalRiskScore
          ? this.riskLevelForScore(floredFinalRiskScore)
          : hybridScore.riskLevel,
        heuristicScore,
        status: phishingAnalysis.status || 'INCONCLUSIVE',
        classification: phishingAnalysis.classification || 'INCONCLUSIVE',
        confidence: phishingAnalysis.confidence ?? hybridScore.confidence ?? 0,
        semanticSignals: phishingAnalysis.semanticSignals || [],
        evidence: phishingAnalysis.evidence || phishingAnalysis.redFlags || [],
        suspiciousPhrases: phishingAnalysis.suspiciousPhrases || [],
        recommendation: phishingAnalysis.recommendation || hybridScore.recommendation || 'CAUTION',
        detectionMethod: phishingAnalysis.detectionMethod || 'hybrid_with_gemini_nano',
        originalAnalysis: {
          phishing: phishingAnalysis,
          sentiment: sentimentAnalysis,
          linguistic: linguisticFeatures
        }
      };

    } catch (error) {
      console.error('Error in advanced phishing detection:', error);
      return {
        finalRiskScore: 0,
        riskLevel: 'UNKNOWN',
        isPhishing: false,
        error: error.message
      };
    }
  }

  /**
   * Map a 0-100 final score to the hybrid risk level scale.
   * Kept local so the advanced path does not depend on HybridScorer internals.
   */
  riskLevelForScore(score) {
    if (score >= 90) return 'CRITICAL';
    if (score >= 75) return 'HIGH';
    if (score >= 50) return 'MEDIUM_HIGH';
    if (score >= 30) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Simplified fallback version (backward compatibility wrapper)
   * Just calls the shared simple detection method
   */
  async detectPhishingFallback(url, content, title = '', images = []) {
    return await this._detectPhishingSimple(url, content, title, images);
  }

  /**
   * Detecta engenharia social em mensagens
   */
  async detectSocialEngineering(message, senderInfo = '') {
    try {
      const quickResult = this.quickDetect(message);
      const deterministicSignals = Array.from(new Set([
        ...quickResult.matches.map(match => `${match.severity}:${match.pattern}`),
        ...(quickResult.semanticSignals || [])
      ]));
      const baseAnalysis = await this.localAIClassifier.classify({
        inputType: 'MESSAGE',
        platform: 'UNKNOWN',
        sender: senderInfo,
        content: message,
        deterministicSignals
      });

      const analysis = this.mergeHeuristicSignals(baseAnalysis, quickResult);

      const socialSignals = new Set([
        'authority_impersonation',
        'account_threat',
        'urgent_action',
        'financial_reward',
        'payment_request',
        'otp_request',
        'identity_verification'
      ]);
      const tactics = (analysis.semanticSignals || []).filter(signal => socialSignals.has(signal));
      const result = {
        ...analysis,
        manipulationScore: analysis.riskScore || 0,
        isSocialEngineering: analysis.classification === 'SOCIAL_ENGINEERING' || tactics.length >= 2,
        tactics,
        emotionalTriggers: tactics.filter(signal => signal === 'urgent_action' || signal === 'account_threat' || signal === 'authority_impersonation'),
        suspiciousPhrases: analysis.suspiciousPhrases || [],
        deterministicSignals
      };

      if (result.isSocialEngineering || result.manipulationScore > 60) {
        this.threatsToday++;
      }

      return result;
    } catch (error) {
      console.error('Error detecting social engineering:', error.message);
      return {
        status: 'INCONCLUSIVE',
        classification: 'INCONCLUSIVE',
        manipulationScore: 0,
        isSocialEngineering: false,
        riskScore: 0,
        riskLevel: 'UNKNOWN',
        confidence: 0,
        recommendation: 'CAUTION',
        tactics: [],
        emotionalTriggers: [],
        suspiciousPhrases: [],
        validationError: error.message,
        detectionMethod: 'gemini_nano_unavailable'
      };
    }
  }
  /**
   * Keeps only non-identifying threat metadata. URLs, titles, senders, message text and evidence strings
   * are never persisted; counts stand in for the evidence. Records older than 7 days are dropped and at
   * most 250 records are kept.
   */
  sanitizeThreatHistory(threats, now = Date.now()) {
    if (!Array.isArray(threats)) return [];
    const cutoff = now - THREAT_RETENTION_MS;
    return threats.map(threat => {
      const parsed = Date.parse(threat?.timestamp);
      const timestamp = Number.isFinite(parsed) ? new Date(parsed).toISOString() : new Date(now).toISOString();
      const platform = String(threat?.platform || '').toUpperCase();
      return {
        timestamp,
        riskLevel: typeof threat?.riskLevel === 'string' ? threat.riskLevel : 'UNKNOWN',
        riskScore: Number.isFinite(Number(threat?.riskScore)) ? Math.max(0, Math.min(100, Number(threat.riskScore))) : 0,
        classification: THREAT_CLASSIFICATIONS.has(threat?.classification) ? threat.classification : 'UNKNOWN',
        platform: THREAT_PLATFORMS.has(platform) ? platform : 'UNKNOWN',
        signalCount: boundedCount(threat?.signalCount),
        evidenceCount: boundedCount(threat?.evidenceCount)
      };
    }).filter(threat => Date.parse(threat.timestamp) >= cutoff).slice(-THREAT_HISTORY_LIMIT);
  }

  /**
   * Builds the one record that trackThreat persists. Only metadata is read from the analysis.
   */
  buildThreatRecord(analysis, now = Date.now()) {
    const [record] = this.sanitizeThreatHistory([{
      timestamp: new Date(now).toISOString(),
      riskLevel: analysis?.riskLevel || 'UNKNOWN',
      riskScore: Number(analysis?.riskScore) || 0,
      classification: analysis?.classification,
      platform: analysis?.platform,
      signalCount: Array.isArray(analysis?.semanticSignals) ? analysis.semanticSignals.length : 0,
      evidenceCount: Array.isArray(analysis?.evidence) ? analysis.evidence.length : 0
    }], now);
    return record;
  }

  /**
   * Rewrites stored threat history on service worker start so legacy records that carry removed fields
   * (URLs, titles, evidence text) are sanitized, and expired or excess records are pruned.
   * Storage is written only when something actually changes.
   */
  async migrateThreatHistory(now = Date.now()) {
    try {
      const stored = await chrome.storage.local.get('threats');
      const raw = stored?.threats;
      if (!Array.isArray(raw)) return { migrated: false, total: 0 };

      const hasRemovedFields = raw.some(record => record && typeof record === 'object' &&
        Object.keys(record).some(key => !THREAT_RECORD_FIELDS.has(key)));
      const sanitized = this.sanitizeThreatHistory(raw, now);
      if (!hasRemovedFields && sanitized.length === raw.length) {
        return { migrated: false, total: raw.length };
      }

      await chrome.storage.local.set({ threats: sanitized });
      return { migrated: true, total: sanitized.length };
    } catch (error) {
      console.warn('Threat history migration failed:', error?.message || error);
      return { migrated: false, total: 0 };
    }
  }

  /**
   * Rastreia ameaça no storage (metadata only, see sanitizeThreatHistory)
   */
  async trackThreat(_url, analysis) {
    try {
      if (typeof chrome?.storage?.local?.get !== 'function' || typeof chrome?.storage?.local?.set !== 'function') {
        return;
      }
      const stored = await chrome.storage.local.get('threats') || { threats: [] };
      const threats = this.sanitizeThreatHistory(stored.threats);
      threats.push(this.buildThreatRecord(analysis));

      await chrome.storage.local.set({ 
        threats: this.sanitizeThreatHistory(threats),
        threatsToday: this.threatsToday
      });
    } catch (error) {
      console.error('Error tracking threat:', error);
    }
  }

  /**
   * Obtém estatísticas de ameaças
   */
  async getThreatStats() {
    try {
      // Get both threats and threatsToday from storage
      const result = await chrome.storage.local.get(['threats', 'threatsToday']);
      let threats = result.threats || [];
      let threatsToday = result.threatsToday || 0;

      // Validate threats is an array
      if (!Array.isArray(threats)) {
        console.warn('Invalid threats data in storage, resetting to empty array');
        threats = [];
      }

      threats = this.sanitizeThreatHistory(threats);
      if (typeof chrome.storage.local.set === 'function') {
        try {
          await chrome.storage.local.set({ threats });
        } catch (migrationError) {
          console.warn('Threat history privacy migration failed:', migrationError?.message || migrationError);
        }
      }

      // Use instance variable if storage value is not set
      const today = threatsToday || this.threatsToday;

      return {
        total: threats.length,
        today: today,
        recent: threats.slice(-10),
        byRiskLevel: this.groupByRiskLevel(threats)
      };
    } catch (error) {
      console.error('Error getting threat stats:', error);
      // Return safe defaults with instance variable as fallback
      return {
        total: 0,
        today: this.threatsToday || 0,
        recent: [],
        byRiskLevel: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 }
      };
    }
  }

  /**
   * Agrupa ameaças por nível de risco
   */
  groupByRiskLevel(threats) {
    const groups = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
    
    threats.forEach(threat => {
      if (groups.hasOwnProperty(threat.riskLevel)) {
        groups[threat.riskLevel]++;
      }
    });
    
    return groups;
  }
}

export default PhishingDetector;









