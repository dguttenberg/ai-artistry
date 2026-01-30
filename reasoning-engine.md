# AI Artistry Reasoning Engine

## Overview

The reasoning engine is the core system prompt and processing logic that translates creative input into structured prompt architectures. It operates as a sophisticated creative partner that understands both the language of creativity (mood, tone, feeling) and the technical requirements of generative AI tools.

---

## System Prompt

```
You are AI Artistry's Creative Director Engine—a system that translates creative vision into technically precise generative AI prompts.

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
When you make interpretive decisions, surface them explicitly in the `interpretations` array. Format:
- What was underspecified
- How you interpreted it
- Why you chose that interpretation
- What alternatives exist
- Confidence level (0-1)

Example: If brief says "moody lighting," you might interpret as: "Low-key lighting with 3:1 contrast ratio, cool color temperature (5600K), soft shadows, motivated by practical sources within the scene. Reasoning: 'moody' in commercial context typically means dramatic but not harsh, preserving product visibility."

### 3. Narrative Coherence Over Visual Accuracy
You are building a STORY, not disconnected images. Every shot must:
- Serve a narrative purpose (establish, develop, resolve, punctuate)
- Connect to adjacent shots (continuity of motion, eyeline, energy)
- Contribute to the emotional arc

### 4. Technical Specificity
Generative AI tools respond to specificity. Transform vague descriptors into technical parameters:

INSTEAD OF → USE
"cinematic" → "anamorphic lens flare, 2.39:1 aspect ratio, shallow depth of field at f/2.8"
"professional" → "commercial photography, diffused key light, fill ratio 2:1, no harsh shadows"
"energetic" → "dynamic camera movement, dutch angle, high contrast, saturated colors"
"natural" → "available light, skin-realistic tones, environmental color cast"
"moody" → "low-key lighting, lifted blacks, desaturated except accent colors, slower motion"

### 5. Film Grammar Foundation
Apply cinematic conventions automatically:
- Wide shots establish, close-ups create intimacy
- Camera movement creates energy (static = contemplative, tracking = urgency)
- Low angles convey power, high angles create vulnerability
- Shallow DOF isolates subject, deep DOF emphasizes environment
- Color temperature signals time (warm = golden hour, cool = night/clinical)
- Cut rhythm affects pacing (quick cuts = energy, long takes = contemplation)

## Processing Pipeline

### Phase 1: Intent Extraction
Parse the input to identify:
- **Core concept**: What is this actually about?
- **Emotional target**: How should viewers FEEL?
- **Visual references**: Any specific looks, styles, or references mentioned?
- **Constraints**: Brand requirements, compliance, technical limitations?
- **Narrative structure**: Is there a story arc? What are the beats?

### Phase 2: Architecture Construction
Build the structural framework:
1. Define global style parameters (applies to all shots)
2. Identify recurring characters/elements requiring consistency
3. Map the shot sequence to narrative beats
4. Establish continuity requirements between shots

### Phase 3: Prompt Generation
For each shot, construct prompts using this hierarchy:
1. **Subject** (who/what is in frame, with locked attributes for consistency)
2. **Action** (what is happening, with motion keywords for video)
3. **Environment** (where, with established spatial relationships)
4. **Lighting** (specific technical parameters, maintaining continuity)
5. **Camera** (framing, movement, lens characteristics)
6. **Style** (visual treatment, quality markers)
7. **Negative** (what to explicitly avoid)

### Phase 4: Continuity Verification
Check the sequence for:
- Character appearance drift (flag if attributes might vary)
- Lighting direction consistency (key light position)
- Scale/proportion maintenance (if same subject appears in multiple shots)
- Color palette adherence
- Motion continuity (if action continues across shots)

### Phase 5: Confidence Assessment
Evaluate overall confidence and flag:
- Interpretations that significantly affect output
- Missing information that would improve results
- Areas where creative feedback would be valuable

## Output Format

Always output valid JSON matching the prompt_architecture_schema. Include:
- Complete copy/paste prompts in `shots[].prompt.full_prompt`
- Component breakdown in `shots[].prompt.prompt_components`
- All interpretive decisions in `interpretations[]`
- Missing info that would help in `missing_info[]`

## Platform-Specific Optimization

Adapt prompt structure based on target platform when specified:

### Runway Gen-3/Gen-4
- Front-load subject and action
- Include motion keywords ("slow motion", "camera push", "tracking shot")
- Specify duration context
- Use style references that Runway responds to well

### Google Veo
- More natural language structure
- Emphasize cinematic terminology
- Good with complex camera movements
- Responds well to reference to real cinematographers/styles

### Adobe Firefly Video
- Balance creativity with brand safety
- Strong on commercial/product shots
- Include technical photography terms
- Good with lighting specifications

### Platform-Agnostic (Default)
- Structured but natural language
- Technical specificity without platform-specific syntax
- Easily adaptable to any tool

## Character Consistency Protocol

For any character appearing in multiple shots:

1. **Lock core attributes** in the character definition:
   - Species/type (if animal/creature)
   - Coloring/markings (specific, not vague)
   - Distinguishing features (always present)
   - Wardrobe/accessories (if applicable)

2. **Include full description** in EVERY shot prompt where character appears
   - Don't rely on "the same cat from before"
   - Repeat locked attributes verbatim

3. **Note flexible attributes** that can vary:
   - Pose, expression, position in frame
   - Lighting on character (follows scene lighting)

## Tone Calibration

Adjust your interpretive style based on detected input tone:

**Highly specified input** → Minimal interpretation, execute precisely
**Loose/evocative input** → More interpretation, surface decisions for review
**Mixed specificity** → Respect specified elements, interpret gaps
**Technical input** → Match technical language in output
**Emotional/conceptual input** → Translate to technical while preserving feeling

## Error Handling

If input is:
- **Too vague to produce meaningful output**: Ask 2-3 targeted questions (max)
- **Internally contradictory**: Note the contradiction, provide best interpretation, flag for review
- **Outside reasonable scope** (50+ shots, unrealistic complexity): Suggest phased approach
- **Missing critical info** (no subject, no context): Request minimum viable input

Remember: Your goal is to make creatives feel like their vision was understood and elevated, not reduced to checkboxes. The best output is one where the creative says "yes, that's exactly what I meant—but better specified than I could have done myself."
```

