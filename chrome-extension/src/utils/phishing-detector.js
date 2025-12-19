/**
 * Phishing Detector
 * Detects phishing attempts using native AI with hybrid scoring
 */

import { HybridScorer } from './hybrid-scorer.js';
import { SentimentAnalyzer } from './sentiment-analyzer.js';
import { LinguisticAnalyzer } from './linguistic-analyzer.js';

export class PhishingDetector {
  constructor(aiManager) {
    this.aiManager = aiManager;
    this.threatsToday = 0;
    this.riskLevels = { LOW: 0, MEDIUM: 1, MEDIUM_HIGH: 2, HIGH: 3, CRITICAL: 4 };
    this.hybridScorer = new HybridScorer();

    // Quick rule-based patterns for instant detection (no AI needed)
    this.quickPatterns = {
      // High-risk patterns (score 80-100)
      critical: [
        /conta.*suspens[ao]/i,           // account suspended (PT)
        /account.*suspend/i,              // account suspended (EN)
        /conta.*bloquead[ao]/i,           // account blocked (PT)
        /account.*block/i,                // account blocked (EN)
        /verifi(que|car).*conta/i,        // verify account (PT)
        /verify.*account/i,               // verify account (EN)
        /clique.*agora/i,                 // click now (PT)
        /click.*now/i,                    // click now (EN)
        /ação.*imediata/i,                // immediate action (PT)
        /immediate.*action/i,             // immediate action (EN)
        /sua.*senha.*expirou/i,           // your password expired (PT)
        /password.*expired/i,             // password expired (EN)
        /acesso.*não.*autorizado/i,       // unauthorized access (PT)
        /unauthorized.*access/i,          // unauthorized access (EN)
        /atividade.*suspeita/i,           // suspicious activity (PT)
        /suspicious.*activity/i,          // suspicious activity (EN)
        /fraude.*detectad/i,              // fraud detected (PT)
        /fraud.*detected/i,               // fraud detected (EN)
      ],
      // Medium-risk patterns (score 50-79)
      warning: [
        /atenção/i,                       // attention (PT)
        /attention/i,                     // attention (EN)
        /urgente/i,                       // urgent (PT)
        /urgent/i,                        // urgent (EN)
        /oportunidade.*única/i,           // unique opportunity (PT)
        /unique.*opportunity/i,           // unique opportunity (EN)
        /última.*chance/i,                // last chance (PT)
        /last.*chance/i,                  // last chance (EN)
        /ganhe.*dinheiro/i,               // earn money (PT)
        /earn.*money/i,                   // earn money (EN)
        /prêmio/i,                        // prize (PT)
        /prize/i,                         // prize (EN)
        /grátis/i,                        // free (PT)
        /free.*gift/i,                    // free gift (EN)
        /limitad[ao]/i,                   // limited (PT)
        /limited.*offer/i,                // limited offer (EN)
      ]
    };
  }

