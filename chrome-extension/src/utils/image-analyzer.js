/**
 * Image Analyzer
 * Analisa imagens para detectar phishing e conteúdo malicioso usando AI nativa
 */

export class ImageAnalyzer {
  constructor(aiManager) {
    this.aiManager = aiManager;
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

      // Use Chrome Built-in AI Visual Analysis if available
      // Note: NEW API - LanguageModel directly on self
      if (typeof self.LanguageModel !== 'undefined') {
        try {
          return await this.analyzeWithPrompt(imageUrl, pageContext);
        } catch (error) {
          console.warn('AI analysis failed:', error);
        }
      }

      // Fallback: Return safe default
      return {
        isMalicious: false,
        riskScore: 0,
        riskLevel: 'LOW',
        description: 'Image analysis not available (AI not supported)',
        analyzed: false
      };

    } catch (error) {
      console.error('Error analyzing image:', error);
      return {
        isMalicious: false,
        riskScore: 0,
        riskLevel: 'LOW',
        description: 'Could not analyze image',
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
    try {
      const session = await this.aiManager.createSession({ temperature: 0.3 });

      const prompt = `You are a security expert analyzing a potential phishing image based on its URL and page context.

Image URL: ${imageUrl}
Page Context: ${pageContext}

Analyze the image URL and context for phishing indicators:
1. URL pattern analysis (suspicious domains, typosquatting)
2. Common phishing image naming patterns
3. Context-based risk assessment
4. Known phishing CDN patterns

Provide JSON response:
{
  "isMalicious": true/false,
  "riskScore": 0-100,
  "riskLevel": "LOW|MEDIUM|HIGH|CRITICAL",
  "threats": ["threat1", "threat2"],
  "description": "detailed description",
  "recommendation": "TRUST|CAUTION|AVOID|DELETE",
  "suspiciousElements": ["element1", "element2"]
}`;

      const response = await session.prompt(prompt);
      await this.aiManager.destroySession();

      return this.parseTextAnalysis(response, imageUrl);

    } catch (error) {
      console.error('Prompt-based analysis error:', error);
      throw error;
    }
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

