import type { InputData, Stage1Output, ISQ, ExcelData } from "../types";

function normalizeSpecName(name: string): string {
  let normalized = name.toLowerCase().trim();
  normalized = normalized.replace(/[()\-_,.;]/g, ' ');
  
  const standardizations: Record<string, string> = {
    'material': 'material',
    'grade': 'grade',
    'thk': 'thickness',
    'thickness': 'thickness',
    'type': 'type',
    'shape': 'shape',
    'size': 'size',
    'dimension': 'size',
    'length': 'length',
    'width': 'width',
    'height': 'height',
    'dia': 'diameter',
    'diameter': 'diameter',
    'color': 'color',
    'colour': 'color',
    'finish': 'finish',
    'surface': 'finish',
    'weight': 'weight',
    'wt': 'weight',
    'capacity': 'capacity',
    'brand': 'brand',
    'model': 'model',
    'quality': 'quality',
    'standard': 'standard',
    'specification': 'spec',
    'perforation': 'hole',
    'hole': 'hole',
    'pattern': 'pattern',
    'design': 'design',
    'application': 'application',
    'usage': 'application'
  };
  
  const words = normalized.split(/\s+/).filter(w => w.length > 0);
  const standardizedWords = words.map(word => {
    if (standardizations[word]) {
      return standardizations[word];
    }
    
    for (const [key, value] of Object.entries(standardizations)) {
      if (word.includes(key) || key.includes(word)) {
        return value;
      }
    }
    
    return word;
  });
  
  const uniqueWords = [...new Set(standardizedWords)];
  const fillerWords = ['sheet', 'plate', 'pipe', 'rod', 'bar', 'in', 'for', 'of', 'the'];
  const filteredWords = uniqueWords.filter(word => !fillerWords.includes(word));
  
  return filteredWords.join(' ').trim();
}

function isSemanticallySimilar(spec1: string, spec2: string): boolean {
  const norm1 = normalizeSpecName(spec1);
  const norm2 = normalizeSpecName(spec2);
  
  if (norm1 === norm2) return true;
  if (norm1.includes(norm2) || norm2.includes(norm1)) return true;
  
  const synonymGroups = [
    ['material', 'composition', 'fabric'],
    ['grade', 'quality', 'class', 'standard'],
    ['thickness', 'thk', 'gauge'],
    ['size', 'dimension', 'measurement'],
    ['diameter', 'dia', 'bore'],
    ['length', 'long', 'lng'],
    ['width', 'breadth', 'wide'],
    ['height', 'high', 'depth'],
    ['color', 'colour', 'shade'],
    ['finish', 'surface', 'coating', 'polish'],
    ['weight', 'wt', 'mass'],
    ['type', 'kind', 'variety', 'style'],
    ['shape', 'form', 'profile'],
    ['hole', 'perforation', 'aperture'],
    ['pattern', 'design', 'arrangement'],
    ['application', 'use', 'purpose', 'usage']
  ];
  
  for (const group of synonymGroups) {
    const hasSpec1 = group.some(word => norm1.includes(word));
    const hasSpec2 = group.some(word => norm2.includes(word));
    if (hasSpec1 && hasSpec2) return true;
  }
  
  return false;
}

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 2,
  baseDelay = 5000
): Promise<Response> {
  let lastStatus: number | undefined;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const response = await fetch(url, options);

    if (response.ok) return response;

    lastStatus = response.status;

    if (response.status === 429 || response.status === 503 || response.status === 502) {
      if (attempt === retries) {
        throw new Error(`Gemini overloaded after ${retries + 1} attempts. Last status code: ${lastStatus}`);
      }
      const waitTime = baseDelay * Math.pow(2, attempt);
      console.warn(`Gemini overloaded (${response.status}). Retrying in ${waitTime}ms`);
      await sleep(waitTime);
      continue;
    }

    const err = await response.text();
    throw new Error(`Gemini API error ${lastStatus}: ${err}`);
  }

  throw new Error("Unreachable");
}

function extractJSONFromGemini(response) {
  try {
    if (!response?.candidates?.length) {
      console.warn("No candidates in response, returning null for fallback");
      return null;
    }

    const parts =
      response.candidates[0]?.content?.parts ||
      response.candidates[0]?.content ||
      [];

    let rawText = "";

    for (const part of parts) {
      if (typeof part.text === "string") {
        rawText += part.text + "\n";
      }

      if (part.json) {
        return part.json;
      }
    }

    if (!rawText.trim()) {
      console.warn("No text content in response, returning null for fallback");
      return null;
    }

    let cleaned = rawText
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) cleaned = match[0];

    cleaned = cleaned.replace(/,(\s*[\]}])/g, "$1");

    try {
      return JSON.parse(cleaned);
    } catch (parseErr) {
      console.warn("JSON parse failed, returning null for fallback:", parseErr);
      return null;
    }
  } catch (error) {
    console.warn("Unexpected error in extractJSONFromGemini:", error);
    return null;
  }
}

const STAGE1_API_KEY = (import.meta.env.VITE_STAGE1_API_KEY || "").trim();
const STAGE2_API_KEY = (import.meta.env.VITE_STAGE2_API_KEY || "").trim();

export async function generateStage1WithGemini(
  input: InputData
): Promise<Stage1Output> {
  if (!STAGE1_API_KEY) {
    throw new Error("Stage 1 API key is not configured. Please add VITE_STAGE1_API_KEY to your .env file.");
  }

  const prompt = buildStage1Prompt(input);

  try {
    const response = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${STAGE1_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 4096,
            responseMimeType: "application/json"
          }
        })
      }
    );

    const data = await response.json();
    return extractJSONFromGemini(data) || generateFallbackStage1();

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);

    if (errorMsg.includes("429") || errorMsg.includes("quota")) {
      console.error("Stage 1 API Key quota exhausted or rate limited");
      throw new Error("Stage 1 API key quota exhausted. Please check your API limits.");
    }

    console.warn("Stage 1 API error:", error);
    return generateFallbackStage1();
  }
}

