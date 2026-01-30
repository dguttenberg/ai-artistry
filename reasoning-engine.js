/**
 * AI Artistry Reasoning Engine
 *
 * Core translation layer that converts creative input into structured prompt architectures.
 * Uses Claude API with specialized system prompt for creative-to-technical translation.
 */

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

const REASONING_ENGINE_SYSTEM_PROMPT = `You are AI Artistry's Creative Director Engine—a system that translates creative vision into technically precise generative AI prompts.

## Your Role

You function like the world's best creative director taking a brief handoff. You understand:
- What the creative MEANS, not just what they SAY
- Film grammar and visual storytelling conventions
- How generative AI tools interpret prompts
- What makes visuals feel cohesive across a sequence

Your job is to AMPLIFY creative intent, not flatten it. A vague, evocative brief should become a specific, evocative prompt—not a generic one.

## Core Operating Principles

### 1. Interpret Before You Ask
When given a creative brief, attempt to produce complete output first. Only ask clarifying questions if:
- Your confidence that the output matches intent falls below 70%
- A critical decision could go multiple valid directions with significantly different outcomes
- Missing information would cause continuity problems across shots

### 2. Show Your Work
When you make interpretive decisions, surface them explicitly in the \`interpretations\` array. Format:
- What was underspecified
- How you interpreted it
- Why you chose that interpretation
- What alternatives exist
- Confidence level (0-1)

### 3. Narrative Coherence Over Visual Accuracy
You are building a STORY, not disconnected images. Every shot must:
- Serve a narrative purpose (establish, develop, resolve, punctuate)
- Connect to adjacent shots (continuity of motion, eyeline, energy)
- Contribute to the emotional arc

### 4. Technical Specificity
Transform vague descriptors into technical parameters:

INSTEAD OF → USE
"cinematic" → "anamorphic lens flare, 2.39:1 aspect ratio, shallow depth of field at f/2.8"
"professional" → "commercial photography, diffused key light, fill ratio 2:1, no harsh shadows"
"energetic" → "dynamic camera movement, dutch angle, high contrast, saturated colors"
"natural" → "available light, skin-realistic tones, environmental color cast"
"moody" → "low-key lighting, lifted blacks, desaturated except accent colors"

### 5. Film Grammar Foundation
Apply cinematic conventions automatically:
- Wide shots establish, close-ups create intimacy
- Camera movement creates energy (static = contemplative, tracking = urgency)
- Low angles convey power, high angles create vulnerability
- Shallow DOF isolates subject, deep DOF emphasizes environment
- Color temperature signals time (warm = golden hour, cool = night/clinical)

## Output Requirements

Always output valid JSON matching the prompt_architecture_schema. Include:
- Complete copy/paste prompts in shots[].prompt.full_prompt
- Component breakdown in shots[].prompt.prompt_components
- All interpretive decisions in interpretations[]
- Missing info that would help in missing_info[]

## Character Consistency Protocol

For any character appearing in multiple shots:
1. Lock core attributes in the character definition
2. Include full description in EVERY shot prompt where character appears
3. Note flexible attributes that can vary (pose, expression, position)

## Tone Calibration

Adjust interpretive style based on input:
- Highly specified input → Minimal interpretation, execute precisely
- Loose/evocative input → More interpretation, surface decisions for review
- Technical input → Match technical language in output
- Emotional/conceptual input → Translate to technical while preserving feeling

Remember: Your goal is to make creatives feel like their vision was understood and elevated, not reduced to checkboxes.`;

// ============================================================================
// FILM GRAMMAR REFERENCE (for prompt construction)
// ============================================================================

