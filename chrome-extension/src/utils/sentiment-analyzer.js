/**
 * Sentiment Analyzer
 * Advanced sentiment analysis with domain-specific lexicons and multi-dimensional emotional analysis
 */

import { PhishingLexicons } from './phishing-lexicons.js';
import { LinguisticAnalyzer } from './linguistic-analyzer.js';
import { EmotionAnalyzer } from './emotion-analyzer.js';

export class SentimentAnalyzer {
  constructor(aiManager) {
    this.aiManager = aiManager;
    this.lexicons = new PhishingLexicons();
    this.linguisticAnalyzer = new LinguisticAnalyzer();
    this.emotionAnalyzer = new EmotionAnalyzer();
  }

  async withSession(options, operation) {
    let session = null;
    try {
      session = await this.aiManager.createSession(options);
      return await operation(session);
    } finally {
      if (session) {
        await this.aiManager.destroySession(session).catch((cleanupError) => {
          console.warn('Failed to destroy sentiment analysis session:', cleanupError?.message || cleanupError);
        });
      }
    }
  }
  /**
   * Robustly parse JSON with common AI response formatting issues
   */
  robustJsonParse(jsonStr) {
    try {
      // First attempt: direct parse
      return JSON.parse(jsonStr);
    } catch (e1) {
      try {
        // Fix 1: Remove trailing commas before ] and }
        const fixed1 = jsonStr.replace(/,(\s*[}\]])/g, '$1');
        return JSON.parse(fixed1);
      } catch (e2) {
        try {
          // Fix 2: Handle quotes in array items
          const fixed2 = jsonStr.replace(/\[\s*"([^"]*)"/g, '["$1"');
          return JSON.parse(fixed2);
        } catch (e3) {
          try {
            // Fix 3: Remove comments if any
            const fixed3 = jsonStr.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');
            return JSON.parse(fixed3);
          } catch (e4) {
            try {
              // Fix 4: Escape unescaped newlines and tabs in string values
              const fixed4 = jsonStr
                .replace(/:\s*"([^"]*)\n([^"]*)"/g, ': "$1\\n$2"') // Handle newlines in values
                .replace(/:\s*"([^"]*)\t([^"]*)"/g, ': "$1\\t$2"'); // Handle tabs in values
              return JSON.parse(fixed4);
            } catch (e5) {
              try {
                // Fix 5: Add missing commas between properties
                // Pattern: closing quote followed by opening quote on same/different line
                const fixed5 = jsonStr.replace(/"\s*\n\s*"/g, '",\n"')
                  .replace(/"\s+"(?=[{[])/g, '", ')
                  .replace(/}(?=\s*[{[])/g, '},')
                  .replace(/](?=\s*[{[])/g, '],');
                return JSON.parse(fixed5);
              } catch (e6) {
                console.warn('Could not parse JSON after 5 fix attempts. Last error:', e6.message);
                console.warn('JSON string (first 500 chars):', jsonStr.substring(0, 500));
                return null;
              }
            }
          }
        }
      }
    }
  }

  /**
   * Analisa sentimento do conteúdo
   */
  async analyzeSentiment(text, url = '') {
    try {
      // Validate input
      if (!text || typeof text !== 'string') {
        console.warn('Invalid text provided to analyzeSentiment');
        return this.getDefaultAnalysis();
      }

      const prompt = `Analyze the sentiment, urgency, and manipulation in this content:

Content: ${text.substring(0, 3000)}
URL: ${url}

Analyze:
1. Sentiment score (-1 negative to +1 positive)
2. Urgency level (LOW|MEDIUM|HIGH|CRITICAL)
3. Manipulation tactics present
4. Emotional triggers detected
5. Pressure indicators

Provide JSON response:
{
  "sentimentScore": -1 to 1,
  "sentiment": "NEGATIVE|NEUTRAL|POSITIVE",
  "urgencyLevel": "LOW|MEDIUM|HIGH|CRITICAL",
  "manipulationDetected": true/false,
  "emotionalTriggers": ["trigger1", "trigger2"],
  "pressureTactics": ["tactic1", "tactic2"],
  "trustworthiness": "TRUSTWORTHY|CAUTION|UNTRUSTWORTHY",
  "recommendation": "SAFE|CAUTION|WARNING|DANGEROUS"
}`;

      const response = await this.withSession({ temperature: 0.5 }, async (session) => await session.prompt(prompt));
      
      console.log('Raw AI response for sentiment:', response);
      
      // Parse JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      let analysis = null;
      
      if (jsonMatch) {
        try {
          const jsonStr = jsonMatch[0];
          // Use robust parser
          analysis = this.robustJsonParse(jsonStr);
          
          if (analysis) {
            console.log('✅ Successfully parsed sentiment JSON');
          } else {
            console.warn('Robust parser returned null, using fallback');
            analysis = this.parseSentimentText(response);
          }
        } catch (jsonError) {
          console.warn('Failed to parse JSON in analyzeSentiment:', jsonError.message);
          analysis = this.parseSentimentText(response);
        }
      } else {
        console.log('No JSON found in response, using fallback parser');
        analysis = this.parseSentimentText(response);
      }

      return analysis;

    } catch (error) {
      console.error('Error analyzing sentiment:', error);
      return {
        sentimentScore: 0,
        sentiment: 'NEUTRAL',
        urgencyLevel: 'LOW',
        manipulationDetected: false,
        recommendation: 'SAFE'
      };
    }
  }

  /**
   * Parse texto de sentimento
   */
  parseSentimentText(text) {
    const analysis = {
      sentimentScore: 0,
      sentiment: 'NEUTRAL',
      urgencyLevel: 'LOW',
      manipulationDetected: false,
      emotionalTriggers: [],
      recommendation: 'SAFE'
    };

    const lowerText = text.toLowerCase();

    // Detect sentiment
    if (lowerText.includes('negative') || lowerText.includes('fear') || lowerText.includes('anger')) {
      analysis.sentiment = 'NEGATIVE';
      analysis.sentimentScore = -0.5;
    } else if (lowerText.includes('positive') || lowerText.includes('happy') || lowerText.includes('joy')) {
      analysis.sentiment = 'POSITIVE';
      analysis.sentimentScore = 0.5;
    }

    // Detect urgency
    if (lowerText.includes('critical') || lowerText.includes('immediately')) {
      analysis.urgencyLevel = 'CRITICAL';
      analysis.recommendation = 'WARNING';
    } else if (lowerText.includes('urgent') || lowerText.includes('asap')) {
      analysis.urgencyLevel = 'HIGH';
    } else if (lowerText.includes('soon') || lowerText.includes('limited')) {
      analysis.urgencyLevel = 'MEDIUM';
    }

    // Detect manipulation
    analysis.manipulationDetected = lowerText.includes('manipulation') || 
                                    lowerText.includes('pressure') ||
                                    lowerText.includes('exploitation');

    return analysis;
  }

  /**
   * Advanced sentiment analysis with multi-stage pipeline
   * Uses lexicons, linguistic features, VAD model, and AI analysis
   */
  async analyzeAdvanced(text, url = '') {
    try {
      // Validate input
      if (!text || typeof text !== 'string') {
        console.warn('Invalid text provided to analyzeAdvanced');
        return this.getDefaultAnalysis();
      }

      // Stage 1: Lexicon-based scoring
      const lexiconResults = this.lexicons.calculateLexiconScores(text);

      // Stage 2: Linguistic feature extraction
      const linguisticFeatures = this.linguisticAnalyzer.analyze(text);

      // Stage 3: VAD emotional analysis
      const emotionProfile = this.emotionAnalyzer.analyze(text, lexiconResults.scores);

      // Stage 4: AI-based semantic analysis
      const aiAnalysis = await this.analyzeWithAI(text, url);

      // Combine all results
      const manipulationScore = emotionProfile.manipulationScore;
      const riskAssessment = emotionProfile.riskAssessment;

      return {
        // Overall scores
        manipulationScore,
        trustworthiness: this.determineTrustworthiness(manipulationScore, aiAnalysis),
        recommendation: this.determineRecommendation(manipulationScore, emotionProfile, aiAnalysis),

        // Lexicon analysis
        lexiconScores: lexiconResults.scores,
        dominantLexicons: lexiconResults.dominantLexicons,

        // Emotional profile (VAD)
        emotionalState: emotionProfile.emotionalState,
        emotionalTriggers: emotionProfile.emotionalTriggers,
        valence: emotionProfile.valence,
        arousal: emotionProfile.arousal,
        dominance: emotionProfile.dominance,

        // Risk assessment
        riskAssessment,

        // Linguistic features
        linguisticFeatures: linguisticFeatures.overall,

        // AI analysis
        aiAnalysis
      };

    } catch (error) {
      console.error('Error in advanced sentiment analysis:', error);
      return this.getDefaultAnalysis();
    }
  }

  /**
   * Analyze with AI for semantic understanding
   */
  async analyzeWithAI(text, url) {
    try {
      // Validate input
      if (!text || typeof text !== 'string') {
        console.warn('Invalid text provided to analyzeWithAI');
        return null;
      }

      const prompt = `Analyze the sentiment and manipulation tactics in this content.

URL: ${url}
Content: ${text.substring(0, 2000)}

Provide VALID JSON (no newlines in strings, all strings properly escaped):
{
  "semanticScore": 0.5,
  "manipulationTechniques": "technique1, technique2",
  "pressureTactics": "tactic1, tactic2",
  "trustMarkers": "marker1, marker2",
  "socialEngineering": true,
  "overallAssessment": "brief description"
}

IMPORTANT: Return ONLY valid JSON. No markdown, no extra text. Ensure all quotes are closed.`;

      const response = await this.withSession({ temperature: 0.5 }, async (session) => await session.prompt(prompt));

      console.log('Raw AI response:', response);

      let analysis = null;

      // Try to extract and parse JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const jsonStr = jsonMatch[0];
          console.log('Attempting to parse JSON:', jsonStr.substring(0, 200));
          
          // Use robust parser
          analysis = this.robustJsonParse(jsonStr);
          
          if (analysis) {
            console.log('✅ Successfully parsed JSON');
          } else {
            console.warn('Robust parser returned null, using fallback');
            analysis = this.parseSentimentText(response);
          }
        } catch (jsonError) {
          console.warn('Failed to parse JSON, trying fallback parser:', jsonError.message);
          console.log('Problematic JSON:', jsonMatch[0].substring(0, 300));
          analysis = this.parseSentimentText(response);
        }
      } else {
        console.log('No JSON found in response, using fallback parser');
        analysis = this.parseSentimentText(response);
      }

      return analysis;

    } catch (error) {
      console.error('Error in AI analysis:', error.message);
      return {
        semanticScore: 0,
        manipulationTechniques: [],
        pressureTactics: [],
        trustMarkers: [],
        socialEngineering: false
      };
    }
  }

