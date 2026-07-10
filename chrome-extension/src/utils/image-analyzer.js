import { LocalAIThreatClassifier } from './local-ai-threat-classifier.js';

/**
 * Image Analyzer
 * Analisa URL e contexto textual de imagens com IA nativa. Nao realiza OCR nem analise visual.
 */

export class ImageAnalyzer {
  constructor(aiManager) {
    this.aiManager = aiManager;
    this.localAIClassifier = new LocalAIThreatClassifier(aiManager);
  }

  /**
   * Analisa imagem para detectar phishing
   * @param {string} imageUrl - URL da imagem
   * @param {string} pageContext - Contexto da página
   * @returns {Promise<Object>} Análise da imagem
   */
  async analyzeImage(imageUrl, pageContext = '') {
    try {
      console.log('🔍 Analyzing image for phishing threats:', imageUrl);

      // Validate URL
      if (!imageUrl || typeof imageUrl !== 'string') {
        throw new Error('Invalid image URL');
      }

      if (this.aiManager && typeof this.aiManager.checkAvailability === 'function') {
        try {
          const availability = await this.aiManager.checkAvailability();
          if (availability === 'readily' || availability === 'after-download') {
            return await this.analyzeWithPrompt(imageUrl, pageContext);
          }
        } catch (error) {
          console.warn('AI analysis failed:', error);
        }
      } else if (globalThis.self?.LanguageModel || globalThis.LanguageModel) {
        return await this.analyzeWithPrompt(imageUrl, pageContext);
      }

      return {
        isMalicious: false,
        riskScore: 0,
        riskLevel: 'UNKNOWN',
        classification: 'INCONCLUSIVE',
        description: 'Image URL/context analysis not available (Gemini Nano unavailable)',
        analyzed: false
      };

    } catch (error) {
      console.error('Error analyzing image:', error);
      return {
        isMalicious: false,
        riskScore: 0,
        riskLevel: 'UNKNOWN',
        classification: 'INCONCLUSIVE',
        description: 'Could not analyze image URL/context',
        error: error.message
      };
    }
  }

  /**
   * Analyze using Prompt API with image context description
   * Note: Chrome Built-in AI doesn't support direct image input yet
   * This is a text-based analysis using URL and context
   * @param {string} imageUrl - URL da imagem
   * @param {string} pageContext - Contexto da página
   * @returns {Promise<Object>} Análise
   */
  async analyzeWithPrompt(imageUrl, pageContext) {
    const analysis = await this.localAIClassifier.classify({
      inputType: 'IMAGE_CONTEXT',
      platform: 'WEB',
      sourceUrl: imageUrl,
      content: `Image URL: ${imageUrl}\nPage context: ${pageContext || ''}`,
      deterministicSignals: [`image-url:${imageUrl}`]
    });

    return {
      ...analysis,
      imageUrl,
      isMalicious: analysis.isPhishing || analysis.classification === 'SUSPICIOUS' || analysis.riskScore >= 70,
      threats: analysis.evidence || [],
      suspiciousElements: analysis.semanticSignals || [],
      description: analysis.status === 'VALID'
        ? 'Text-only image URL/context analysis completed; no OCR or visual pixels were analyzed.'
        : 'Text-only image URL/context analysis was inconclusive; no OCR or visual pixels were analyzed.',
      analyzed: analysis.status === 'VALID'
    };
  }

  /**
   * Analisa todas as imagens de uma página
   * @param {Array<string>} imageUrls - URLs das imagens
   * @param {string} pageContext - Contexto da página
   * @returns {Promise<Object>} Análise consolidada
   */
  async analyzePageImages(imageUrls, pageContext = '') {
    if (!imageUrls || imageUrls.length === 0) {
      return {
        totalImages: 0,
        maliciousCount: 0,
        maxRiskLevel: 'LOW',
        results: []
      };
    }

    const results = [];
    let maliciousCount = 0;
    let maxRiskLevel = 'LOW';

    // Analyze first 10 images to save resources
    const imagesToAnalyze = imageUrls.slice(0, 10);

    for (const imageUrl of imagesToAnalyze) {
      try {
        const analysis = await this.analyzeImage(imageUrl, pageContext);
        
        results.push({
          url: imageUrl,
          analysis
        });

        if (analysis.isMalicious) {
          maliciousCount++;
        }

        // Update max risk level
        const riskLevels = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };
        if (riskLevels[analysis.riskLevel] > riskLevels[maxRiskLevel]) {
          maxRiskLevel = analysis.riskLevel;
        }

      } catch (error) {
        console.error(`Error analyzing image ${imageUrl}:`, error);
      }
    }

    return {
      totalImages: imageUrls.length,
      analyzedImages: results.length,
      maliciousCount,
      maxRiskLevel,
      results
    };
  }

  /**
   * Extract text from image (OCR simulation via AI)
   * Note: Chrome Built-in AI doesn't support direct OCR yet
   * This is a placeholder that returns null
   * @param {string} imageUrl - URL da imagem
   * @returns {Promise<string>} Texto extraído
   */
  async extractTextFromImage(imageUrl) {
    try {
      // OCR is not supported by Chrome Built-in AI yet
      // Would require a different API or service
      console.warn('OCR not supported by Chrome Built-in AI');
      return null;
    } catch (error) {
      console.error('OCR extraction error:', error);
      return null;
    }
  }

  /**
   * Parse resposta da visual API
   */
  parseAnalysisResponse(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // Fallback parsing
      return this.parseTextAnalysis(response);
    } catch (error) {
      return {
        isMalicious: false,
        riskScore: 0,
        riskLevel: 'LOW',
        error: 'Could not parse analysis'
      };
    }
  }

  /**
   * Parse análise de texto
   */
  parseTextAnalysis(text, imageUrl) {
    const analysis = {
      isMalicious: false,
      riskScore: 0,
      riskLevel: 'LOW',
      threats: [],
      description: '',
      recommendation: 'TRUST',
      suspiciousElements: [],
      imageUrl
    };

    if (typeof text !== 'string') {
      return analysis;
    }

    const lowerText = text.toLowerCase();

    // Detect malicious content
    if (lowerText.includes('malicious') || lowerText.includes('phishing')) {
      analysis.isMalicious = true;
      analysis.riskScore = 70;
      analysis.riskLevel = 'HIGH';
      analysis.recommendation = 'AVOID';
    } else if (lowerText.includes('suspicious')) {
      analysis.riskScore = 50;
      analysis.riskLevel = 'MEDIUM';
      analysis.recommendation = 'CAUTION';
    }

    // Extract threats
    const threatPattern = /threat[s]*[:]\s*(.+)/gi;
    let match;
    while ((match = threatPattern.exec(text)) !== null) {
      analysis.threats.push(match[1].trim());
    }

    analysis.description = text.substring(0, 200);

    return analysis;
  }

  /**
   * Extrai texto da resposta
   */
  extractTextFromResponse(response) {
    try {
      if (response === null || response === undefined) {
        return null;
      }
      if (typeof response === 'string') {
        return response;
      }
      return JSON.stringify(response);
    } catch {
      return null;
    }
  }
}

export default ImageAnalyzer;