function generateFallbackStage1(): Stage1Output {
  return {
    seller_specs: []
  };
}

export async function extractISQWithGemini(
  input: InputData,
  urls: string[]
): Promise<{ config: ISQ; keys: ISQ[]; buyers: ISQ[] }> {
  if (!STAGE2_API_KEY) {
    throw new Error("Stage 2 API key is not configured. Please add VITE_STAGE2_API_KEY to your .env file.");
  }

  console.log("Waiting before ISQ extraction to avoid API overload...");
  await sleep(7000);

  const urlContents = await Promise.all(urls.map(fetchURL));
  const prompt = buildISQExtractionPrompt(input, urls, urlContents);

  try {
    const response = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${STAGE2_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4096,
            responseMimeType: "application/json"
          },
        }),
      }
    );

    const data = await response.json();
    let parsed = extractJSONFromGemini(data);

    if (parsed && parsed.config && parsed.config.name) {
      return {
        config: parsed.config,
        keys: parsed.keys || [],
        buyers: parsed.buyers || []
      };
    }

    const textContent = extractRawText(data);
    if (textContent) {
      const fallbackParsed = parseStage2FromText(textContent);
      if (fallbackParsed && fallbackParsed.config && fallbackParsed.config.name) {
        console.log("Parsed ISQ from text fallback");
        return fallbackParsed;
      }
    }

    return generateFallbackStage2();
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);

    if (errorMsg.includes("429") || errorMsg.includes("quota")) {
      console.error("Stage 2 API Key quota exhausted or rate limited");
      throw new Error("Stage 2 API key quota exhausted. Please check your API limits.");
    }

    console.warn("Stage 2 API error:", error);
    return generateFallbackStage2();
  }
}

function extractRawText(response: any): string {
  try {
    if (!response?.candidates?.length) return "";

    const parts = response.candidates[0]?.content?.parts || [];
    let text = "";

    for (const part of parts) {
      if (typeof part.text === "string") {
        text += part.text + "\n";
      }
    }

    return text.trim();
  } catch {
    return "";
  }
}

function parseStage2FromText(text: string): { config: ISQ; keys: ISQ[]; buyers: ISQ[] } | null {
  console.warn("Stage2: Using text-based extraction");

  const config = { name: "", options: [] };
  const keys: ISQ[] = [];
  const buyers: ISQ[] = [];

  const lines = text.split("\n").filter((line) => line.trim().length > 0);
  if (lines.length === 0) return null;

  const specPatterns = /(size|material|grade|thickness|type|shape|length|width|color|finish|weight|capacity|brand|quality|model|variant|design)[^:\n]*[:\-\s]+([^\n]+)/gi;
  const matches = Array.from(text.matchAll(specPatterns));

  const seenNames = new Set<string>();
  let configSet = false;

  matches.slice(0, 10).forEach((match) => {
    const name = match[1].trim();
    const valuesStr = match[2].trim();
    const values = valuesStr
      .split(/,|;|\/|\band\b/)
      .map((v) => v.trim())
      .filter((v) => v.length > 0 && v.length < 50)
      .slice(0, 10);

    if (values.length === 0) return;

    const normalizedName = normalizeSpecName(name);

    if (seenNames.has(normalizedName)) return;
    seenNames.add(normalizedName);

    if (!configSet && values.length >= 2) {
      config.name = name;
      config.options = values;
      configSet = true;
    } else if (keys.length < 3) {
      keys.push({ name, options: values });
    }
  });

  if (!configSet && matches.length > 0) {
    const firstMatch = matches[0];
    config.name = firstMatch[1].trim();
    config.options = firstMatch[2]
      .split(/,|;|\//)
      .map((v) => v.trim())
      .filter((v) => v.length > 0 && v.length < 50)
      .slice(0, 5);
  }

  if (!config.name || config.options.length === 0) {
    const words = text.match(/\b[a-z]{3,}(?:\s+[a-z]{3,})*\b/gi) || [];
    if (words.length > 0) {
      config.name = words[0];
      config.options = words.slice(0, 5);
    }
  }

  if (!config.name) return null;

  return { config, keys, buyers };
}

function generateFallbackStage2(): { config: ISQ; keys: ISQ[]; buyers: ISQ[] } {
  return {
    config: { name: "Unknown", options: [] },
    keys: [],
    buyers: []
  };
}

function extractJSON(text: string): string | null {
  text = text.replace(/```json|```/gi, "").trim();

  text = text.trim();
  if (text.startsWith('{')) {
    try {
      JSON.parse(text);
      return text;
    } catch {
      // Continue to other methods
    }
  }

  let codeBlockMatch = text.match(/```json\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    const extracted = codeBlockMatch[1].trim();
    try {
      JSON.parse(extracted);
      return extracted;
    } catch (e) {
      console.error("Failed to parse JSON from json code block:", e);
    }
  }

  codeBlockMatch = text.match(/```\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    const extracted = codeBlockMatch[1].trim();
    try {
      JSON.parse(extracted);
      return extracted;
    } catch (e) {
      console.error("Failed to parse JSON from code block:", e);
    }
  }

  let braceCount = 0;
  let inString = false;
  let escapeNext = false;
  let startIdx = -1;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\' && inString) {
      escapeNext = true;
      continue;
    }

    if (char === '"' && !escapeNext) {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === '{') {
        if (braceCount === 0) startIdx = i;
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        if (braceCount === 0 && startIdx !== -1) {
          const jsonStr = text.substring(startIdx, i + 1).trim();
          try {
            JSON.parse(jsonStr);
            return jsonStr;
          } catch (e) {
            console.error("Failed to parse extracted JSON:", e);
            startIdx = -1;
          }
        }
      }
    }
  }

  console.error("No JSON found in response. Raw response:", text.substring(0, 1000));
  return null;
}

async function fetchURL(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    return doc.body.textContent || "";
  } catch {
    return "";
  }
}