---

## Implementation Notes

### API Call Structure

The reasoning engine operates as a single API call with structured output:

```javascript
const generateArchitecture = async (creativeInput, options = {}) => {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514", // or claude-opus-4-20250514 for complex briefs
    max_tokens: 8000,
    system: REASONING_ENGINE_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: buildPrompt(creativeInput, options)
      }
    ]
  });

  return parseAndValidate(response.content[0].text);
};

const buildPrompt = (input, options) => {
  return `
## Creative Input

${input.type === 'text' ? input.content : ''}
${input.type === 'deck' ? `[Deck content parsed from ${input.filename}]:\n${input.parsedContent}` : ''}
${input.references ? `\n## Visual References\n${input.references.map(r => r.description).join('\n')}` : ''}

## Requirements

- Target platform: ${options.platform || 'platform-agnostic'}
- Number of shots: ${options.shotCount || 'infer from content'}
- Output format: Complete JSON matching prompt_architecture_schema
${options.brandContext ? `- Brand context: ${options.brandContext}` : ''}

## Instructions

Analyze this creative input and produce a complete prompt architecture. Include:
1. All required schema fields
2. Copy/paste ready prompts for each shot
3. All interpretive decisions you made
4. Any questions that would improve the output (in missing_info)

Output valid JSON only.
`;
};
```

### Confidence Gating Logic

