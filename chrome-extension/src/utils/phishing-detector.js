/**
 * Phishing Detector
 * Detects phishing attempts using native AI with hybrid scoring
 */

import { HybridScorer } from './hybrid-scorer.js';

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
      // Use advanced detection if requested
      if (useAdvanced) {
        try {
          return await this.detectPhishingAdvanced(url, content, title, images);
        } catch (error) {
          console.warn('Advanced detection failed, falling back to simple:', error);
          // Continue to simple detection
        }
      }

      // Fall back to simple detection
      // Import image analyzer dynamically if needed
      const { ImageAnalyzer } = await import('./image-analyzer.js');
      const imageAnalyzer = new ImageAnalyzer(this.aiManager);

      // Analyze images if provided
      let imageAnalysis = null;
      if (images && images.length > 0) {
        try {
          console.log('🖼️ Analyzing images for phishing threats...');
          const imageResults = await imageAnalyzer.analyzePageImages(images, url);
          imageAnalysis = imageResults;
          
          // Add image threats to overall analysis
          if (imageResults.maxRiskLevel !== 'LOW' || imageResults.maliciousCount > 0) {
            console.warn('⚠️ Malicious images detected:', imageResults.maliciousCount);
          }
        } catch (error) {
          console.warn('Could not analyze images:', error);
        }
      }

      const prompt = `You are a cybersecurity expert. Analyze this for phishing attempts:

URL: ${url}
Title: ${title}
Content Preview: ${content.substring(0, 2000)}
${imageAnalysis ? `\nImages Analysis: ${imageAnalysis.maliciousCount} malicious images found. Max risk: ${imageAnalysis.maxRiskLevel}` : ''}

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
  }
}`;

      const session = await this.aiManager.createSession({ temperature: 0.3 });
      const response = await session.prompt(prompt);
      
      // Parse JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      let analysis = null;
      
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback parsing
        analysis = this.parseTextResponse(response);
      }

      await this.aiManager.destroySession();

      // Enhance analysis with image results
      if (imageAnalysis) {
        analysis.imageAnalysis = imageAnalysis;
        analysis.hasImageThreats = imageAnalysis.maliciousCount > 0;
        analysis.maxImageRisk = imageAnalysis.maxRiskLevel;
        
        // Increase risk score if images are suspicious
        if (imageAnalysis.maxRiskLevel === 'HIGH' || imageAnalysis.maxRiskLevel === 'CRITICAL') {
          analysis.riskScore = Math.min(100, analysis.riskScore + 20);
          analysis.redFlags.push(`Malicious images detected (${imageAnalysis.maliciousCount} images)`);
        }
      }

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
      console.log('🔬 Starting advanced phishing detection with hybrid scoring...');

      // Step 1: Get sentiment analysis
      const { SentimentAnalyzer } = await import('./sentiment-analyzer.js');
      const sentimentAnalyzer = new SentimentAnalyzer(this.aiManager);
      const sentimentAnalysis = await sentimentAnalyzer.analyzeAdvanced(content, url);

      // Step 2: Get traditional phishing analysis
      const phishingAnalysis = await this.detectPhishing(url, content, title, images);

      // Step 3: Analyze images
      let imageAnalysis = null;
      if (images && images.length > 0) {
        const { ImageAnalyzer } = await import('./image-analyzer.js');
        const imageAnalyzer = new ImageAnalyzer(this.aiManager);
        try {
          imageAnalysis = await imageAnalyzer.analyzePageImages(images, url);
          imageAnalysis.riskScore = imageAnalysis.maliciousCount > 0 ? 
            (imageAnalysis.maliciousCount * 10) : 0;
        } catch (error) {
          console.warn('Could not analyze images:', error);
        }
      }

      // Step 4: Get linguistic features
      const { LinguisticAnalyzer } = await import('./linguistic-analyzer.js');
      const linguisticAnalyzer = new LinguisticAnalyzer();
      const linguisticFeatures = linguisticAnalyzer.analyze(content);

      // Step 5: Use hybrid scorer to combine all analyses
      const hybridScore = this.hybridScorer.calculateHybridScore({
        sentimentAnalysis,
        phishingAnalysis: {
          riskScore: phishingAnalysis.riskScore / 100,
          confidence: phishingAnalysis.confidence / 100,
          isPhishing: phishingAnalysis.isPhishing,
          redFlags: phishingAnalysis.redFlags,
          indicators: phishingAnalysis.indicators
        },
        imageAnalysis: imageAnalysis || {},
        linguisticFeatures
      });

      // Combine all analysis components
      return {
        ...hybridScore,
        originalAnalysis: {
          phishing: phishingAnalysis,
          sentiment: sentimentAnalysis,
          image: imageAnalysis,
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
   * Simplified version for backward compatibility
   */
  async detectPhishingFallback(url, content, title = '', images = []) {
    try {
      // Import image analyzer dynamically if needed
      const { ImageAnalyzer } = await import('./image-analyzer.js');
      const imageAnalyzer = new ImageAnalyzer(this.aiManager);

      // Analyze images if provided
      let imageAnalysis = null;
      if (images && images.length > 0) {
        try {
          console.log('🖼️ Analyzing images for phishing threats...');
          const imageResults = await imageAnalyzer.analyzePageImages(images, url);
          imageAnalysis = imageResults;
          
          // Add image threats to overall analysis
          if (imageResults.maxRiskLevel !== 'LOW' || imageResults.maliciousCount > 0) {
            console.warn('⚠️ Malicious images detected:', imageResults.maliciousCount);
          }
        } catch (error) {
          console.warn('Could not analyze images:', error);
        }
      }

      const prompt = `You are a cybersecurity expert. Analyze this for phishing attempts:

URL: ${url}
Title: ${title}
Content Preview: ${content.substring(0, 2000)}
${imageAnalysis ? `\nImages Analysis: ${imageAnalysis.maliciousCount} malicious images found. Max risk: ${imageAnalysis.maxRiskLevel}` : ''}

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
  }
}`;

      const session = await this.aiManager.createSession({ temperature: 0.3 });
      const response = await session.prompt(prompt);
      
      // Parse JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      let analysis = null;
      
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback parsing
        analysis = this.parseTextResponse(response);
      }

      await this.aiManager.destroySession();

      // Enhance analysis with image results
      if (imageAnalysis) {
        analysis.imageAnalysis = imageAnalysis;
        analysis.hasImageThreats = imageAnalysis.maliciousCount > 0;
        analysis.maxImageRisk = imageAnalysis.maxRiskLevel;
        
        // Increase risk score if images are suspicious
        if (imageAnalysis.maxRiskLevel === 'HIGH' || imageAnalysis.maxRiskLevel === 'CRITICAL') {
          analysis.riskScore = Math.min(100, analysis.riskScore + 20);
          analysis.redFlags.push(`Malicious images detected (${imageAnalysis.maliciousCount} images)`);
        }
      }

      // Track threats
      if (analysis.isPhishing || analysis.riskScore > 70) {
        this.threatsToday++;
        this.trackThreat(url, analysis);
      }

      return analysis;

    } catch (error) {
      console.error('Error detecting phishing:', error);
      return {
        riskScore: 0,
        riskLevel: 'UNKNOWN',
        isPhishing: false,
        error: error.message
      };
    }
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
  "riskLevel": "LOW|MEDIUM|HIGH|CRITICAL"
}`;

      const session = await this.aiManager.createSession({ temperature: 0.3 });
      const response = await session.prompt(prompt);
      
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      let analysis = null;
      
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
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
      console.error('Error detecting social engineering:', error);
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
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        analysis = this.parseTextResponse(response);
      }

      await this.aiManager.destroySession();
      return analysis;

    } catch (error) {
      console.error('Error analyzing email:', error);
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
      recommendation: 'SAFE'
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