function buildStage1Prompt(input: InputData): string {
  const mcatNames = input.mcats.map((m) => m.mcat_name).join(", ");
  return `For the product categories { ${input.pmcat_name}, ${mcatNames} }, identify their key product specifications for an **Indian B2B marketplace perspective**.
PMCAT Name: ${input.pmcat_name || "(blank)"}
PMCAT ID: ${input.pmcat_id || "(blank)"}
MCATs: ${mcatNames}

Return ONLY valid JSON.
Do NOT add explanation, notes, or text before or after JSON.
Output must start with { and end with }.

**Your entire analysis must follow these critical rules:**

* **Common Spec Name:** For each specification, use only the most common name used by sellers and buyers in the **Indian B2B market**.
* **Option Coverage:** Aim to cover the most common listings options that collectively cover at least 95% of the products and buyer inquiries for this category.
* **Character Length Constraint:** Spec values must be less than 25 characters in length

---

**1. The Classification Tier:**
* **Primary Specs (MIN 2, MAX 3):** Core differentiators with the highest impact on pricing and buyer comparison.
* **Secondary Specs (MIN 2, MAX 3):** Essential functional specifications that define the product's core capabilities and performance.
* **Tertiary Specs (MAX 4):** Supplementary details that provide complete product information and address detailed inquiries.

---

**2. The Input Type:**
* Determine the appropriate **"input_type"** based on these rules:
    * **radio_button:** Use if the specification has a fixed set of mutually exclusive values (e.g., Capacity: 2kg, 4kg, 6kg).
    * **multi_select:** Use if the specification allows for multiple non-exclusive values to be selected together (e.g., Features: Waterproof, Bluetooth, GPS).

---
**3. Common Rules for Spec Name:**
* **Avoid Spec Duplicity:** Do not include specifications that are duplicates. If two common terms exist, use only the most common one. 
* If a Spec is created with only one option and is important for the category product listings, then you must list it only under Tertiary. 
    > **Example**: Spec Name Extinguishing Agent: CO2 for category CO2 Fire Extinguisher.
* **Category Non-Adherence (Irrelevant Spec):** The specification must be **technically relevant and possible** for the product category. 


**4. Common Rules for Spec Options:**
* For every category, Provide a representative list of the most common values or options. This list is mandatory and must follow these rules:
    * **Order by Popularity:** The list **must be ordered by popularity** in the Indian B2B marketplace, from most common to least common. The list must be comprehensive enough to give sellers a good range of valid choices, capturing the most popular options.
    * **Avoid Ranges:** **Try to avoid range values until necessary. Only use a range if it is the industry standard for that specification with respect to that particular category.
    * **Consistent Format:** Ensure all options for a given specification maintain a **consistent format**.
    * **Character Length:** Each spec option value must be less than 25 characters.
    * **Provide Maximum 10 options for a given Specification Name**.If >10 are common, include the top 10 most frequent choices and omit long-tail.
    * **Unit Consistency:** Always provide the **primary, industry-standard unit** that is legal as per the govt standard in India for the category and ensure the unit **must be** consistent across the options for a spec.
    * **Secondary Unit:** If applicable, include the secondary unit (i.e., commonly spoken unit ) in parentheses for reference. 
    * **Example**: 
        > **Spec Name**: Door Height  
        **Primary Unit**: mm  
        **Secondary Unit**: ft  
        **Spec Value (with Secondary Unit)**: 2100 mm (7 ft)  
    * **Avoid Duplicate Option:** Every value within a single specification Option List must be unique. Check for identical values or different formats that represent the exact same underlying option.
    * **Category Non-Adherence (Irrelevant Option):** The option must be a valid option for the category and should logically fit with the category name . Avoid including irrelevant or obsolete options for the category.
    * **Example**: 
        > **Category Name**: Henna Hair Color  
        **Spec Name**: Form  
        **Spec Option**: Cone  

    * **Spec Non-Adherence (Absurd Option):** The option value must be technically feasible and logically consistent with the parent Specification Name. An option must not contradict the unit or nature of the specification. 
    * **Example**: 
        > **Spec Name**: Material  
        **Spec Option**: 100 kg

* **No option should be created with vague keywords like "custom", "unbranded" , "other" etc. An option must always fit with the product of the category**  
    * **Example**: 
        > **Spec Name**: Brand Name  
        **Spec Option**: unbranded


**5. Standardize the specification names of the related categories. Ensure logically matching specs are named the same for all related categories:**

* **Rules:
Match on meaning, not exact words. Consider units, example values, and buyer intent.
1) Prefer the simplest, marketplace-friendly parent name (≤ 2–3 words).
2) Normalize obvious unit variants if trivial (kg vs kilogram), else leave values untouched.**

—

**5. Affix Flag (ONLY for PRIMARY specs):**
* **Affix Flag:** Determines if this specification should appear in product titles. Only PRIMARY specs can have affix flags.
    * **Suffix:** The spec should appear at the end of the product title
    * **Prefix:** The spec should appear at the beginning of the product title  
    * **None:** The spec should not appear in product titles
* **Affix Presence Flag:** Determines how the spec should be formatted in the title:
    * **"1" (Both Name and Value):** Include both spec name and value (e.g., "CO2 fire extinguisher weight 4kg")
    * **"0" (Value Only):** Include only the value (e.g., "CO2 fire extinguisher 4kg")
    * **"0" (No Affix):** No affix (when affix_flag is None)

**Affix Rules:**
- Only PRIMARY specifications can have affix flags (Suffix/Prefix)
- SECONDARY and TERTIARY specs must have affix_flag = None and affix_presence_flag = "0"

**Example Affix Usage:**
* **CO2 Fire Extinguisher:**
  - Primary spec "Weight" with values ["4kg", "6kg", "9kg"]
  - affix_flag = "Suffix", affix_presence_flag = "1"
  - Result: "CO2 Fire Extinguisher Weight 4kg"

---

### Final Instruction (STRICT OUTPUT)

Generate the finalized specs for EVERY child MCAT from the MCAT LIST provided above.

OUTPUT RULES (NON-NEGOTIABLE - CRITICAL)
- RESPOND WITH PURE JSON ONLY. Nothing else. No text before or after.
- ABSOLUTELY NO markdown code blocks, NO triple backticks, NO fenced code blocks, just raw JSON.
- ABSOLUTELY NO explanations, NO reasoning, NO preamble, NO conclusion text.
- Return ONE single JSON object that looks EXACTLY like the schema below.
- The output MUST include EVERY MCAT exactly once (no missing, no extras).
- DO NOT invent / renumber IDs. Each mcat_id MUST be copied exactly from the MCAT LIST above.
- category_name MUST match the MCAT LIST name exactly.

STRICT FORMAT RULES:
- Output must be a single JSON object only.
- Do not include markdown.
- Do not include text outside JSON.
- Do not wrap JSON in quotes.

REQUIRED JSON SCHEMA (match keys + nesting exactly)

{
 "seller_specs": [
 {
  "pmcat_id": {{$json["pmcat_id"]}},
  "pmcat_name": "{{$json["pmcat_name"]}}",
  "mcats": [
    {
      "category_name": "<MCAT_NAME_FROM_LIST>",
      "mcat_id": <MCAT_ID_FROM_LIST>,
      "finalized_specs": {
        "finalized_primary_specs": {
          "specs": [
            {
              "spec_name": "<string>",
              "options": ["<val1>", "<val2>", "..."],
              "input_type": "radio_button" or "multi_select",
              "affix_flag": "None" or "Prefix" or "Suffix",
              "affix_presence_flag": "0" or "1"
            }
          ]
        },
        "finalized_secondary_specs": {
          "specs": [
            {
              "spec_name": "<string>",
              "options": ["<val1>", "<val2>", "..."],
              "input_type": "radio_button" or "multi_select",
              "affix_flag": "None",
              "affix_presence_flag": "0"
            }
          ]
        },
        "finalized_tertiary_specs": {
          "specs": [
            {
              "spec_name": "<string>",
              "options": ["<val1>", "<val2>", "..."],
              "input_type": "radio_button" or "multi_select",
              "affix_flag": "None",
              "affix_presence_flag": "0"
            }
          ]
        }
      }
    }
  ]
}
}`;
}