const FILM_GRAMMAR = {
  shotTypes: {
    'extreme wide': { narrative: 'establish scale, show isolation', emotional: 'awe, context' },
    'wide': { narrative: 'establish location, relationships', emotional: 'orientation' },
    'medium wide': { narrative: 'action in context', emotional: 'balance' },
    'medium': { narrative: 'dialogue, interaction', emotional: 'neutral, conversational' },
    'medium close': { narrative: 'focus on expression', emotional: 'engagement' },
    'close-up': { narrative: 'emphasize emotion/detail', emotional: 'intimacy, intensity' },
    'extreme close-up': { narrative: 'isolate detail', emotional: 'tension, significance' }
  },

  cameraMovement: {
    'static': { energy: 'low', use: 'establishing, dialogue, product beauty' },
    'pan': { energy: 'medium', use: 'reveals space, follows action' },
    'tilt': { energy: 'medium', use: 'reveals scale, vertical movement' },
    'dolly': { energy: 'medium-high', use: 'following action, building tension' },
    'push in': { energy: 'building', use: 'increasing intensity, realization' },
    'pull out': { energy: 'releasing', use: 'endings, revelations' },
    'tracking': { energy: 'high', use: 'following subject, urgency' },
    'handheld': { energy: 'high', use: 'action, authenticity' }
  },

  lightingSetups: {
    'high key': { contrast: 'low', mood: 'upbeat, commercial, clean' },
    'low key': { contrast: 'high', mood: 'moody, dramatic, mysterious' },
    'natural': { contrast: 'varies', mood: 'authentic, documentary' },
    'rembrandt': { contrast: 'medium', mood: 'classic, dignified' },
    'backlit': { contrast: 'high', mood: 'ethereal, dramatic separation' }
  },

  colorTemperature: {
    '2700K': 'warm amber, candlelight, intimacy',
    '3200K': 'warm tungsten, indoor cozy',
    '4500K': 'neutral, balanced indoor',
    '5600K': 'daylight, neutral outdoor',
    '6500K': 'cool blue, overcast, clinical'
  }
};

// ============================================================================
// TONE TRANSLATION MAP
// ============================================================================

const TONE_TRANSLATIONS = {
  // Emotional tones → Technical parameters
  'whimsical': 'playful camera movements, bright saturated colors, slight wide-angle distortion, bouncy timing',
  'moody': 'low-key lighting, lifted blacks, desaturated palette except accent colors, slower camera movements',
  'energetic': 'dynamic camera movement, quick cuts, high contrast, saturated colors, dutch angles',
  'elegant': 'smooth slow camera movements, shallow depth of field, soft diffused lighting, muted luxury palette',
  'raw': 'handheld camera, available light, high grain, documentary style, imperfect framing',
  'dreamy': 'soft focus edges, diffused lighting, pastel palette, slow motion, lens flares',
  'intense': 'tight framing, high contrast, desaturated, fast push-ins, shallow DOF',
  'warm': 'golden hour lighting, tungsten color temperature, soft shadows, earth tone palette',
  'clinical': 'high-key lighting, cool color temperature, sharp focus, symmetrical framing',
  'nostalgic': 'film grain, slightly desaturated, warm color cast, vintage lens characteristics',
  'luxurious': 'rich blacks, selective focus, metallic accents, slow elegant movement, diffused highlights',
  'playful': 'bright colors, dynamic angles, quick movements, slight exaggeration in scale'
};

// ============================================================================
// CORE API FUNCTIONS
// ============================================================================

/**
 * Main entry point: Generate a complete prompt architecture from creative input
 */
async function generateArchitecture(creativeInput, options = {}) {
  const {
    platform = 'platform-agnostic',
    shotCount = null,
    brandContext = null,
    apiKey = null
  } = options;

  // Build the user prompt
  const userPrompt = buildUserPrompt(creativeInput, { platform, shotCount, brandContext });

  // Make API call
  const response = await callClaudeAPI(userPrompt, apiKey);

  // Parse and validate response
  const architecture = parseResponse(response);

  // Add metadata
  architecture.metadata = {
    ...architecture.metadata,
    schema_version: '1.0.0',
    created_at: new Date().toISOString(),
    platform_target: platform
  };

  return architecture;
}

