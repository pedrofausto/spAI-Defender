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
  }

  /**
   * Detecta phishing na página atual (inclui análise de imagens)
   * Uses advanced hybrid scoring if available, falls back to simple analysis
   */
  async detectPhishing(url, content, title = '', images = [], useAdvanced = true) {
    try {
      // Use advanced detection if requested and available
      if (useAdvanced) {
        try {
          return await this.detectPhishingAdvanced(url, content, title, images);
        } catch (error) {
          console.warn('Advanced detection failed, falling back to simple:', error);
          // Continue to simple detection
        }
      }

      // Fall back to simple detection (reuse the helper method)
      return await this._detectPhishingSimple(url, content, title, images);

    } catch (error) {
      console.error('Error in phishing detection:', error);
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

    const session = await this.aiManager.createSession({ temperature: 0.3 });
    const response = await session.prompt(prompt);

    // Parse JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    let analysis = null;

    if (jsonMatch) {
      try {
        const jsonStr = jsonMatch[0];
        // Fix common JSON issues (trailing commas)
        const fixedJson = jsonStr.replace(/,(\s*[}\]])/g, '$1');
        analysis = JSON.parse(fixedJson);
      } catch (jsonError) {
        console.warn('Failed to parse JSON in phishing detector:', jsonError.message);
        analysis = this.parseTextResponse(response);
      }
    } else {
      // Fallback parsing
      analysis = this.parseTextResponse(response);
    }

    await this.aiManager.destroySession();

    // Track threats
    if (analysis.isPhishing || analysis.riskScore > 70) {
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

      // Step 1: Get sentiment analysis
      const sentimentAnalyzer = new SentimentAnalyzer(this.aiManager);
      const sentimentAnalysis = await sentimentAnalyzer.analyzeAdvanced(content, url);

      // Step 2: Get traditional phishing analysis (use fallback to avoid recursion)
      const phishingAnalysis = await this.detectPhishingFallback(url, content, title, images);

      // Step 3: Get linguistic features
      const linguisticAnalyzer = new LinguisticAnalyzer();
      const linguisticFeatures = linguisticAnalyzer.analyze(content);

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

      const session = await this.aiManager.createSession({ temperature: 0.3 });
      const response = await session.prompt(prompt);
      
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      let analysis = null;
      
      if (jsonMatch) {
        try {
          const jsonStr = jsonMatch[0];
          // Fix common JSON issues (trailing commas)
          const fixedJson = jsonStr.replace(/,(\s*[}\]])/g, '$1');
          analysis = JSON.parse(fixedJson);
        } catch (jsonError) {
          console.warn('Failed to parse JSON in social engineering detector:', jsonError.message);
          analysis = this.parseTextResponse(response);
        }
      } else {
        analysis = this.parseTextResponse(response);
      }

      await this.aiManager.destroySession();

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

      const session = await this.aiManager.createSession({ temperature: 0.3 });
      const response = await session.prompt(prompt);
      
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      let analysis = null;
      
      if (jsonMatch) {
        try {
          const jsonStr = jsonMatch[0];
          // Fix common JSON issues (trailing commas)
          const fixedJson = jsonStr.replace(/,(\s*[}\]])/g, '$1');
          analysis = JSON.parse(fixedJson);
        } catch (jsonError) {
          console.warn('Failed to parse JSON in email analyzer:', jsonError.message);
          analysis = this.parseTextResponse(response);
        }
      } else {
        analysis = this.parseTextResponse(response);
      }

      await this.aiManager.destroySession();
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
      const { threats = [], threatsToday = 0 } = await chrome.storage.local.get('threats');
      
      return {
        total: threats.length,
        today: threatsToday || this.threatsToday,
        recent: threats.slice(-10),
        byRiskLevel: this.groupByRiskLevel(threats)
      };
    } catch (error) {
      return { total: 0, today: 0, recent: [], byRiskLevel: {} };
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

