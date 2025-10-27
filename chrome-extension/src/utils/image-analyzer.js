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

      // Use Chrome Built-in AI Visual Analysis if available
      if (window.ai && window.ai.sources) {
        try {
          return await this.analyzeWithVisualAPI(imageUrl, pageContext);
        } catch (error) {
          console.warn('Visual API failed, using fallback:', error);
        }
      }

      // Fallback: Use prompt-based image analysis
      return await this.analyzeWithPrompt(imageUrl, pageContext);

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
   * Analisa usando Visual API (PRIMARY)
   * @param {string} imageUrl - URL da imagem
   * @param {string} pageContext - Contexto da página
   * @returns {Promise<Object>} Análise
   */
  async analyzeWithVisualAPI(imageUrl, pageContext) {
    try {
      const prompt = `Analyze this image for phishing threats:

Context: ${pageContext}

Check for:
1. Suspicious logos (fake bank, fake company)
2. Urgency text (act now, account suspended)
3. Credential request forms
4. Suspicious links or phone numbers
5. Fake security badges
6. Clone websites of legitimate services

Provide JSON analysis:
{
  "isMalicious": true/false,
  "riskScore": 0-100,
  "riskLevel": "LOW|MEDIUM|HIGH|CRITICAL",
  "threats": ["threat1", "threat2"],
  "description": "brief description",
  "recommendation": "TRUST|CAUTION|AVOID|DELETE",
  "textExtracted": "any text found in image",
  "suspiciousElements": ["element1", "element2"]
}`;

      // Use ai.sources for image analysis (experimental API)
      // This is the proper way to analyze images with Chrome Built-in AI
      const sources = await window.ai.sources({
        prompt,
        sources: [
          {
            url: imageUrl,
            mimeType: 'image/jpeg' // or detect automatically
          }
        ]
      });

      const analysis = this.parseAnalysisResponse(sources);
      return analysis;

    } catch (error) {
      console.error('Visual API error:', error);
      throw error;
    }
  }

  /**
   * Analisa usando Prompt API (FALLBACK)
   * @param {string} imageUrl - URL da imagem
   * @param {string} pageContext - Contexto da página
   * @returns {Promise<Object>} Análise
   */
  async analyzeWithPrompt(imageUrl, pageContext) {
    try {
      const session = await this.aiManager.createSession({ temperature: 0.3 });

      const prompt = `You are a security expert analyzing an image for phishing threats.

Image URL: ${imageUrl}
Page Context: ${pageContext}

Analyze the image for:
1. Fake logos or branding
2. Urgency language or threats
3. Credential request forms
4. Suspicious links or contact info
5. Clone websites
6. Fake security indicators

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
   * Extrai texto de uma imagem (OCR)
   * @param {string} imageUrl - URL da imagem
   * @returns {Promise<string>} Texto extraído
   */
  async extractTextFromImage(imageUrl) {
    try {
      if (window.ai && window.ai.sources) {
        // Use AI to extract text from image
        const result = await window.ai.sources({
          prompt: 'Extract all text from this image, including URLs, phone numbers, and any visible text.',
          sources: [{ url: imageUrl, mimeType: 'image/jpeg' }]
        });

        return this.extractTextFromResponse(result);
      }

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