/**
 * Process with confidence gating - returns result or questions if confidence is low
 */
async function processWithConfidenceGating(creativeInput, options = {}) {
  const result = await generateArchitecture(creativeInput, options);

  // Check confidence threshold
  if (result.metadata.confidence_score >= 0.7) {
    return {
      status: 'complete',
      architecture: result
    };
  }

  // Low confidence: extract critical questions
  const criticalQuestions = (result.missing_info || [])
    .filter(q => q.criticality === 'high' || !q.default_used)
    .slice(0, 3);

  if (criticalQuestions.length > 0) {
    return {
      status: 'needs_clarification',
      architecture: result, // Still provide best-effort
      questions: criticalQuestions.map(q => ({
        question: q.question,
        context: q.why_it_matters,
        currentAssumption: q.default_used
      }))
    };
  }

  // Low confidence but no critical questions - surface caveats
  return {
    status: 'complete_with_caveats',
    architecture: result,
    caveats: (result.interpretations || [])
      .filter(i => i.confidence < 0.7)
      .map(i => ({
        element: i.element,
        interpretation: i.interpretation,
        alternatives: i.alternatives
      }))
  };
}

/**
 * Refine an existing architecture based on feedback
 */
async function refineArchitecture(currentArchitecture, feedback, options = {}) {
  const {
    targetShots = null, // Array of shot numbers to refine, or null for all
    apiKey = null
  } = options;

  const refinementPrompt = `
## Current Architecture

${JSON.stringify(currentArchitecture, null, 2)}

## Feedback

${feedback}

## Instructions

${targetShots
    ? `Refine shots ${targetShots.join(', ')} based on the feedback while maintaining continuity with other shots.`
    : 'Refine the entire architecture based on the feedback.'
  }

Preserve all elements not addressed by the feedback. Maintain character consistency and continuity.
Output the complete updated architecture as valid JSON matching the schema.
`;

  const response = await callClaudeAPI(refinementPrompt, apiKey);
  const refined = parseResponse(response);

  // Update metadata
  refined.metadata = {
    ...refined.metadata,
    updated_at: new Date().toISOString(),
    refinement_note: feedback.substring(0, 100) + (feedback.length > 100 ? '...' : '')
  };

  return refined;
}

/**
 * Regenerate specific shots while maintaining consistency
 */
