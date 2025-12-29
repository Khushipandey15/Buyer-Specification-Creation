import React from "react";
import type { Stage1Output, ISQ } from "../types";

interface Stage3ResultsProps {
  stage1Data: Stage1Output;
  isqs: {
    config: ISQ;
    keys: ISQ[];
    buyers: ISQ[];
  };
}

interface CommonSpecItem {
  spec_name: string;
  options: string[];
  input_type: string;
  category: "Primary" | "Secondary";
}

interface BuyerISQItem {
  spec_name: string;
  options: string[];
  category: "Primary" | "Secondary";
}

export default function Stage3Results({ stage1Data, isqs }: Stage3ResultsProps) {
  if (!isqs || (!isqs.config && !isqs.keys?.length)) {
    return <div className="text-gray-500">No ISQ data found</div>;
  }

  const { commonSpecs, buyerISQs } = extractCommonAndBuyerSpecs(stage1Data, isqs);

  const primaryCommonSpecs = commonSpecs.filter((s) => s.category === "Primary");
  const secondaryCommonSpecs = commonSpecs.filter((s) => s.category === "Secondary");

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Stage 3: Final Specifications</h2>
      <p className="text-gray-600 mb-8">
        Specifications common to both Stage 1 and Stage 2
      </p>

      {commonSpecs.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-lg text-yellow-800">
          <p className="font-semibold">No common specifications found</p>
          <p className="text-sm mt-2">There are no specifications that appear in both stages.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="space-y-8">
              {primaryCommonSpecs.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-blue-600 mb-4">Common Primary Specs ({primaryCommonSpecs.length})</h3>
                  <div className="grid gap-4">
                    {primaryCommonSpecs.map((spec, idx) => (
                      <SpecCard key={idx} spec={spec} color="blue" />
                    ))}
                  </div>
                </div>
              )}

              {secondaryCommonSpecs.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-green-600 mb-4">Common Secondary Specs ({secondaryCommonSpecs.length})</h3>
                  <div className="grid gap-4">
                    {secondaryCommonSpecs.map((spec, idx) => (
                      <SpecCard key={idx} spec={spec} color="green" />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 rounded-lg p-6 sticky top-6">
              <h3 className="text-lg font-semibold text-amber-900 mb-4 flex items-center gap-2">
                <span className="inline-block w-8 h-8 bg-amber-300 rounded-full flex items-center justify-center text-amber-900 text-sm font-bold">
                  {buyerISQs.length}
                </span>
                Buyer ISQs
              </h3>
              <p className="text-xs text-amber-700 mb-4">Selected from common specs based on buyer search patterns</p>

              {buyerISQs.length > 0 ? (
                <div className="space-y-3">
                  {buyerISQs.map((spec, idx) => (
                    <div key={idx} className="bg-white border border-amber-200 p-4 rounded-lg">
                      <div className="font-semibold text-amber-900 mb-2">{spec.spec_name}</div>
                      <div className="flex flex-wrap gap-2">
                        {spec.options.map((option, oIdx) => (
                          <span
                            key={oIdx}
                            className="inline-block bg-amber-100 text-amber-800 px-2 py-1 rounded text-xs font-medium"
                          >
                            {option}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white border border-amber-200 p-4 rounded-lg text-center">
                  <p className="text-sm text-gray-600">No buyer ISQs available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 pt-8 border-t-2 border-gray-200">
        <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg">
          <p className="text-sm text-gray-700">
            <strong>Summary:</strong> {commonSpecs.length} common specification
            {commonSpecs.length !== 1 ? "s" : ""} found across Primary and Secondary tiers.
            {buyerISQs.length > 0 && ` ${buyerISQs.length} buyer ISQ(s) highlighted for important specs.`}
          </p>
        </div>
      </div>
    </div>
  );
}

function SpecCard({
  spec,
  color,
}: {
  spec: CommonSpecItem | BuyerISQItem;
  color: "blue" | "green" | "amber";
}) {
  const colorClasses = {
    blue: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-800", badge: "bg-blue-100" },
    green: { bg: "bg-green-50", border: "border-green-200", text: "text-green-800", badge: "bg-green-100" },
    amber: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-800", badge: "bg-amber-100" },
  };

  const colors = colorClasses[color];

  return (
    <div className={`${colors.bg} border ${colors.border} p-4 rounded-lg`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="font-semibold text-gray-900 text-lg">{spec.spec_name}</div>
          <div className="text-xs text-gray-600 mt-2">
            <span className={`inline-block ${colors.badge} px-2 py-1 rounded`}>
              {spec.category}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {spec.options.map((option, idx) => (
          <span key={idx} className={`${colors.text} bg-white border border-current px-3 py-1 rounded-full text-sm`}>
            {option}
          </span>
        ))}
      </div>
    </div>
  );
}

function extractCommonAndBuyerSpecs(
  stage1: Stage1Output,
  isqs: { config: ISQ; keys: ISQ[]; buyers: ISQ[] }
): { commonSpecs: CommonSpecItem[]; buyerISQs: BuyerISQItem[] } {
  // Collect all stage2 ISQs
  const stage2ISQs = [isqs.config, ...isqs.keys, ...isqs.buyers];
  
  const stage1AllSpecs: Array<{
    spec_name: string;
    options: string[];
    input_type: string;
    tier: 'Primary' | 'Secondary' | 'Tertiary';
  }> = [];
  
  // Extract all specs from stage1
  stage1.seller_specs.forEach((ss) => {
    ss.mcats.forEach((mcat) => {
      const { finalized_primary_specs, finalized_secondary_specs } = mcat.finalized_specs;
      
      finalized_primary_specs.specs.forEach((spec) => {
        stage1AllSpecs.push({
          spec_name: spec.spec_name,
          options: spec.options,
          input_type: spec.input_type,
          tier: 'Primary'
        });
      });
      
      finalized_secondary_specs.specs.forEach((spec) => {
        stage1AllSpecs.push({
          spec_name: spec.spec_name,
          options: spec.options,
          input_type: spec.input_type,
          tier: 'Secondary'
        });
      });
    });
  });
  
  // Find semantically common specs
  const commonSpecs: CommonSpecItem[] = [];
  const matchedStage1 = new Set<number>();
  const matchedStage2 = new Set<number>();
  
  stage1AllSpecs.forEach((stage1Spec, i) => {
    stage2ISQs.forEach((stage2ISQ, j) => {
      if (matchedStage2.has(j)) return;
      
      if (isSemanticallySimilar(stage1Spec.spec_name, stage2ISQ.name)) {
        matchedStage1.add(i);
        matchedStage2.add(j);
        
        // For common specs: bas common options (jitne hain sab)
        const commonOptions = findCommonOptionsOnly(stage1Spec.options, stage2ISQ.options);
        
        // ✅ CHANGE HERE: REMOVE THE `if (commonOptions.length > 0)` CONDITION
        // ✅ Always add spec, even if no common options
        commonSpecs.push({
          spec_name: stage1Spec.spec_name,
          options: commonOptions, // Can be empty array
          input_type: stage1Spec.input_type,
          category: stage1Spec.tier
        });
      }
    });
  });
  
  // Select buyer ISQs from common specs
  const buyerISQs = selectTopBuyerISQsSemantic(commonSpecs, stage2ISQs);
  
  // Now update buyer ISQs with optimized 8 options
  const optimizedBuyerISQs = buyerISQs.map(buyerISQ => {
    // Find the corresponding Stage 2 ISQ for this buyer ISQ
    const correspondingStage2ISQ = stage2ISQs.find(isq => 
      isSemanticallySimilar(buyerISQ.spec_name, isq.name)
    );
    
    // Find the original Stage 1 spec for this buyer ISQ
    const originalStage1Spec = stage1AllSpecs.find(spec => 
      isSemanticallySimilar(spec.spec_name, buyerISQ.spec_name)
    );
    
    if (correspondingStage2ISQ && originalStage1Spec) {
      // Get 8 optimized options for Buyer ISQs (common + stage1 unique)
      const buyerOptions = getBuyerISQOptions(
        originalStage1Spec.options,
        correspondingStage2ISQ.options
      );
      
      return {
        ...buyerISQ,
        options: buyerOptions
      };
    }
    
    return buyerISQ;
  });
  
  return {
    commonSpecs,  // Original common options only (jitne hain sab)
    buyerISQs: optimizedBuyerISQs  // Optimized 8 options for Buyer ISQs
  };
}


function isSemanticallySimilar(spec1: string, spec2: string): boolean {
  const norm1 = normalizeSpecName(spec1);
  const norm2 = normalizeSpecName(spec2);
  
  if (norm1 === norm2) return true;
  if (norm1.includes(norm2) || norm2.includes(norm1)) return true;
  
  // ✅ NEW: Handle plural/singular matching
  const handlePlural = (word: string): string => {
    if (word.endsWith('s')) return word.slice(0, -1); // Remove 's'
    if (word.endsWith('ies')) return word.slice(0, -3) + 'y'; // countries -> country
    return word;
  };
  
  const words1 = norm1.split(' ');
  const words2 = norm2.split(' ');
  
  // Check if words are same after handling plurals
  if (words1.length === 1 && words2.length === 1) {
    const base1 = handlePlural(words1[0]);
    const base2 = handlePlural(words2[0]);
    if (base1 === base2) return true;
  }
  
  // Check for synonym groups
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
    ['application', 'use', 'purpose', 'usage'],
    // ✅ NEW: Add common product type synonyms
    ['bolt', 'bolts', 'screw'],
    ['stud', 'studs', 'pin'],
    ['nut', 'nuts', 'fastener'],
    ['pipe', 'pipes', 'tube'],
    ['sheet', 'sheets', 'plate'],
    ['rod', 'rods', 'bar'],
    ['wire', 'wires', 'cable']
  ];
  
  for (const group of synonymGroups) {
    const hasSpec1 = group.some(word => norm1.includes(word));
    const hasSpec2 = group.some(word => norm2.includes(word));
    if (hasSpec1 && hasSpec2) return true;
  }
  
  return false;
}

function isSemanticallySimilarOption(opt1: string, opt2: string): boolean {
  const normalize = (str: string) => 
    str.toLowerCase()
      .replace(/^ss\s*/i, '')
      .replace(/^ms\s*/i, '')
      .replace(/^astm\s*/i, '')
      .replace(/^is\s*/i, '')
      .replace(/[^a-z0-9.]/g, '')
      .trim();
  
  const norm1 = normalize(opt1);
  const norm2 = normalize(opt2);
  
  if (norm1 === norm2) return true;
  
  // ✅ Check for range matches
  const isRangeMatch = checkRangeMatch(opt1.toLowerCase(), opt2.toLowerCase());
  if (isRangeMatch) return true;
  
  // Check for numeric equivalence (e.g., "10mm" vs "10 mm" vs "10")
  // ✅ IMPROVED VERSION FOR DECIMALS AND RANGES
  const extractNumberAndUnit = (str: string) => {
    const strLower = str.toLowerCase();
    
    // ✅ Handle ranges like "0.1mm to 6.0mm"
    const rangeMatch = strLower.match(/(\d+(?:\.\d+)?)\s*(?:mm|cm|meter|millimeter|centimeter|inch|ft|feet|"|')?\s*(?:to|till|upto|up to|~|-)\s*(\d+(?:\.\d+)?)\s*(mm|cm|meter|millimeter|centimeter|inch|ft|feet|"|')?/i);
    if (rangeMatch) {
      return {
        isRange: true,
        min: parseFloat(rangeMatch[1]),
        max: parseFloat(rangeMatch[2]),
        unit: (rangeMatch[3] || 'mm').toLowerCase()
      };
    }
    
    // Regular number extraction
    const numMatch = strLower.match(/(\d+(?:\.\d+)?)/);
    const unitMatch = strLower.match(/(mm|cm|meter|millimeter|centimeter|inch|ft|feet|"|'|kg|g|l|ml)/i);
    return {
      isRange: false,
      number: numMatch ? parseFloat(numMatch[1]) : null,
      unit: unitMatch ? unitMatch[0].toLowerCase() : null
    };
  };
  
  const data1 = extractNumberAndUnit(opt1);
  const data2 = extractNumberAndUnit(opt2);
  
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
    const opt1Lower = opt1.toLowerCase();
    const opt2Lower = opt2.toLowerCase();
    
    const hasMm1 = opt1Lower.includes('mm') || opt1Lower.includes('millimeter');
    const hasMm2 = opt2Lower.includes('mm') || opt2Lower.includes('millimeter');
    const hasCm1 = opt1Lower.includes('cm') || opt1Lower.includes('centimeter');
    const hasCm2 = opt2Lower.includes('cm') || opt2Lower.includes('centimeter');
    
    if ((hasMm1 && hasMm2) || (hasCm1 && hasCm2)) {
      return true;
    }
  }
  
  return false;
}

function checkRangeMatch(str1: string, str2: string): boolean {
  // Extract numbers from both strings
  const extractAllNumbers = (str: string): number[] => {
    const matches = str.match(/\d+(?:\.\d+)?/g);
    return matches ? matches.map(m => parseFloat(m)) : [];
  };
  
  const nums1 = extractAllNumbers(str1);
  const nums2 = extractAllNumbers(str2);
  
  if (nums1.length === 0 || nums2.length === 0) return false;
  
  // If one is a range (has "to", "-", "~", "up to", etc.)
  const isRange1 = /(?:to|\-|~|up to|upto|from)/i.test(str1);
  const isRange2 = /(?:to|\-|~|up to|upto|from)/i.test(str2);
  
  if (isRange1 && nums1.length >= 2) {
    // str1 is a range like "0.1mm to 6.0mm"
    const [min1, max1] = [Math.min(...nums1.slice(0, 2)), Math.max(...nums1.slice(0, 2))];
    
    // Check if any number from str2 falls within str1 range
    for (const num of nums2) {
      if (num >= min1 && num <= max1) {
        // Check units
        const hasMm1 = str1.includes('mm') || str1.includes('millimeter');
        const hasMm2 = str2.includes('mm') || str2.includes('millimeter');
        const hasCm1 = str1.includes('cm') || str1.includes('centimeter');
        const hasCm2 = str2.includes('cm') || str2.includes('centimeter');
        
        if ((hasMm1 && hasMm2) || (hasCm1 && hasCm2) || 
            (!hasMm1 && !hasCm1 && !hasMm2 && !hasCm2)) {
          return true;
        }
      }
    }
  }
  
  if (isRange2 && nums2.length >= 2) {
    // str2 is a range like "0.1mm to 6.0mm"
    const [min2, max2] = [Math.min(...nums2.slice(0, 2)), Math.max(...nums2.slice(0, 2))];
    
    // Check if any number from str1 falls within str2 range
    for (const num of nums1) {
      if (num >= min2 && num <= max2) {
        // Check units
        const hasMm1 = str1.includes('mm') || str1.includes('millimeter');
        const hasMm2 = str2.includes('mm') || str2.includes('millimeter');
        const hasCm1 = str1.includes('cm') || str1.includes('centimeter');
        const hasCm2 = str2.includes('cm') || str2.includes('centimeter');
        
        if ((hasMm1 && hasMm2) || (hasCm1 && hasCm2) || 
            (!hasMm1 && !hasCm1 && !hasMm2 && !hasCm2)) {
          return true;
        }
      }
    }
  }
  
  return false;
}

function getOptionsWithinRange(rangeStr: string, options: string[]): string[] {
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
// For Common Specs: Bas common options only
function findCommonOptionsOnly(options1: string[], options2: string[]): string[] {
  const common: string[] = [];
  const usedIndices = new Set<number>();
  
  options1.forEach((opt1) => {
    options2.forEach((opt2, j) => {
      if (usedIndices.has(j)) return;
      
      // Check if options are semantically similar
      if (isSemanticallySimilarOption(opt1, opt2)) {
        common.push(opt1);
        usedIndices.add(j);
      }
    });
  });
  
  return common; 
}
// For Buyer ISQs: Common options first, then Stage 1 unique options (total 8)
function getBuyerISQOptions(stage1Options: string[], stage2Options: string[]): string[] {
  const result: string[] = [];
  const used = new Set<string>();
  
  // Phase 1: Find and add common options first
  const matchedStage2Indices = new Set<number>();
  
  stage1Options.forEach((opt1) => {
    stage2Options.forEach((opt2, j) => {
      if (result.length >= 8) return;
      if (matchedStage2Indices.has(j)) return;
      
      if (isSemanticallySimilarOption(opt1, opt2)) {
        result.push(opt1);
        used.add(opt1.toLowerCase());
        matchedStage2Indices.add(j);
      }
    });
  });
  
  // Phase 2: Add remaining Stage 1 options
  if (result.length < 8) {
    stage1Options.forEach(opt1 => {
      if (result.length >= 8) return;
      const optLower = opt1.toLowerCase();
      if (!used.has(optLower)) {
        result.push(opt1);
        used.add(optLower);
      }
    });
  }
  
  // Phase 3: If still less than 8, add Stage 2 options
  if (result.length < 8) {
    stage2Options.forEach((opt2, j) => {
      if (result.length >= 8) return;
      if (!matchedStage2Indices.has(j)) {
        const optLower = opt2.toLowerCase();
        if (!used.has(optLower)) {
          result.push(opt2);
          used.add(optLower);
        }
      }
    });
  }
  
  return result.slice(0, 8);
}

function selectTopBuyerISQsSemantic(
  commonSpecs: CommonSpecItem[],
  stage2ISQs: ISQ[]
): BuyerISQItem[] {
  // Score each common spec based on importance
  const scoredSpecs = commonSpecs.map(spec => {
    let score = 0;
    
    // Tier priority
    if (spec.category === 'Primary') score += 3;
    if (spec.category === 'Secondary') score += 1;
    
    // Option count
    score += Math.min(spec.options.length, 5);
    
    // Check if it's in stage2 config or keys (higher importance)
    const isInStage2Important = stage2ISQs.some(isq => 
      isSemanticallySimilar(spec.spec_name, isq.name)
    );
    if (isInStage2Important) score += 2;
    
    return { ...spec, score };
  });
  
  // Sort by score descending
  scoredSpecs.sort((a, b) => b.score - a.score);
  
  // Take top 2
  return scoredSpecs.slice(0, 2).map(spec => ({
    spec_name: spec.spec_name,
    options: spec.options, // This will be replaced later with optimized options
    category: spec.category
  }));
}

function normalizeSpecName(name: string): string {
  let normalized = name.toLowerCase().trim();
  
  // Remove special characters
  normalized = normalized.replace(/[()\-_,.;]/g, ' ');
  
  // ✅ NEW: Handle plurals
  const words = normalized.split(/\s+/).filter(w => w.length > 0);
  const singularWords = words.map(word => {
    // Handle common plural endings
    if (word.endsWith('s') && !word.endsWith('ss')) {
      return word.slice(0, -1); // bolts -> bolt
    }
    if (word.endsWith('ies')) {
      return word.slice(0, -3) + 'y'; // categories -> category
    }
    if (word.endsWith('es')) {
      const base = word.slice(0, -2);
      // Check if removing 'es' makes sense
      if (['ss', 'x', 'ch', 'sh'].some(suffix => base.endsWith(suffix))) {
        return base; // boxes -> box, churches -> church
      }
    }
    return word;
  });
  
  // Standardize common terms (expanded list)
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
    'usage': 'application',
    // ✅ NEW: Product type synonyms
    'bolt': 'bolt',
    'bolts': 'bolt',
    'stud': 'stud',
    'studs': 'stud',
    'nut': 'nut',
    'nuts': 'nut',
    'screw': 'bolt',
    'fastener': 'bolt',
    'pipe': 'pipe',
    'pipes': 'pipe',
    'tube': 'pipe',
    'sheet': 'sheet',
    'sheets': 'sheet',
    'plate': 'sheet',
    'rod': 'rod',
    'rods': 'rod',
    'bar': 'rod',
    'wire': 'wire',
    'wires': 'wire',
    'cable': 'wire'
  };
  
  const standardizedWords = singularWords.map(word => {
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
  
  // Remove duplicates
  const uniqueWords = [...new Set(standardizedWords)];
  
  // Remove common filler words
  const fillerWords = ['sheet', 'plate', 'pipe', 'rod', 'bar', 'wire', 'cable', 'bolt', 'nut', 'stud', 'screw', 'in', 'for', 'of', 'the', 'and', 'or'];
  const filteredWords = uniqueWords.filter(word => !fillerWords.includes(word));
  
  return filteredWords.join(' ').trim();
}