  /**
   * Determine trustworthiness level
   */
  determineTrustworthiness(manipulationScore, aiAnalysis) {
    if (manipulationScore > 0.7) return 'UNTRUSTWORTHY';
    if (manipulationScore > 0.4) return 'CAUTION';
    if (aiAnalysis.socialEngineering) return 'CAUTION';
    return 'TRUSTWORTHY';
  }

  /**
   * Determine recommendation level
   */
  determineRecommendation(manipulationScore, emotionProfile, aiAnalysis) {
    const riskLevel = emotionProfile.riskAssessment?.level || 'LOW';

    if (manipulationScore > 0.8 || riskLevel === 'HIGH') return 'DANGEROUS';
    if (manipulationScore > 0.6 || riskLevel === 'MEDIUM') return 'WARNING';
    if (manipulationScore > 0.3) return 'CAUTION';
    return 'SAFE';
  }

  /**
   * Get default analysis for error cases
   */
  getDefaultAnalysis() {
    return {
      manipulationScore: 0,
      trustworthiness: 'TRUSTWORTHY',
      recommendation: 'SAFE',
      lexiconScores: {},
      dominantLexicons: [],
      emotionalState: 'neutral',
      emotionalTriggers: [],
      valence: 0,
      arousal: 0,
      dominance: 0.5,
      riskAssessment: { score: 0, level: 'LOW', confidence: 0.5 },
      linguisticFeatures: {},
      aiAnalysis: {}
    };
  }

  /**
   * Analisa mensagens do WhatsApp
   */
  async analyzeWhatsAppMessage(message, sender = '') {
    try {
      const prompt = `Analyze this WhatsApp message for suspicious patterns:

Message: ${message}
Sender: ${sender}

Check for:
1. Urgency tactics (act now, limited time)
2. Suspicious links
3. Request for personal information
4. Suspicious file sharing
5. Impersonation attempts

Provide JSON:
{
  "isSuspicious": true/false,
  "riskLevel": "LOW|MEDIUM|HIGH",
  "indicators": ["indicator1", "indicator2"],
  "recommendation": "REPLY|IGNORE|BLOCK"
}`;

      const response = await this.withSession({ temperature: 0.3 }, async (session) => await session.prompt(prompt));
      
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      let analysis = null;
      
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      }

      return analysis;

    } catch (error) {
      return { isSuspicious: false, riskLevel: 'LOW', recommendation: 'REPLY' };
    }
  }
}

export default SentimentAnalyzer;