async function regenerateShots(currentArchitecture, shotNumbers, direction = '', options = {}) {
  const feedback = direction
    ? `Regenerate shots ${shotNumbers.join(', ')} with this direction: ${direction}`
    : `Regenerate shots ${shotNumbers.join(', ')} with fresh creative interpretation while maintaining the overall style and continuity.`;

  return refineArchitecture(currentArchitecture, feedback, {
    ...options,
    targetShots: shotNumbers
  });
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function buildUserPrompt(input, options) {
  const { platform, shotCount, brandContext } = options;

  let inputSection = '';

  if (typeof input === 'string') {
    // Plain text input
    inputSection = input;
  } else if (input.type === 'text') {
    inputSection = input.content;
  } else if (input.type === 'deck') {
    inputSection = `[Parsed from deck: ${input.filename}]\n\n${input.parsedContent}`;
  } else if (input.type === 'structured') {
    // Already structured input (e.g., from wizard)
    inputSection = formatStructuredInput(input);
  }

  // Add visual references if present
  let referencesSection = '';
  if (input.references && input.references.length > 0) {
    referencesSection = `\n## Visual References\n${input.references.map((r, i) =>
      `${i + 1}. ${r.description}${r.url ? ` (${r.url})` : ''}`
    ).join('\n')}`;
  }

  return `
## Creative Input

${inputSection}
${referencesSection}

## Requirements

- Target platform: ${platform}
- Number of shots: ${shotCount || 'infer from content (typically 4-8 for a :15-:30 spot)'}
- Output format: Complete JSON matching the prompt_architecture_schema
${brandContext ? `- Brand context: ${brandContext}` : ''}

## Instructions

Analyze this creative input and produce a complete prompt architecture.

You MUST include:
1. All required schema fields (metadata, project, global_style, shots)
2. Copy/paste ready prompts for each shot in shots[].prompt.full_prompt
3. Component breakdown in shots[].prompt.prompt_components
4. All interpretive decisions you made in the interpretations[] array
5. Any questions that would improve the output in missing_info[]

For EACH shot prompt, structure it as:
[Subject with full character description if applicable] + [Action/motion] + [Environment] + [Lighting] + [Camera/framing] + [Style/quality markers]

Output valid JSON only. No markdown, no explanation outside the JSON.
`;
}

function formatStructuredInput(input) {
  const parts = [];

  if (input.concept) parts.push(`Concept: ${input.concept}`);
  if (input.tone) parts.push(`Tone: ${Array.isArray(input.tone) ? input.tone.join(', ') : input.tone}`);
  if (input.narrative) parts.push(`Narrative: ${input.narrative}`);
  if (input.characters) {
    parts.push(`Characters:\n${input.characters.map(c =>
      `- ${c.name}: ${c.description}`
    ).join('\n')}`);
  }
  if (input.shots) {
    parts.push(`Shot ideas:\n${input.shots.map((s, i) =>
      `${i + 1}. ${s}`
    ).join('\n')}`);
  }
  if (input.style) parts.push(`Style notes: ${input.style}`);
  if (input.constraints) parts.push(`Constraints: ${input.constraints}`);

  return parts.join('\n\n');
}

async function callClaudeAPI(userPrompt, apiKey) {
  // This would be replaced with actual API call in production
  // For now, structure the request that would be sent

  const requestBody = {
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8000,
    system: REASONING_ENGINE_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: userPrompt
      }
    ]
  };

  // In browser environment, this would call your backend endpoint
  // In Node environment, this would call Anthropic directly

  if (typeof window !== 'undefined') {
    // Browser: call backend API
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt: userPrompt })
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status}`);
    }

    const data = await response.json();
    return data.content;
  } else {
    // Node.js: would use Anthropic SDK
    // const anthropic = new Anthropic({ apiKey });
    // const response = await anthropic.messages.create(requestBody);
    // return response.content[0].text;

    throw new Error('Direct API calls require Node.js environment with Anthropic SDK');
  }
}

function parseResponse(responseText) {
  // Extract JSON from response (handle potential markdown wrapping)
  let jsonStr = responseText;

  // Remove markdown code blocks if present
  if (jsonStr.includes('```json')) {
    jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  } else if (jsonStr.includes('```')) {
    jsonStr = jsonStr.replace(/```\n?/g, '');
  }

  // Trim whitespace
  jsonStr = jsonStr.trim();

  try {
    const parsed = JSON.parse(jsonStr);
    return validateArchitecture(parsed);
  } catch (e) {
    console.error('Failed to parse response:', e);
    console.error('Response was:', jsonStr.substring(0, 500));
    throw new Error('Failed to parse architecture response as JSON');
  }
}

function validateArchitecture(arch) {
  // Basic validation - ensure required fields exist
  const required = ['metadata', 'project', 'global_style', 'shots'];
  const missing = required.filter(field => !arch[field]);

  if (missing.length > 0) {
    throw new Error(`Architecture missing required fields: ${missing.join(', ')}`);
  }

  // Ensure shots have prompts
  arch.shots.forEach((shot, i) => {
    if (!shot.prompt || !shot.prompt.full_prompt) {
      throw new Error(`Shot ${i + 1} missing full_prompt`);
    }
  });

  // Ensure confidence score exists
  if (typeof arch.metadata.confidence_score !== 'number') {
    arch.metadata.confidence_score = 0.8; // Default if not provided
  }

  // Ensure arrays exist
  arch.interpretations = arch.interpretations || [];
  arch.missing_info = arch.missing_info || [];
  arch.characters = arch.characters || [];
  arch.environments = arch.environments || [];

  return arch;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Extract copy/paste prompts from architecture
 */
function extractPrompts(architecture) {
  return architecture.shots.map(shot => ({
    shotNumber: shot.shot_number,
    shotId: shot.shot_id,
    narrativeBeat: shot.narrative_beat,
    prompt: shot.prompt.full_prompt,
    negativePrompt: shot.prompt.negative_prompt || null
  }));
}

/**
 * Get human-readable summary of interpretations
 */
function summarizeInterpretations(architecture) {
  if (!architecture.interpretations || architecture.interpretations.length === 0) {
    return 'No significant interpretations were made.';
  }

  return architecture.interpretations.map(i =>
    `• **${i.element}**: ${i.interpretation}\n  _Confidence: ${Math.round(i.confidence * 100)}%${i.alternatives && i.alternatives.length > 0
      ? ` | Alternatives: ${i.alternatives.join(', ')}`
      : ''
    }_`
  ).join('\n\n');
}

/**
 * Translate a tone word to technical parameters
 */
function translateTone(tone) {
  const normalized = tone.toLowerCase().trim();
  return TONE_TRANSLATIONS[normalized] || tone;
}

/**
 * Get film grammar suggestion for a narrative beat
 */
function suggestFilmGrammar(narrativeBeat) {
  const beat = narrativeBeat.toLowerCase();

  if (beat.includes('establish') || beat.includes('intro') || beat.includes('open')) {
    return {
      shotType: 'wide',
      movement: 'static or slow pan',
      rationale: 'Wide shots establish context and orient the viewer'
    };
  }

  if (beat.includes('reveal') || beat.includes('discover')) {
    return {
      shotType: 'medium to close-up',
      movement: 'push in or crane reveal',
      rationale: 'Movement toward subject builds anticipation for reveal'
    };
  }

  if (beat.includes('action') || beat.includes('dynamic')) {
    return {
      shotType: 'medium wide',
      movement: 'tracking or handheld',
      rationale: 'Shows action in context with energetic camera work'
    };
  }

  if (beat.includes('emotion') || beat.includes('reaction') || beat.includes('moment')) {
    return {
      shotType: 'close-up',
      movement: 'static or subtle push',
      rationale: 'Close framing emphasizes emotional content'
    };
  }

  if (beat.includes('product') || beat.includes('hero') || beat.includes('beauty')) {
    return {
      shotType: 'medium close to close-up',
      movement: 'slow dolly or static',
      rationale: 'Controlled movement showcases product with production value'
    };
  }

  if (beat.includes('end') || beat.includes('resolve') || beat.includes('conclude')) {
    return {
      shotType: 'medium to wide',
      movement: 'pull out or static',
      rationale: 'Pulling back releases tension and provides closure'
    };
  }

  return {
    shotType: 'medium',
    movement: 'context-dependent',
    rationale: 'Default neutral framing - specify narrative intent for better suggestion'
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

// For ES modules
export {
  generateArchitecture,
  processWithConfidenceGating,
  refineArchitecture,
  regenerateShots,
  extractPrompts,
  summarizeInterpretations,
  translateTone,
  suggestFilmGrammar,
  FILM_GRAMMAR,
  TONE_TRANSLATIONS,
  REASONING_ENGINE_SYSTEM_PROMPT
};

// For CommonJS (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    generateArchitecture,
    processWithConfidenceGating,
    refineArchitecture,
    regenerateShots,
    extractPrompts,
    summarizeInterpretations,
    translateTone,
    suggestFilmGrammar,
    FILM_GRAMMAR,
    TONE_TRANSLATIONS,
    REASONING_ENGINE_SYSTEM_PROMPT
  };
}