function buildISQExtractionPrompt(
  input: InputData,
  urls: string[],
  contents: string[]
): string {
  const urlsText = urls
    .map((url, i) => `URL ${i + 1}: ${url}\nContent: ${contents[i].substring(0, 1000)}...`)
    .join("\n\n");

  return `Extract ISQs from these URLs for: ${input.mcats.map((m) => m.mcat_name).join(", ")}

${urlsText}

Extract:
1. CONFIG ISQ (exactly 1): Must influence price, options must match URLs exactly
2. KEY ISQs (exactly 3): Most repeated + category defining

STRICT RULES:
- DO NOT invent specs
- Extract ONLY specs that appear in AT LEAST 2 URLs
- If a spec appears in only 1 URL → IGNORE it
- If options differ, keep ONLY options that appear in AT LEAST 2 URLs
- Do NOT guess missing options
- EXCLUSION: If spec is in MCAT Name (e.g., "Material"), exclude it.

REQUIREMENTS:
- Return ONLY valid JSON.
- Absolutely no text, notes, or markdown outside JSON.
- Output MUST start with { and end with }.
- JSON must be valid and parseable

RESPOND WITH PURE JSON ONLY - Nothing else. No markdown, no explanation, just raw JSON that looks exactly like this:
{
  "config": {"name": "...", "options": [...]},
  "keys": [{"name": "...", "options": [...]}, ...]
}`;
}

// ============================================
// STAGE 3 BUYER ISQs SELECTION - SIMPLIFIED VERSION
// ============================================

export function selectStage3BuyerISQs(
  stage1: Stage1Output,
  stage2: { config: ISQ; keys: ISQ[]; buyers?: ISQ[] }
): ISQ[] {
  console.log('🔍 selectStage3BuyerISQs called');

  // 1️⃣ Flatten Stage1 specs
  const stage1All: (ISQ & { tier: string; normName: string; spec_name?: string })[] = [];
  stage1.seller_specs.forEach(ss => {
    ss.mcats.forEach(mcat => {
      const { finalized_primary_specs, finalized_secondary_specs } = mcat.finalized_specs;

      finalized_primary_specs.specs.forEach(s => {
        if (s.options && s.options.length > 0) {
          stage1All.push({ 
            name: s.spec_name,
            spec_name: s.spec_name,
            options: s.options,
            tier: "Primary", 
            normName: normalizeSpecName(s.spec_name)
          });
        }
      });
      
      finalized_secondary_specs.specs.forEach(s => {
        if (s.options && s.options.length > 0) {
          stage1All.push({ 
            name: s.spec_name,
            spec_name: s.spec_name,
            options: s.options,
            tier: "Secondary", 
            normName: normalizeSpecName(s.spec_name)
          });
        }
      });
    });
  });

  // 2️⃣ Flatten Stage2 specs
  const stage2All: (ISQ & { normName: string })[] = [
    { ...stage2.config, options: stage2.config.options || [] },
    ...stage2.keys.map(k => ({ ...k, options: k.options || [] }))
  ]
  .filter(s => s.options && s.options.length > 0)
  .map(s => ({ 
    ...s, 
    normName: normalizeSpecName(s.name),
    options: s.options
  }));

  console.log('📊 Stage1 specs:', stage1All.length);
  console.log('📊 Stage2 specs:', stage2All.length);

  // 3️⃣ Find common specs
  const commonSpecs = stage1All.filter(s1 => 
    stage2All.some(s2 => s2.normName === s1.normName)
  );

  console.log('🎯 Common specs found:', commonSpecs.length);
  commonSpecs.forEach(s => console.log(`   - ${s.spec_name}`));

  if (commonSpecs.length === 0) {
    console.log('⚠️ No common specs found');
    return [];
  }

  // 4️⃣ Select top 2 buyer ISQs
  const buyerISQs: ISQ[] = [];
  const maxBuyers = Math.min(2, commonSpecs.length);
  
  for (let i = 0; i < maxBuyers; i++) {
    const spec = commonSpecs[i];
    console.log(`\n📦 Processing spec ${i+1}: ${spec.spec_name}`);
    
    const options = getBuyerISQOptions(spec.normName, stage1All, stage2All);
    
    if (options.length >= 2) {
      buyerISQs.push({ 
        name: spec.spec_name, 
        options: options
      });
      console.log(`✅ Added buyer ISQ: ${spec.spec_name} with ${options.length} options`);
    } else {
      console.log(`❌ Skipped ${spec.spec_name}: only ${options.length} options`);
    }
  }

  console.log('🎉 Final buyer ISQs:', buyerISQs.length);
  return buyerISQs;
}

