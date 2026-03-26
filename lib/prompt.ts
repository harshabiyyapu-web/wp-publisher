/**
 * Language prompt builder — ports PHP get_language_prompt from claude-content-rewriter.php
 * preserve_title is ALWAYS true in the dashboard (same exact title on all sites).
 */

export interface PromptData {
  system: string;
  user: string;
}

const LANGUAGE_NAMES: Record<string, string> = {
  english: "English",
  hindi: "Hindi",
  spanish: "Spanish",
  telugu: "Telugu",
  polish: "Polish",
  italian: "Italian",
  japanese: "Japanese",
  german: "German",
  dutch: "Dutch",
  swedish: "Swedish",
  french: "French",
  tamil: "Tamil",
  marathi: "Marathi",
  gujarati: "Gujarati",
};

// preserve_title is always true — title never translated
const PRESERVE_INSTRUCTION =
  "!!! CRITICAL OVERRIDE: DO NOT TRANSLATE THE TITLE. KEEP IT EXACTLY AS SOURCE. " +
  "Output the title EXACTLY as it appears in the source input. " +
  "Even if translating content, keep title in original language.";

export function getLanguagePrompt(
  language: string,
  customTemplate?: string
): PromptData {
  const langKey = language.toLowerCase();
  const targetLanguage = LANGUAGE_NAMES[langKey] ?? capitalize(langKey);

  // title rule is always preserve
  const titleRule = PRESERVE_INSTRUCTION;
  const responseTitleInstruction = "- EXACT ORIGINAL (NO TRANSLATE)";

  let template: PromptData;

  if (customTemplate && customTemplate.trim()) {
    template = {
      system: `You are a senior SEO content strategist. You write in ${targetLanguage}.`,
      user: customTemplate,
    };
  } else {
    template = {
      system:
        `You are a senior SEO content strategist, professional copywriter, and experienced journalist. ` +
        `You write ONLY in ${targetLanguage}. ` +
        `Your expertise is in creating highly engaging, SEO-optimized blog content that ranks well on Google.`,
      user: `
TASK: Rewrite the article below into a professional, SEO-optimized blog post in ${targetLanguage.toUpperCase()}.

CRITICAL RULES:
1. Write EVERYTHING in ${targetLanguage} - title, content, headings, FAQ, tags, meta description.
2. TITLE: {{title_instruction}}
3. Do NOT verify facts. Just rewrite what is given.
4. Make the content 100% unique and plagiarism-free.
5. Do NOT include the title or H1 heading at the start of CONTENT - WordPress displays the title separately. Start CONTENT directly with the introduction paragraph.

CONTENT STRUCTURE:
- MINIMUM 800 WORDS - this is CRITICAL. The article MUST be at least 800 words long.
- Compelling introduction paragraph
- Use H2 headings every 200-300 words
- Use H3 for subheadings
- Short paragraphs (2-3 sentences)
- Use bullet points where appropriate
- Bold important keywords
- Strong conclusion

FAQ SECTION (MANDATORY - USE THIS EXACT HTML):
<div class="wp-block-rank-math-faq-block">
   <div class="rank-math-faq-item">
      <h3 class="rank-math-question">Question here?</h3>
      <div class="rank-math-answer">Answer here.</div>
   </div>
</div>
Include 4-5 FAQs in ${targetLanguage}.

RESPONSE FORMAT (FOLLOW EXACTLY):
TITLE: [${targetLanguage} title {{response_title_instruction}}]
SLUG: [url-friendly-slug-max-30-chars]
META_DESCRIPTION: [Under 155 characters in ${targetLanguage}]
TAGS: [tag1, tag2, tag3, tag4]
CONTENT:
[Full article in ${targetLanguage} with HTML]
[FAQ Block with rank-math classes]
`,
    };
  }

  // Variable substitution
  let prompt: PromptData = {
    system: template.system,
    user: template.user
      .replace(/\{\{title_instruction\}\}/g, titleRule)
      .replace(/\{\{target_language\}\}/g, targetLanguage)
      .replace(/\{\{response_title_instruction\}\}/g, responseTitleInstruction),
  };

  // Extra safety prefix for preserve title
  if (!prompt.user.includes("!!! CRITICAL OVERRIDE")) {
    prompt.user = "!!! CRITICAL OVERRIDE: DO NOT TRANSLATE TITLE. KEEP EXACTLY AS SOURCE. !!!\n" + prompt.user;
  }

  return prompt;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