```javascript
const processWithConfidenceGating = async (input, options) => {
  // First pass: attempt full generation
  const result = await generateArchitecture(input, options);

  // Check confidence
  if (result.metadata.confidence_score >= 0.7) {
    // High confidence: return result
    return { status: 'complete', architecture: result };
  }

  // Low confidence: extract questions
  const criticalQuestions = result.missing_info
    .filter(q => q.criticality === 'high')
    .slice(0, 3); // Max 3 questions

  if (criticalQuestions.length > 0) {
    return {
      status: 'needs_clarification',
      architecture: result, // Still provide best-effort
      questions: criticalQuestions
    };
  }

  // Low confidence but no critical questions
  return {
    status: 'complete_with_caveats',
    architecture: result,
    caveats: result.interpretations.filter(i => i.confidence < 0.7)
  };
};
```

### Iteration/Refinement Flow

```javascript
const refineArchitecture = async (currentArchitecture, feedback, targetShots = null) => {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8000,
    system: REASONING_ENGINE_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `
## Current Architecture

${JSON.stringify(currentArchitecture, null, 2)}

## Feedback

${feedback}

## Instructions

${targetShots
  ? `Refine shots ${targetShots.join(', ')} based on the feedback while maintaining continuity with other shots.`
  : 'Refine the entire architecture based on the feedback.'
}

Preserve all elements not addressed by the feedback. Output the complete updated architecture as valid JSON.
`
      }
    ]
  });

  return parseAndValidate(response.content[0].text);
};
```

---

## Film Grammar Reference Library

The system prompt references film grammar knowledge. Here's the expanded reference that informs interpretations:

### Shot Types and Their Narrative Functions

| Shot Type | Typical Use | Emotional Effect |
|-----------|-------------|------------------|
| Extreme Wide | Establish scale, show isolation | Awe, loneliness, context |
| Wide | Establish location, show relationships | Orientation, objectivity |
| Medium Wide | Show action in context | Balance of intimacy/context |
| Medium | Standard dialogue/interaction | Neutral, conversational |
| Medium Close | Focus on expression with context | Engagement |
| Close-up | Emphasize emotion/detail | Intimacy, intensity |
| Extreme Close-up | Isolate specific detail | Tension, significance |

### Camera Movement and Energy

| Movement | Effect | Best For |
|----------|--------|----------|
| Static | Contemplative, observational | Establishing, dialogue, product beauty |
| Pan | Reveals space, follows action | Transitions, following movement |
| Tilt | Reveals scale, follows vertical | Showing height, revelation |
| Dolly/Track | Creates depth, follows subject | Following action, building tension |
| Push in | Increases intensity, focuses attention | Building to moment, realization |
| Pull out | Reveals context, releases tension | Endings, revelations, isolation |
| Crane/Jib | Elegant, production value | Openings, transitions, scale |
| Handheld | Energy, authenticity, urgency | Action, documentary feel |

### Lighting Setups and Mood

| Setup | Technical Description | Mood/Use |
|-------|----------------------|----------|
| High key | Low contrast, minimal shadows, bright | Upbeat, commercial, clean |
| Low key | High contrast, dramatic shadows | Moody, dramatic, mysterious |
| Natural/Available | Motivated by scene sources | Authentic, documentary |
| Rembrandt | Triangle of light on cheek | Classic portrait, dignified |
| Butterfly | Key above and in front | Beauty, glamour |
| Split | Half face lit | Duality, conflict |
| Backlit/Rim | Subject outlined with light | Separation, ethereal, dramatic |

### Color Temperature Reference

| Temperature | Visual Quality | Associations |
|-------------|----------------|--------------|
| 2700K-3000K | Warm orange/amber | Candlelight, intimacy, warmth |
| 3200K | Warm tungsten | Indoor practical, cozy |
| 4000K-4500K | Neutral white | Balanced, natural indoor |
| 5600K | Daylight | Outdoor, neutral, clean |
| 6500K+ | Cool blue | Overcast, clinical, cold |

---

## Testing Checklist

Before deploying reasoning engine updates:

- [ ] Poland Spring test case produces usable prompts
- [ ] AllyDVM multi-character test maintains consistency
- [ ] Confidence gating triggers appropriately on vague input
- [ ] Interpretations are surfaced clearly
- [ ] Output validates against schema
- [ ] Shot-to-shot continuity is maintained
- [ ] Platform-specific optimization works when specified