// SIMPLE FUNCTION TO GET 8 OPTIONS FOR BUYER ISQ
function getBuyerISQOptions(
  normName: string, 
  stage1All: (ISQ & { tier: string; normName: string; spec_name?: string })[],
  stage2All: (ISQ & { normName: string })[]
): string[] {
  console.log(`🔧 Getting options for: "${normName}"`);
  
  const s2 = stage2All.find(s => s.normName === normName);
  const s1 = stage1All.find(s => s.normName === normName);

  const stage1Options = s1?.options || [];
  const stage2Options = s2?.options || [];
  
  console.log(`   Stage 1 options: ${stage1Options.length}`);
  console.log(`   Stage 2 options: ${stage2Options.length}`);

  const result: string[] = [];
  const seen = new Set<string>();

  // STEP 1: Add COMMON options (exist in BOTH Stage 1 and Stage 2)
  console.log('   Step 1: Adding common options...');
  
  for (const s1Opt of stage1Options) {
    if (result.length >= 8) break;
    
    const cleanS1 = s1Opt.trim().toLowerCase();
    
    for (const s2Opt of stage2Options) {
      const cleanS2 = s2Opt.trim().toLowerCase();
      
      if (cleanS1 === cleanS2) {
        // Found common option
        const originalOpt = s1Opt.trim();
        const lowerOpt = originalOpt.toLowerCase();
        
        if (!seen.has(lowerOpt)) {
          result.push(originalOpt);
          seen.add(lowerOpt);
          console.log(`     ✅ Common: "${originalOpt}"`);
        }
        break;
      }
    }
  }

  // STEP 2: Add Stage 1 options
  if (result.length < 8) {
    console.log(`   Step 2: Adding Stage 1 options...`);
    
    for (const s1Opt of stage1Options) {
      if (result.length >= 8) break;
      
      const cleanOpt = s1Opt.trim();
      const lowerOpt = cleanOpt.toLowerCase();
      
      if (!seen.has(lowerOpt)) {
        result.push(cleanOpt);
        seen.add(lowerOpt);
        console.log(`     ➕ Stage 1: "${cleanOpt}"`);
      }
    }
  }

  // STEP 3: GUARANTEE 8 OPTIONS
  if (result.length < 8) {
    console.log(`   Step 3: Adding fallbacks to reach 8...`);
    
    const fallbacks = getSmartFallbacks(normName);
    
    for (const fb of fallbacks) {
      if (result.length >= 8) break;
      
      const lowerFb = fb.toLowerCase();
      if (!seen.has(lowerFb)) {
        result.push(fb);
        seen.add(lowerFb);
        console.log(`     📦 Fallback: "${fb}"`);
      }
    }
  }

  console.log(`   ✅ Final: ${result.length} options`);
  return result;
}

// SMART FALLBACKS BASED ON SPEC TYPE
function getSmartFallbacks(normName: string): string[] {
  console.log(`   Getting fallbacks for: "${normName}"`);
  
  const fallbacks: Record<string, string[]> = {
    'material': [
      'SS 304', 'SS 316', 'Mild Steel', 'Galvanized Iron',
      'Aluminium', 'Copper', 'Brass', 'PVC', 'Carbon Steel'
    ],
    'grade': [
      '304', '316', '430', '201', '202', '304L', '316L',
      'Grade A', 'Grade B', 'Commercial', 'Industrial'
    ],
    'thickness': [
      '1mm', '2mm', '3mm', '5mm', '10mm', '15mm', '20mm', '25mm',
      '0.5mm', '1.5mm', '4mm', '6mm', '8mm'
    ],
    'diameter': [
      '15mm', '20mm', '25mm', '32mm', '40mm', '50mm',
      '1/2"', '3/4"', '1"', '2"', '3"', '4"'
    ],
    'size': [
      'Small', 'Medium', 'Large', 'Extra Large',
      'Sheet', 'Plate', 'Coil', 'Pipe', 'Rod'
    ],
    'length': [
      '6m', '12m', 'Random', 'Custom',
      '3ft', '6ft', '10ft', '20ft', '1m', '2m'
    ],
    'width': [
      '1000mm', '1250mm', '1500mm', '2000mm',
      '3ft', '4ft', '5ft', '6ft'
    ],
    'height': [
      '1000mm', '1500mm', '2000mm', '2500mm',
      '3ft', '4ft', '5ft', '6ft'
    ],
    'color': [
      'White', 'Black', 'Blue', 'Red', 'Green', 'Yellow',
      'Gray', 'Silver', 'Gold', 'Brown'
    ],
    'finish': [
      'Mill Finish', 'Polished', 'Galvanized', 'Brushed',
      'Coated', 'Painted', 'Anodized', 'Matt'
    ],
    'type': [
      'Standard', 'Premium', 'Economy', 'Commercial',
      'Industrial', 'Heavy Duty', 'Light Duty', 'Custom'
    ],
    'shape': [
      'Round', 'Square', 'Rectangular', 'Hexagonal',
      'Flat', 'Angle', 'Channel', 'Pipe'
    ],
    'weight': [
      '1kg', '5kg', '10kg', '25kg', '50kg', '100kg',
      '500kg', '1000kg'
    ],
    'capacity': [
      '10L', '20L', '50L', '100L', '200L', '500L',
      '1000L', '2000L'
    ],
    'brand': [
      'Tata', 'Jindal', 'SAIL', 'Essar', 'Hindalco',
      'Godrej', 'Asian Paints', 'Berger'
    ],
    'quality': [
      'Grade A', 'Grade B', 'Commercial', 'Industrial',
      'Premium', 'Standard', 'Economy', 'Export Quality'
    ]
  };

  // Find matching fallback
  for (const [key, options] of Object.entries(fallbacks)) {
    if (normName.includes(key)) {
      console.log(`   Using "${key}" fallbacks`);
      return options;
    }
  }

  // Default fallback
  console.log(`   Using default fallbacks`);
  return [
    'Standard', 'Premium', 'Economy', 'Commercial',
    'Industrial', 'Custom', 'Type A', 'Type B',
    'Small', 'Medium', 'Large', 'Extra Large'
  ];
}