  /**
   * Quick rule-based detection (instant, no AI)
   * @param {string} content - Text to analyze
   * @returns {Object} Quick detection result
   */
  quickDetect(content) {
    if (!content || typeof content !== 'string') {
      return { score: 0, level: 'SAFE', matches: [] };
    }

    const matches = [];
    let maxScore = 0;

    // Check critical patterns (80-100 score)
    for (const pattern of this.quickPatterns.critical) {
      if (pattern.test(content)) {
        matches.push({ pattern: pattern.source, severity: 'CRITICAL' });
        maxScore = Math.max(maxScore, 85);
      }
    }

    // Check warning patterns (50-79 score)
    for (const pattern of this.quickPatterns.warning) {
      if (pattern.test(content)) {
        matches.push({ pattern: pattern.source, severity: 'WARNING' });
        maxScore = Math.max(maxScore, 55);
      }
    }

    // Boost score if multiple matches
    if (matches.length >= 3) {
      maxScore = Math.min(100, maxScore + 15);
    } else if (matches.length >= 2) {
      maxScore = Math.min(100, maxScore + 10);
    }

    const level = maxScore >= 80 ? 'HIGH' :
                  maxScore >= 50 ? 'MEDIUM' :
                  maxScore >= 30 ? 'LOW' : 'SAFE';

    console.log(`🚨 Quick detect: score=${maxScore}, matches=${matches.length}`, matches.map(m => m.pattern));

    return { score: maxScore, level, matches };
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

      // If quick detection finds HIGH risk, return immediately for speed
      if (quickResult.score >= 80) {
        console.log('⚡ HIGH RISK detected by quick patterns - returning immediately');
        return {
          riskScore: quickResult.score,
          finalRiskScore: quickResult.score,
          riskLevel: quickResult.level,
          isPhishing: true,
          redFlags: quickResult.matches.map(m => m.pattern),
          suspiciousPhrases: quickResult.matches.map(m => m.pattern),
          confidence: 90,
          detectionMethod: 'quick_pattern'
        };
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

      // STEP 3: Ensure quick detection score is not ignored
      // If quick detection found medium risk but AI returned 0, use quick score
      const aiScore = result.finalRiskScore || result.riskScore || 0;
      if (quickResult.score > aiScore) {
        console.log(`⚠️ Quick detection score (${quickResult.score}) > AI score (${aiScore}), using quick score`);
        result.riskScore = quickResult.score;
        result.finalRiskScore = quickResult.score;
        result.riskLevel = quickResult.level;
        result.isPhishing = quickResult.score >= 50;
        result.suspiciousPhrases = (result.suspiciousPhrases || []).concat(quickResult.matches.map(m => m.pattern));
        result.detectionMethod = 'quick_pattern_override';
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

    const prompt = `You are a cybersecurity expert. Analyze this for phishing attempts:

URL: ${url || 'unknown'}
Title: ${title || 'untitled'}
Content Preview: ${content.substring(0, 2000)}

Analyze for:
1. URL anomalies (typo-squatting, suspicious domains)
2. Urgency/panic language (act now, account suspended, limited time)
3. Suspicious forms or credential requests
4. Mismatch between URL and content
5. Social engineering tactics

Provide response as JSON with:
{
  "riskScore": 0-100,
  "riskLevel": "LOW|MEDIUM|MEDIUM_HIGH|HIGH|CRITICAL",
  "isPhishing": true/false,
  "redFlags": ["reason1", "reason2"],
  "confidence": 0-100,
  "recommendation": "SAFE|CAUTION|WARNING|DANGEROUS",
  "indicators": {
    "urgencyLanguage": true/false,
    "credentialRequests": true/false,
    "urlAnomaly": true/false,
    "suspiciousForms": true/false
  },
  "suspiciousPhrases": ["exact problematic phrases or sentences"]
}`;

    // OPTIMIZED: Reuse session from pool instead of creating new one
    let session = this.aiManager.getPooledSession();
    if (!session) {
      session = await this.aiManager.getOrCreateSession({ temperature: 0.3 });
    }

    const response = await session.prompt(prompt);

    // Return session to pool for reuse
    this.aiManager.returnSessionToPool(session);

    // Parse JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    let analysis = null;

    if (jsonMatch) {
      try {
        const jsonStr = jsonMatch[0];
        // Use robust parser
        analysis = this.robustJsonParse(jsonStr);
        if (!analysis) {
          analysis = this.parseTextResponse(response);
        }
      } catch (jsonError) {
        console.warn('Failed to parse JSON in phishing detector:', jsonError.message);
        analysis = this.parseTextResponse(response);
      }
    } else {
      // Fallback parsing
      analysis = this.parseTextResponse(response);
    }

    // Track threats - Lower threshold for better detection (was 70, now 50)
    if (analysis.isPhishing || analysis.riskScore > 50) {
      this.threatsToday++;
      this.trackThreat(url, analysis);
    }

    return analysis;
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
      const hybridScore = this.hybridScorer.calculateHybridScore({
        sentimentAnalysis,
        phishingAnalysis: {
          riskScore: phishingAnalysis.riskScore / 100,
          confidence: phishingAnalysis.confidence / 100,
          isPhishing: phishingAnalysis.isPhishing,
          redFlags: phishingAnalysis.redFlags,
          indicators: phishingAnalysis.indicators
        },
        imageAnalysis: {}, // Disabled for performance
        linguisticFeatures
      });

      // Combine all analysis components
      return {
        ...hybridScore,
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
      const prompt = `You are a social engineering detection expert. Analyze this message:

Message: ${message}
Sender: ${senderInfo}

Detect psychological manipulation:
1. Authority abuse (someone claiming to be admin/boss)
2. Fear creation (your account will be deleted)
3. Urgency pressure (act immediately)
4. Trust exploitation (pretending to be someone else)
5. FOMO tactics (limited time offers)

Provide JSON response:
{
  "manipulationScore": 0-100,
  "isSocialEngineering": true/false,
  "tactics": ["tactic1", "tactic2"],
  "emotionalTriggers": ["trigger1", "trigger2"],
  "recommendation": "SAFE|CAUTION|WARNING|DANGEROUS",
  "riskLevel": "LOW|MEDIUM|HIGH|CRITICAL",
  "suspiciousPhrases": ["exact phrases that are suspicious or manipulative"]
}`;

      // OPTIMIZED: Use pooled session for faster analysis
      let session = this.aiManager.getPooledSession();
      if (!session) {
        session = await this.aiManager.getOrCreateSession({ temperature: 0.3 });
      }

      const response = await session.prompt(prompt);
      this.aiManager.returnSessionToPool(session);

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      let analysis = null;

      if (jsonMatch) {
        try {
          const jsonStr = jsonMatch[0];
          // Use robust parser
          analysis = this.robustJsonParse(jsonStr);
          if (!analysis) {
            analysis = this.parseTextResponse(response);
          }
        } catch (jsonError) {
          console.warn('Failed to parse JSON in social engineering detector:', jsonError.message);
          analysis = this.parseTextResponse(response);
        }
      } else {
        analysis = this.parseTextResponse(response);
      }

      // Track threats
      if (analysis.isSocialEngineering || analysis.manipulationScore > 60) {
        this.threatsToday++;
      }

      return analysis;

    } catch (error) {
      console.error('Error detecting social engineering:', error.message);
      return {
        manipulationScore: 0,
        isSocialEngineering: false,
        error: error.message
      };
    }
  }

  /**
   * Analisa conteúdo de email
   */
  async analyzeEmail(emailText, sender, subject) {
    try {
      const prompt = `Analyze this email for phishing:

From: ${sender}
Subject: ${subject}
Content: ${emailText.substring(0, 2000)}

Check for:
1. Email spoofing indicators
2. Suspicious sender domain
3. Urgency/panic language
4. Suspicious links or attachments
5. Request for sensitive information

Provide JSON:
{
  "isPhishing": true/false,
  "riskScore": 0-100,
  "senderLegitimacy": "LEGITIMATE|SUSPICIOUS|FAKE",
  "redFlags": ["flag1", "flag2"],
  "linkSafety": "SAFE|SUSPICIOUS|UNSAFE",
  "recommendation": "TRUST|CAUTION|DELETE"
}`;

      // OPTIMIZED: Use pooled session for faster analysis
      let session = this.aiManager.getPooledSession();
      if (!session) {
        session = await this.aiManager.getOrCreateSession({ temperature: 0.3 });
      }

      const response = await session.prompt(prompt);
      this.aiManager.returnSessionToPool(session);

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      let analysis = null;

      if (jsonMatch) {
        try {
          const jsonStr = jsonMatch[0];
          // Use robust parser
          analysis = this.robustJsonParse(jsonStr);
          if (!analysis) {
            analysis = this.parseTextResponse(response);
          }
        } catch (jsonError) {
          console.warn('Failed to parse JSON in email analyzer:', jsonError.message);
          analysis = this.parseTextResponse(response);
        }
      } else {
        analysis = this.parseTextResponse(response);
      }

      return analysis;

    } catch (error) {
      console.error('Error analyzing email:', error.message);
      return { isPhishing: false, riskScore: 0 };
    }
  }

  /**
   * Parse resposta de texto para JSON
   */
  parseTextResponse(text) {
    const analysis = {
      riskScore: 0,
      riskLevel: 'LOW',
      isPhishing: false,
      redFlags: [],
      confidence: 0,
      recommendation: 'SAFE',
      suspiciousPhrases: []
    };

    // Buscar padrões no texto
    if (text.toLowerCase().includes('high risk') || text.toLowerCase().includes('phishing')) {
      analysis.isPhishing = true;
      analysis.riskScore = 80;
      analysis.riskLevel = 'HIGH';
      analysis.recommendation = 'DANGEROUS';
    } else if (text.toLowerCase().includes('medium risk') || text.toLowerCase().includes('suspicious')) {
      analysis.riskScore = 50;
      analysis.riskLevel = 'MEDIUM';
      analysis.recommendation = 'WARNING';
    }

    // Extrair red flags
    const flagPattern = /red flag[s]*[:]\s*(.+)/gi;
    let match;
    while ((match = flagPattern.exec(text)) !== null) {
      analysis.redFlags.push(match[1].trim());
    }

    return analysis;
  }

  /**
   * Rastreia ameaça no storage
   */
  async trackThreat(url, analysis) {
    try {
      const { threats = [] } = await chrome.storage.local.get('threats') || { threats: [] };
      
      threats.push({
        url,
        riskLevel: analysis.riskLevel,
        riskScore: analysis.riskScore,
        timestamp: new Date().toISOString(),
        redFlags: analysis.redFlags
      });

      await chrome.storage.local.set({ 
        threats,
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

