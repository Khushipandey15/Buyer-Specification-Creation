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

// NEW: Simple text extractor from Gemini response
function extractTextFromGeminiResponse(response: any): string {
  try {
    if (!response?.candidates?.length) {
      console.warn("No candidates in response");
      return "";
    }

    let text = "";
    const parts = response.candidates[0]?.content?.parts || [];

    for (const part of parts) {
      if (typeof part.text === "string") {
        text += part.text + "\n";
      }
    }

    return text.trim();
  } catch (error) {
    console.warn("Error extracting text:", error);
    return "";
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
    const textResponse = extractTextFromGeminiResponse(data);
    
    if (textResponse) {
      // Try to parse JSON from text
      const parsed = tryParseJSON(textResponse);
      if (parsed) return parsed;
    }
    
    return generateFallbackStage1();

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

function tryParseJSON(text: string): any {
  try {
    // Clean the text first
    let cleaned = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();
    
    // Find JSON object
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      cleaned = match[0];
      return JSON.parse(cleaned);
    }
  } catch (error) {
    console.warn("Failed to parse JSON:", error);
  }
  return null;
}

function generateFallbackStage1(): Stage1Output {
  return {
    seller_specs: []
  };
}

// COMPLETELY NEW APPROACH for Stage 2
export async function extractISQWithGemini(
  input: InputData,
  urls: string[]
): Promise<{ config: ISQ; keys: ISQ[]; buyers: ISQ[] }> {
  if (!STAGE2_API_KEY) {
    throw new Error("Stage 2 API key is not configured. Please add VITE_STAGE2_API_KEY to your .env file.");
  }

  console.log("Starting ISQ extraction with NEW approach...");
  
  // Get content from URLs
  const urlContents = await Promise.all(urls.map(async (url, idx) => {
    try {
      console.log(`Fetching URL ${idx + 1}: ${url}`);
      const content = await fetchURL(url);
      return { url, content: content.substring(0, 3000) };
    } catch (error) {
      console.warn(`Failed to fetch ${url}:`, error);
      return { url, content: "" };
    }
  }));

  // Build a SIMPLE, CLEAR prompt
  const prompt = `
CRITICAL: I need you to analyze product information from these URLs and extract specifications.

PRODUCT CATEGORY: ${input.mcats.map(m => m.mcat_name).join(", ")}

URLS TO ANALYZE:
${urls.map((url, i) => `URL ${i+1}: ${url}`).join('\n')}

TASK: Extract the most important product specifications that would help buyers make purchasing decisions.

I NEED YOU TO PROVIDE:
1. ONE "Config ISQ" - The most important specification that affects price and product variation
2. THREE "Key ISQs" - Other important specifications that define the product

FOR EACH SPECIFICATION, PROVIDE:
- The specification name (e.g., "Thickness", "Material", "Size")
- Actual values/options found in the URLs (e.g., "2 mm", "3 mm", "4 mm" for Thickness)

EXAMPLE OF WHAT I WANT:
Config ISQ: Thickness
Options: 2 mm, 3 mm, 4 mm, 5 mm

Key ISQ 1: Material
Options: Stainless Steel 304, Stainless Steel 316, Mild Steel

Key ISQ 2: Finish
Options: Polished, Brushed, Galvanized

Key ISQ 3: Size
Options: 4x4 ft, 5x5 ft, 6x6 ft

IMPORTANT RULES:
1. Extract ACTUAL VALUES from the URLs, not specification names
2. Each specification must have at least 2 options
3. Include units where applicable (mm, kg, cm, etc.)
4. Look for patterns across multiple URLs
5. Be specific - avoid generic terms like "Standard", "Regular"

FORMAT YOUR RESPONSE CLEARLY with clear labels as shown in the example above.
`;

  try {
    console.log("Waiting before calling Gemini API...");
    await sleep(7000);

    const response = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${STAGE2_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,  // Lower temperature for more consistent results
            maxOutputTokens: 2048
            // NOT using responseMimeType: "application/json" - we'll parse text
          }
        })
      }
    );

    const data = await response.json();
    const textResponse = extractTextFromGeminiResponse(data);
    
    console.log("Gemini Response:", textResponse);
    
    if (!textResponse) {
      throw new Error("Empty response from Gemini");
    }
    
    // Parse the text response to extract specifications
    const parsed = parseGeminiResponseToISQ(textResponse);
    
    if (!parsed || parsed.config.options.length === 0) {
      // If parsing failed, try to extract directly from URL content
      return extractFromURLContents(urlContents, input);
    }
    
    return parsed;
    
  } catch (error) {
    console.error("Stage 2 API error:", error);
    
    // Fallback: Extract from URL contents directly
    const urlContents = await Promise.all(urls.map(fetchURL));
    return extractFromURLContents(urlContents.map((content, i) => ({ 
      url: urls[i], 
      content 
    })), input);
  }
}