// ============================================
// COMPARE RESULTS FUNCTION (unchanged)
// ============================================

export function compareResults(
  chatgptSpecs: Stage1Output,
  geminiSpecs: Stage1Output
): {
  common_specs: Array<{
    spec_name: string;
    chatgpt_name: string;
    gemini_name: string;
    common_options: string[];
    chatgpt_unique_options: string[];
    gemini_unique_options: string[];
  }>;
  chatgpt_unique_specs: Array<{ spec_name: string; options: string[] }>;
  gemini_unique_specs: Array<{ spec_name: string; options: string[] }>;
} {
  const chatgptAllSpecs = extractAllSpecsWithOptions(chatgptSpecs);
  const geminiAllSpecs = extractAllSpecsWithOptions(geminiSpecs);

  const commonSpecs: Array<{
    spec_name: string;
    chatgpt_name: string;
    gemini_name: string;
    common_options: string[];
    chatgpt_unique_options: string[];
    gemini_unique_options: string[];
  }> = [];

  const chatgptUnique: Array<{ spec_name: string; options: string[] }> = [];
  const geminiUnique: Array<{ spec_name: string; options: string[] }> = [];

  const matchedChatgpt = new Set<number>();
  const matchedGemini = new Set<number>();

  chatgptAllSpecs.forEach((chatgptSpec, i) => {
    let foundMatch = false;
    
    geminiAllSpecs.forEach((geminiSpec, j) => {
      if (matchedGemini.has(j)) return;
      
      if (isSemanticallySimilar(chatgptSpec.spec_name, geminiSpec.spec_name)) {
        matchedChatgpt.add(i);
        matchedGemini.add(j);
        foundMatch = true;
        
        const commonOpts = findCommonOptions(chatgptSpec.options, geminiSpec.options);
        const chatgptUniq = chatgptSpec.options.filter(opt => 
          !geminiSpec.options.some(gemOpt => isSemanticallySimilarOption(opt, gemOpt))
        );
        const geminiUniq = geminiSpec.options.filter(opt => 
          !chatgptSpec.options.some(chatOpt => isSemanticallySimilarOption(opt, chatOpt))
        );
        
        commonSpecs.push({
          spec_name: chatgptSpec.spec_name,
          chatgpt_name: chatgptSpec.spec_name,
          gemini_name: geminiSpec.spec_name,
          common_options: commonOpts,
          chatgpt_unique_options: chatgptUniq,
          gemini_unique_options: geminiUniq
        });
      }
    });
    
    if (!foundMatch) {
      chatgptUnique.push({
        spec_name: chatgptSpec.spec_name,
        options: chatgptSpec.options
      });
    }
  });

  geminiAllSpecs.forEach((geminiSpec, j) => {
    if (!matchedGemini.has(j)) {
      geminiUnique.push({
        spec_name: geminiSpec.spec_name,
        options: geminiSpec.options
      });
    }
  });

  return {
    common_specs: commonSpecs,
    chatgpt_unique_specs: chatgptUnique,
    gemini_unique_specs: geminiUnique,
  };
}

// Helper functions
function extractAllSpecsWithOptions(specs: Stage1Output): Array<{ spec_name: string; options: string[] }> {
  const allSpecs: Array<{ spec_name: string; options: string[] }> = [];
  
  specs.seller_specs.forEach((ss) => {
    ss.mcats.forEach((mcat) => {
      const { finalized_primary_specs, finalized_secondary_specs, finalized_tertiary_specs } =
        mcat.finalized_specs;
      
      finalized_primary_specs.specs.forEach((s) => 
        allSpecs.push({ spec_name: s.spec_name, options: s.options })
      );
      finalized_secondary_specs.specs.forEach((s) => 
        allSpecs.push({ spec_name: s.spec_name, options: s.options })
      );
      finalized_tertiary_specs.specs.forEach((s) => 
        allSpecs.push({ spec_name: s.spec_name, options: s.options })
      );
    });
  });
  
  return allSpecs;
}