// NEW: Parse Gemini's text response to extract ISQs
function parseGeminiResponseToISQ(text: string): { config: ISQ; keys: ISQ[]; buyers: ISQ[] } {
  const config: ISQ = { name: "", options: [] };
  const keys: ISQ[] = [];
  
  // Split into lines and clean
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  let currentSpec: ISQ | null = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Look for Config ISQ
    if (line.toLowerCase().includes('config isq') && line.includes(':')) {
      const parts = line.split(':');
      if (parts.length >= 2) {
        config.name = parts[1].trim();
        // Look for options in next line
        if (i + 1 < lines.length && lines[i + 1].toLowerCase().includes('option')) {
          const optionsLine = lines[i + 1];
          config.options = extractOptionsFromLine(optionsLine);
          i++; // Skip next line since we processed it
        }
      }
    }
    
    // Look for Key ISQs
    else if (line.toLowerCase().includes('key isq') && line.includes(':')) {
      const parts = line.split(':');
      if (parts.length >= 2) {
        const specName = parts[1].trim();
        const spec: ISQ = { name: specName, options: [] };
        
        // Look for options in next line
        if (i + 1 < lines.length && lines[i + 1].toLowerCase().includes('option')) {
          const optionsLine = lines[i + 1];
          spec.options = extractOptionsFromLine(optionsLine);
          i++; // Skip next line
        }
        
        if (spec.options.length > 0 && keys.length < 3) {
          keys.push(spec);
        }
      }
    }
    
    // Look for specification patterns (more flexible matching)
    else if ((line.includes(':') && line.length < 100) || 
             (line.toLowerCase().includes('spec') && line.includes(':'))) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0 && colonIndex < line.length - 1) {
        const specName = line.substring(0, colonIndex).trim();
        const valuePart = line.substring(colonIndex + 1).trim();
        
        // Check if this looks like a specification
        if (isLikelySpecName(specName) && valuePart.length > 0) {
          const options = extractOptionsFromLine(valuePart);
          
          if (options.length >= 2) {
            // First spec with enough options becomes config
            if (config.options.length === 0) {
              config.name = specName;
              config.options = options;
            } 
            // Next specs become keys
            else if (keys.length < 3) {
              keys.push({ name: specName, options });
            }
          }
        }
      }
    }
  }
  
  // If we didn't find config through patterns, look for any specification
  if (config.options.length === 0) {
    // Try to find any specification in the text
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const specMatch = line.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)[:\s]+([^\.;]+)/);
      
      if (specMatch) {
        const specName = specMatch[1].trim();
        const valuesText = specMatch[2].trim();
        const options = extractOptionsFromLine(valuesText);
        
        if (options.length >= 2) {
          config.name = specName;
          config.options = options;
          break;
        }
      }
    }
  }
  
  // If still no config, use the first meaningful line
  if (config.options.length === 0 && lines.length > 0) {
    for (const line of lines) {
      const words = line.split(/\s+/);
      if (words.length >= 3 && words.length <= 8) {
        const likelyOptions = words.filter(w => 
          w.length > 1 && 
          !w.toLowerCase().includes('spec') &&
          !w.toLowerCase().includes('option') &&
          !w.toLowerCase().includes('config')
        );
        
        if (likelyOptions.length >= 2) {
          config.name = "Specification";
          config.options = likelyOptions.slice(0, 6);
          break;
        }
      }
    }
  }
  
  // Ensure keys are populated
  if (keys.length === 0 && config.options.length > 0) {
    // Generate some generic keys based on common specifications
    const commonSpecs = [
      { name: "Material", options: ["Steel", "Aluminum", "Plastic"] },
      { name: "Size", options: ["Small", "Medium", "Large"] },
      { name: "Grade", options: ["A", "B", "C"] }
    ];
    
    for (const spec of commonSpecs) {
      if (keys.length < 3) {
        keys.push(spec);
      }
    }
  }
  
  return { config, keys, buyers: [] };
}

// Helper: Extract options from a line of text
function extractOptionsFromLine(line: string): string[] {
  if (!line) return [];
  
  // Clean the line
  let cleanLine = line
    .replace(/^[^:]*:\s*/, '')  // Remove prefix like "Options:"
    .replace(/[\[\]{}()]/g, '') // Remove brackets
    .trim();
  
  // Split by common separators
  const options = cleanLine
    .split(/[,;\/|]|\s+and\s+|\s+or\s+/i)
    .map(opt => {
      return opt
        .replace(/^[\s"'\-]+/, '')
        .replace(/[\s"'\-]+$/, '')
        .trim();
    })
    .filter(opt => {
      // Filter out invalid options
      if (!opt || opt.length < 1 || opt.length > 50) return false;
      if (opt.toLowerCase().includes('option')) return false;
      if (opt.toLowerCase().includes('value')) return false;
      if (opt.toLowerCase().includes('spec')) return false;
      if (/^[0-9.,\s]+$/.test(opt)) return false; // Only numbers and punctuation
      if (opt.toLowerCase() === 'etc') return false;
      if (opt.toLowerCase() === 'and') return false;
      if (opt.toLowerCase() === 'or') return false;
      return true;
    })
    .slice(0, 8); // Limit to 8 options
  
  return [...new Set(options)]; // Remove duplicates
}

// Helper: Check if a string looks like a specification name
function isLikelySpecName(text: string): boolean {
  if (!text || text.length < 3 || text.length > 30) return false;
  
  const specKeywords = [
    'material', 'grade', 'thickness', 'size', 'type', 'shape', 
    'color', 'finish', 'weight', 'length', 'width', 'height',
    'diameter', 'capacity', 'brand', 'model', 'quality',
    'standard', 'specification', 'application', 'usage'
  ];
  
  const textLower = text.toLowerCase();
  
  // Check if contains spec keywords
  for (const keyword of specKeywords) {
    if (textLower.includes(keyword)) {
      return true;
    }
  }
  
  // Check if it's a single word or two words (common for specs)
  const words = text.split(/\s+/);
  return words.length <= 3;
}

// NEW: Extract specifications directly from URL content as fallback
function extractFromURLContents(
  urlContents: Array<{ url: string; content: string }>,
  input: InputData
): { config: ISQ; keys: ISQ[]; buyers: ISQ[] } {
  console.log("Extracting specs directly from URL content...");
  
  const allText = urlContents.map(uc => uc.content).join('\n');
  
  // Look for common specification patterns in the content
  const specPatterns = [
    /(thickness|thk|gauge)[\s:]*([^.\n;]+)/gi,
    /(material|grade|composition)[\s:]*([^.\n;]+)/gi,
    /(size|dimension|measurement)[\s:]*([^.\n;]+)/gi,
    /(type|kind|variety)[\s:]*([^.\n;]+)/gi,
    /(color|colour)[\s:]*([^.\n;]+)/gi,
    /(finish|surface|coating)[\s:]*([^.\n;]+)/gi,
    /(length|width|height)[\s:]*([^.\n;]+)/gi,
    /(diameter|dia)[\s:]*([^.\n;]+)/gi
  ];
  
  const foundSpecs = new Map<string, Set<string>>();
  
  // Search for specifications
  for (const pattern of specPatterns) {
    const matches = Array.from(allText.matchAll(pattern));
    
    for (const match of matches) {
      if (match[1] && match[2]) {
        const specName = match[1].trim();
        const valuesText = match[2].trim();
        
        const options = extractOptionsFromLine(valuesText);
        
        if (options.length > 0) {
          const normalizedName = normalizeSpecName(specName);
          
          if (!foundSpecs.has(normalizedName)) {
            foundSpecs.set(normalizedName, new Set());
          }
          
          const optionSet = foundSpecs.get(normalizedName)!;
          options.forEach(opt => optionSet.add(opt));
        }
      }
    }
  }
  
  // Convert to array and sort by number of options
  const specsArray = Array.from(foundSpecs.entries())
    .map(([name, optionsSet]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      options: Array.from(optionsSet).slice(0, 6),
      count: optionsSet.size
    }))
    .sort((a, b) => b.count - a.count);
  
  // Create result
  const config: ISQ = specsArray.length > 0 
    ? { name: specsArray[0].name, options: specsArray[0].options }
    : { name: "Specification", options: ["Not Found"] };
  
  const keys: ISQ[] = specsArray
    .slice(1, 4)
    .map(spec => ({ name: spec.name, options: spec.options }));
  
  // If we don't have enough keys, add some based on category
  if (keys.length < 3) {
    const category = input.mcats[0]?.mcat_name || "";
    
    if (category.toLowerCase().includes('steel') || category.toLowerCase().includes('metal')) {
      const additionalSpecs = [
        { name: "Material", options: ["Steel", "Stainless Steel", "Aluminum"] },
        { name: "Thickness", options: ["2 mm", "3 mm", "4 mm"] },
        { name: "Size", options: ["4x4 ft", "5x5 ft", "6x6 ft"] }
      ];
      
      for (const spec of additionalSpecs) {
        if (keys.length < 3 && !keys.some(k => k.name === spec.name)) {
          keys.push(spec);
        }
      }
    }
  }
  
  return { config, keys, buyers: [] };
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

// ============================================
// STAGE 3 BUYER ISQs SELECTION
// ============================================

export function selectStage3BuyerISQs(
  stage1: Stage1Output,
  stage2: { config: ISQ; keys: ISQ[]; buyers?: ISQ[] }
): ISQ[] {
  console.log('🔍 selectStage3BuyerISQs called');

  // 1️⃣ Flatten Stage1 specs with priority
  const stage1All: (ISQ & { 
    tier: string; 
    normName: string; 
    spec_name?: string;
    priority: number;
  })[] = [];
  
  stage1.seller_specs.forEach(ss => {
    ss.mcats.forEach(mcat => {
      const { finalized_primary_specs, finalized_secondary_specs } = mcat.finalized_specs;

      // Primary specs (priority 3)
      finalized_primary_specs.specs.forEach(s => {
        stage1All.push({ 
          name: s.spec_name,
          spec_name: s.spec_name,
          options: s.options || [],
          tier: "Primary", 
          normName: normalizeSpecName(s.spec_name),
          priority: 3
        });
      });
      
      // Secondary specs (priority 2)
      finalized_secondary_specs.specs.forEach(s => {
        stage1All.push({ 
          name: s.spec_name,
          spec_name: s.spec_name,
          options: s.options || [],
          tier: "Secondary", 
          normName: normalizeSpecName(s.spec_name),
          priority: 2
        });
      });
    });
  });

  // 2️⃣ Flatten Stage2 specs
  const stage2All: (ISQ & { normName: string; priority: number })[] = [
    { ...stage2.config, options: stage2.config.options || [], priority: 3 },
    ...stage2.keys.map(k => ({ ...k, options: k.options || [], priority: 2 })),
    ...(stage2.buyers || []).map(b => ({ ...b, options: b.options || [], priority: 1 }))
  ]
  .map(s => ({ 
    ...s, 
    normName: normalizeSpecName(s.name)
  }));

  console.log('📊 Stage1 specs:', stage1All.length);
  console.log('📊 Stage2 specs:', stage2All.length);

  // 3️⃣ Find common specs
  const commonSpecs: (ISQ & { 
    tier: string; 
    normName: string; 
    spec_name?: string;
    priority: number;
    combinedPriority: number;
    stage1Options: string[];
    stage2Options: string[];
  })[] = [];

  stage1All.forEach(s1 => {
    const matchingStage2 = stage2All.filter(s2 => s2.normName === s1.normName);
    
    if (matchingStage2.length > 0) {
      const bestMatch = matchingStage2.reduce((best, current) => 
        current.priority > best.priority ? current : best
      );
      
      const combinedPriority = s1.priority + bestMatch.priority;
      
      commonSpecs.push({
        ...s1,
        combinedPriority,
        stage1Options: s1.options,
        stage2Options: bestMatch.options
      });
    }
  });

  console.log('🎯 Common specs found:', commonSpecs.length);

  if (commonSpecs.length === 0) {
    console.log('⚠️ No common specs found');
    return [];
  }

  // 4️⃣ Sort by combined priority (highest first)
  commonSpecs.sort((a, b) => b.combinedPriority - a.combinedPriority);

  // 5️⃣ Select top 2 buyer ISQs
  const buyerISQs: ISQ[] = [];
  const maxBuyers = Math.min(2, commonSpecs.length);
  
  for (let i = 0; i < maxBuyers; i++) {
    const spec = commonSpecs[i];
    console.log(`\n📦 Processing spec ${i+1}: ${spec.spec_name}`);
    
    const options = getOptimizedBuyerISQOptions(
      spec.stage1Options, 
      spec.stage2Options,
      spec.normName
    );
    
    if (options.length > 0) {
      buyerISQs.push({ 
        name: spec.spec_name, 
        options: options
      });
      console.log(`✅ Added buyer ISQ: ${spec.spec_name} with ${options.length} options`);
    }
  }

  console.log('🎉 Final buyer ISQs:', buyerISQs.length);
  return buyerISQs;
}

// IMPROVED FUNCTION TO GET OPTIMIZED OPTIONS
function getOptimizedBuyerISQOptions(
  stage1Options: string[], 
  stage2Options: string[],
  normName: string
): string[] {
  console.log(`🔧 Getting optimized options for: "${normName}"`);

  const result: string[] = [];
  const seen = new Set<string>();

  // Step 1: Add EXACT matches first
  for (const opt1 of stage1Options) {
    if (result.length >= 8) break;
    
    const cleanOpt1 = opt1.trim().toLowerCase();
    const exactMatch = stage2Options.find(opt2 => 
      opt2.trim().toLowerCase() === cleanOpt1
    );
    
    if (exactMatch && !seen.has(cleanOpt1)) {
      result.push(opt1);
      seen.add(cleanOpt1);
    }
  }

  // Step 2: Add STRONG semantic matches
  if (result.length < 8) {
    for (const opt1 of stage1Options) {
      if (result.length >= 8) break;
      
      const cleanOpt1 = opt1.trim().toLowerCase();
      if (seen.has(cleanOpt1)) continue;
      
      for (const opt2 of stage2Options) {
        if (result.length >= 8) break;
        
        if (areOptionsStronglySimilar(opt1, opt2) && !seen.has(cleanOpt1)) {
          result.push(opt1);
          seen.add(cleanOpt1);
          break;
        }
      }
    }
  }

  // Step 3: Add remaining Stage 1 options (most relevant)
  if (result.length < 8) {
    const remainingStage1 = stage1Options.filter(opt => {
      const cleanOpt = opt.trim().toLowerCase();
      return !seen.has(cleanOpt);
    });
    
    const toAdd = Math.min(8 - result.length, remainingStage1.length);
    for (let i = 0; i < toAdd; i++) {
      result.push(remainingStage1[i]);
      seen.add(remainingStage1[i].trim().toLowerCase());
    }
  }

  // Step 4: Ensure no duplicates in final result
  const finalResult: string[] = [];
  const finalSeen = new Set<string>();
  
  for (const opt of result) {
    const cleanOpt = opt.trim().toLowerCase();
    if (!finalSeen.has(cleanOpt)) {
      finalResult.push(opt);
      finalSeen.add(cleanOpt);
    }
  }

  console.log(`   ✅ Final: ${finalResult.length} unique options`);
  return finalResult.slice(0, 8);
}

// STRONG OPTION SIMILARITY CHECK
function areOptionsStronglySimilar(opt1: string, opt2: string): boolean {
  if (!opt1 || !opt2) return false;
  
  const clean1 = opt1.toLowerCase().trim();
  const clean2 = opt2.toLowerCase().trim();
  
  // Direct match
  if (clean1 === clean2) return true;
  
  // Remove spaces and compare
  const noSpace1 = clean1.replace(/\s+/g, '');
  const noSpace2 = clean2.replace(/\s+/g, '');
  if (noSpace1 === noSpace2) return true;
  
  // Material and grade equivalences
  const materialGroups = [
    ['304', 'ss304', 'ss 304', 'stainless steel 304'],
    ['316', 'ss316', 'ss 316', 'stainless steel 316'],
    ['430', 'ss430', 'ss 430'],
    ['201', 'ss201', 'ss 201'],
    ['202', 'ss202', 'ss 202'],
    ['ms', 'mild steel', 'carbon steel'],
    ['gi', 'galvanized iron'],
    ['aluminium', 'aluminum'],
  ];
  
  for (const group of materialGroups) {
    const inGroup1 = group.some(term => clean1.includes(term));
    const inGroup2 = group.some(term => clean2.includes(term));
    if (inGroup1 && inGroup2) {
      const num1 = clean1.match(/\b(\d+)\b/)?.[1];
      const num2 = clean2.match(/\b(\d+)\b/)?.[1];
      if (num1 && num2 && num1 !== num2) return false;
      return true;
    }
  }
  
  // Measurement matching
  const getMeasurement = (str: string) => {
    const match = str.match(/(\d+(\.\d+)?)\s*(mm|cm|m|inch|in|ft|"|')?/i);
    if (!match) return null;
    
    const value = parseFloat(match[1]);
    const unit = match[3]?.toLowerCase() || '';
    
    if (unit === 'cm' || unit === 'centimeter') return value * 10;
    if (unit === 'm' || unit === 'meter') return value * 1000;
    if (unit === 'inch' || unit === 'in' || unit === '"') return value * 25.4;
    if (unit === 'ft' || unit === 'feet' || unit === "'") return value * 304.8;
    return value;
  };
  
  const meas1 = getMeasurement(clean1);
  const meas2 = getMeasurement(clean2);
  
  if (meas1 && meas2 && Math.abs(meas1 - meas2) < 0.01) {
    return true;
  }
  
  // Shape equivalences
  const shapeGroups = [
    ['round', 'circular', 'circle'],
    ['square', 'squared'],
    ['rectangular', 'rectangle'],
    ['hexagonal', 'hexagon'],
    ['flat', 'flat bar'],
    ['angle', 'l shape', 'l-shaped'],
    ['channel', 'c shape', 'c-shaped'],
    ['pipe', 'tube', 'tubular'],
    ['slotted', 'slot'],
  ];
  
  for (const group of shapeGroups) {
    const inGroup1 = group.some(term => clean1.includes(term));
    const inGroup2 = group.some(term => clean2.includes(term));
    if (inGroup1 && inGroup2) return true;
  }
  
  return false;
}

// ============================================
// COMPARE RESULTS FUNCTION
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
  return areOptionsStronglySimilar(opt1, opt2);
}

function findCommonOptions(options1: string[], options2: string[]): string[] {
  const common: string[] = [];
  const usedIndices = new Set<number>();
  
  options1.forEach((opt1, i) => {
    options2.forEach((opt2, j) => {
      if (usedIndices.has(j)) return;
      if (areOptionsStronglySimilar(opt1, opt2)) {
        common.push(opt1);
        usedIndices.add(j);
      }
    });
  });
  
  return common;
}