function isSemanticallySimilarOption(opt1: string, opt2: string): boolean {
  if (!opt1 || !opt2) return false;
  
  const clean1 = opt1.toLowerCase().trim();
  const clean2 = opt2.toLowerCase().trim();
  
  if (clean1 === clean2) return true;
  if (clean1.includes(clean2) || clean2.includes(clean1)) return true;
  
  // ✅ NEW: Check for range matches
  const isRangeMatch = checkRangeMatch(clean1, clean2);
  if (isRangeMatch) return true;
  
  // Extract numbers with DECIMALS support
  const extractNumberAndUnit = (str: string) => {
    // ✅ Handle ranges like "0.1mm to 6.0mm"
    const rangeMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:mm|cm|meter|millimeter|centimeter|inch|ft|feet|"|')?\s*to\s*(\d+(?:\.\d+)?)\s*(mm|cm|meter|millimeter|centimeter|inch|ft|feet|"|')?/i);
    if (rangeMatch) {
      return {
        isRange: true,
        min: parseFloat(rangeMatch[1]),
        max: parseFloat(rangeMatch[2]),
        unit: (rangeMatch[3] || 'mm').toLowerCase()
      };
    }
    
    // Regular number extraction
    const numMatch = str.match(/(\d+(\.\d+)?)/);
    const unitMatch = str.match(/(mm|cm|meter|millimeter|centimeter|inch|ft|feet|"|'|kg|g|l|ml)/i);
    return {
      isRange: false,
      number: numMatch ? parseFloat(numMatch[1]) : null,
      unit: unitMatch ? unitMatch[0].toLowerCase() : null
    };
  };
  
  const data1 = extractNumberAndUnit(clean1);
  const data2 = extractNumberAndUnit(clean2);
  
  // ✅ Handle range vs single value comparison
  if (data1.isRange && !data2.isRange) {
    // Range vs single value: check if single value falls within range
    if (data2.number !== null && 
        data2.number >= data1.min && 
        data2.number <= data1.max &&
        (!data1.unit || !data2.unit || data1.unit === data2.unit)) {
      return true;
    }
  } else if (!data1.isRange && data2.isRange) {
    // Single value vs range: check if single value falls within range
    if (data1.number !== null && 
        data1.number >= data2.min && 
        data1.number <= data2.max &&
        (!data1.unit || !data2.unit || data1.unit === data2.unit)) {
      return true;
    }
  } else if (data1.isRange && data2.isRange) {
    // Range vs Range: check for overlap
    const overlap = data1.max >= data2.min && data2.max >= data1.min;
    if (overlap && (!data1.unit || !data2.unit || data1.unit === data2.unit)) {
      return true;
    }
  } else if (data1.number && data2.number) {
    // Both are single values
    // ✅ FIXED: Check EXACT equality (1.2 != 12)
    if (data1.number !== data2.number) return false;
    
    // Check if they're the same unit type
    const hasMm1 = clean1.includes('mm') || clean1.includes('millimeter');
    const hasMm2 = clean2.includes('mm') || clean2.includes('millimeter');
    const hasCm1 = clean1.includes('cm') || clean1.includes('centimeter');
    const hasCm2 = clean2.includes('cm') || clean2.includes('centimeter');
    const hasInch1 = clean1.includes('inch') || clean1.includes('"');
    const hasInch2 = clean2.includes('inch') || clean2.includes('"');
    const hasFt1 = clean1.includes('ft') || clean1.includes('feet');
    const hasFt2 = clean2.includes('ft') || clean2.includes('feet');
    
    if ((hasMm1 && hasMm2) || (hasCm1 && hasCm2) || (hasInch1 && hasInch2) || (hasFt1 && hasFt2)) {
      return true;
    }
    
    // If both have no units but same number
    if (!hasMm1 && !hasCm1 && !hasInch1 && !hasFt1 && 
        !hasMm2 && !hasCm2 && !hasInch2 && !hasFt2 && 
        data1.number === data2.number) {
      return true;
    }
  }
  
  // Handle steel grades and common equivalences
  const equivalences: Record<string, string[]> = {
    '304': ['304l', '304h', '304n', '304 stainless', 'stainless 304', 'ss304', 'ss 304'],
    '316': ['316l', '316ti', '316 stainless', 'stainless 316', 'ss316', 'ss 316'],
    '201': ['ss201', 'ss 201'],
    '202': ['ss202', 'ss 202'],
    '430': ['ss430', 'ss 430'],
    'ss304': ['ss 304', 'stainless steel 304'],
    'ss316': ['ss 316', 'stainless steel 316'],
    'ms': ['mild steel', 'mildsteel', 'carbon steel'],
    'gi': ['galvanized iron'],
    'aluminium': ['aluminum'],
    'mm': ['millimeter', 'millimetre', 'millimeters'],
    'cm': ['centimeter', 'centimetre', 'centimeters'],
    'm': ['meter', 'metre', 'meters'],
    'inch': ['inches', '"'],
    'ft': ['feet', 'foot'],
    'standard': ['std', 'regular', 'normal'],
    'premium': ['high quality', 'superior'],
    'economy': ['budget', 'low cost'],
    '2b': ['2b finish'],
    'ba': ['bright annealed'],
    'mirror': ['mirror finish', 'polished'],
    'hairline': ['hairline finish', 'brushed'],
  };
  
  for (const [base, alts] of Object.entries(equivalences)) {
    const allVariants = [base, ...alts];
    const hasOpt1 = allVariants.some(variant => clean1.includes(variant));
    const hasOpt2 = allVariants.some(variant => clean2.includes(variant));
    
    if (hasOpt1 && hasOpt2) {
      // Extract numbers (including decimals)
      const numMatch1 = clean1.match(/(\d+(?:\.\d+)?)/);
      const numMatch2 = clean2.match(/(\d+(?:\.\d+)?)/);
      
      if (numMatch1 && numMatch2) {
        const num1 = parseFloat(numMatch1[1]);
        const num2 = parseFloat(numMatch2[1]);
        if (num1 !== num2) {
          continue; // Different numbers, not similar
        }
      }
      
      return true;
    }
  }
  
  return false;
}

// ✅ NEW: Function to check if single value matches a range
function checkRangeMatch(str1: string, str2: string): boolean {
  // Extract numbers from both strings
  const extractAllNumbers = (str: string): number[] => {
    const matches = str.match(/\d+(?:\.\d+)?/g);
    return matches ? matches.map(m => parseFloat(m)) : [];
  };
  
  const nums1 = extractAllNumbers(str1);
  const nums2 = extractAllNumbers(str2);
  
  if (nums1.length === 0 || nums2.length === 0) return false;
  
  // Check if one is a range (has "to", "-", "~", "up to", etc.)
  const isRange1 = /(?:to|\-|~|up to|upto|from)/i.test(str1);
  const isRange2 = /(?:to|\-|~|up to|upto|from)/i.test(str2);
  
  // Helper function to check unit compatibility
  const unitsCompatible = (s1: string, s2: string): boolean => {
    const units = ['mm', 'cm', 'm', 'inch', 'ft', 'meter', 'millimeter', 'centimeter'];
    const getUnit = (s: string): string | null => {
      for (const unit of units) {
        if (s.includes(unit)) return unit;
      }
      return null;
    };
    
    const unit1 = getUnit(s1);
    const unit2 = getUnit(s2);
    
    // If both have no units, they're compatible
    if (!unit1 && !unit2) return true;
    // If only one has a unit, not compatible
    if (!unit1 || !unit2) return false;
    // Check if units are same or compatible
    const compatibleUnits: Record<string, string[]> = {
      'mm': ['millimeter'],
      'millimeter': ['mm'],
      'cm': ['centimeter'],
      'centimeter': ['cm'],
      'm': ['meter'],
      'meter': ['m'],
      'inch': ['"'],
      '"': ['inch'],
      'ft': ['feet'],
      'feet': ['ft']
    };
    
    return unit1 === unit2 || 
           (compatibleUnits[unit1] && compatibleUnits[unit1].includes(unit2)) ||
           (compatibleUnits[unit2] && compatibleUnits[unit2].includes(unit1));
  };
  
  if (isRange1 && nums1.length >= 2) {
    // str1 is a range like "0.1mm to 6.0mm"
    const [min1, max1] = [Math.min(...nums1.slice(0, 2)), Math.max(...nums1.slice(0, 2))];
    
    // Check if any number from str2 falls within str1 range
    for (const num of nums2) {
      if (num >= min1 && num <= max1 && unitsCompatible(str1, str2)) {
        return true;
      }
    }
  }
  
  if (isRange2 && nums2.length >= 2) {
    // str2 is a range like "0.1mm to 6.0mm"
    const [min2, max2] = [Math.min(...nums2.slice(0, 2)), Math.max(...nums2.slice(0, 2))];
    
    // Check if any number from str1 falls within str2 range
    for (const num of nums1) {
      if (num >= min2 && num <= max2 && unitsCompatible(str1, str2)) {
        return true;
      }
    }
  }
  
  return false;
}

// ✅ YAHAN ADD KARO - checkRangeMatch ke BAAD
function getOptionsWithinRangeApi(rangeStr: string, options: string[]): string[] {
  const rangeLower = rangeStr.toLowerCase();
  const matches: string[] = [];
  
  // Extract range boundaries
  const rangeNums = (rangeLower.match(/\d+(?:\.\d+)?/g) || []).map(n => parseFloat(n));
  if (rangeNums.length < 2) return matches;
  
  const [rangeMin, rangeMax] = [Math.min(rangeNums[0], rangeNums[1]), Math.max(rangeNums[0], rangeNums[1])];
  
  // Extract range unit
  let rangeUnit = 'mm'; // default
  if (rangeLower.includes('mm') || rangeLower.includes('millimeter')) rangeUnit = 'mm';
  else if (rangeLower.includes('cm') || rangeLower.includes('centimeter')) rangeUnit = 'cm';
  else if (rangeLower.includes('m') || rangeLower.includes('meter')) rangeUnit = 'm';
  else if (rangeLower.includes('inch') || rangeLower.includes('"')) rangeUnit = 'inch';
  else if (rangeLower.includes('ft') || rangeLower.includes('feet')) rangeUnit = 'ft';
  
  // Check each option
  options.forEach(option => {
    const optionLower = option.toLowerCase();
    
    // Skip if option itself is a range
    if (/(?:to|\-|~|up to|upto|from)/i.test(optionLower)) return;
    
    // Extract number from option
    const numMatch = optionLower.match(/(\d+(?:\.\d+)?)/);
    if (!numMatch) return;
    
    const optionNum = parseFloat(numMatch[1]);
    
    // Extract option unit
    let optionUnit = 'mm'; // default
    if (optionLower.includes('mm') || optionLower.includes('millimeter')) optionUnit = 'mm';
    else if (optionLower.includes('cm') || optionLower.includes('centimeter')) optionUnit = 'cm';
    else if (optionLower.includes('m') || optionLower.includes('meter')) optionUnit = 'm';
    else if (optionLower.includes('inch') || optionLower.includes('"')) optionUnit = 'inch';
    else if (optionLower.includes('ft') || optionLower.includes('feet')) optionUnit = 'ft';
    
    // Check if option falls within range AND units match
    if (optionNum >= rangeMin && optionNum <= rangeMax && rangeUnit === optionUnit) {
      matches.push(option);
    }
  });
  
  return matches;
}
function findCommonOptions(options1: string[], options2: string[]): string[] {
  const common: string[] = [];
  const usedIndices = new Set<number>();
  
  // FIRST: Check direct non-range matches
  options1.forEach((opt1) => {
    options2.forEach((opt2, j) => {
      if (usedIndices.has(j)) return;
      
      // Skip if either is a range (we'll handle ranges separately)
      if (/(?:to|\-|~|up to|upto|from)/i.test(opt1) || 
          /(?:to|\-|~|up to|upto|from)/i.test(opt2)) {
        return;
      }
      
      if (isSemanticallySimilarOption(opt1, opt2)) {
        common.push(opt1);
        usedIndices.add(j);
      }
    });
  });
  
  // SECOND: Handle options2 ranges (Stage2 has ranges)
  options2.forEach((opt2, j) => {
    if (usedIndices.has(j)) return;
    
    // If Stage2 option is a range
    if (/(?:to|\-|~|up to|upto|from)/i.test(opt2)) {
      // Find ALL Stage1 options that fall within this range
      const matchingStage1Options = getOptionsWithinRangeApi(opt2, options1);
      
      matchingStage1Options.forEach(match => {
        if (!common.includes(match)) {
          common.push(match);
        }
      });
      
      if (matchingStage1Options.length > 0) {
        usedIndices.add(j);
      }
    }
  });
  
  // THIRD: Handle options1 ranges (if any)
  options1.forEach((opt1, i) => {
    // If Stage1 option is a range
    if (/(?:to|\-|~|up to|upto|from)/i.test(opt1)) {
      // Find ALL Stage2 options that fall within this range
      const matchingStage2Options = getOptionsWithinRangeApi(opt1, options2);
      
      matchingStage2Options.forEach(match => {
        if (!common.includes(match)) {
          common.push(match);
        }
      });
    }
  });
  
  return common;
}