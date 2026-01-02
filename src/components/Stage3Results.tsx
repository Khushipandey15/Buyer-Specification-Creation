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
    <div className="stage3-results">
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* LEFT SIDE: Common Specifications */}
          <div className="common-specs-section">
            <div className="space-y-8">
              {primaryCommonSpecs.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-blue-600 mb-4">
                    Common Primary Specs ({primaryCommonSpecs.length})
                  </h3>
                  <div className="grid gap-4">
                    {primaryCommonSpecs.map((spec, idx) => (
                      <SpecCard key={idx} spec={spec} color="blue" />
                    ))}
                  </div>
                </div>
              )}

              {secondaryCommonSpecs.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-green-600 mb-4">
                    Common Secondary Specs ({secondaryCommonSpecs.length})
                  </h3>
                  <div className="grid gap-4">
                    {secondaryCommonSpecs.map((spec, idx) => (
                      <SpecCard key={idx} spec={spec} color="green" />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT SIDE: Buyer ISQs */}
          <div className="buyer-isqs-section">
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 rounded-lg p-6 sticky top-6">
              <h3 className="text-lg font-semibold text-amber-900 mb-4 flex items-center gap-2">
                <span className="inline-block w-8 h-8 bg-amber-300 rounded-full flex items-center justify-center text-amber-900 text-sm font-bold">
                  {buyerISQs.length}
                </span>
                Buyer ISQs (Top {buyerISQs.length})
              </h3>
              <p className="text-xs text-amber-700 mb-4">
                Selected from common specs based on importance and buyer search patterns
              </p>

              {buyerISQs.length > 0 ? (
                <div className="space-y-4">
                  {buyerISQs.map((spec, idx) => (
                    <div key={idx} className="bg-white border border-amber-200 rounded-lg overflow-hidden">
                      <div className="bg-amber-50 px-4 py-3 border-b border-amber-200">
                        <div className="font-semibold text-amber-900">{spec.spec_name}</div>
                        <div className="text-xs text-amber-700 mt-1">
                          {spec.category} • {spec.options.length} options
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="flex flex-wrap gap-2">
                          {spec.options.map((option, oIdx) => (
                            <span
                              key={oIdx}
                              className="inline-block bg-amber-100 text-amber-800 px-3 py-1.5 rounded-md text-sm font-medium"
                            >
                              {option}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white border border-amber-200 p-6 rounded-lg text-center">
                  <p className="text-sm text-gray-600">No buyer ISQs selected</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 pt-8 border-t-2 border-gray-200">
        <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg">
          <p className="text-sm text-gray-700">
            <strong>Summary:</strong> Found {commonSpecs.length} common specification
            {commonSpecs.length !== 1 ? "s" : ""} across Primary and Secondary tiers.
            {buyerISQs.length > 0 && ` Selected ${buyerISQs.length} buyer ISQ(s) for important specs.`}
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
    blue: { 
      bg: "bg-blue-50", 
      border: "border-blue-200", 
      text: "text-blue-800", 
      badge: "bg-blue-100 text-blue-800" 
    },
    green: { 
      bg: "bg-green-50", 
      border: "border-green-200", 
      text: "text-green-800", 
      badge: "bg-green-100 text-green-800" 
    },
    amber: { 
      bg: "bg-amber-50", 
      border: "border-amber-200", 
      text: "text-amber-800", 
      badge: "bg-amber-100 text-amber-800" 
    },
  };

  const colors = colorClasses[color];

  return (
    <div className={`${colors.bg} border ${colors.border} rounded-lg overflow-hidden`}>
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="font-semibold text-gray-900 text-lg">{spec.spec_name}</div>
            <div className="text-xs text-gray-600 mt-2 flex items-center gap-2">
              <span className={`inline-block px-3 py-1 ${colors.badge} rounded-full font-medium`}>
                {spec.category}
              </span>
              {spec.options.length === 0 && (
                <span className="text-gray-500">
                  (No common options)
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-3">
          {spec.options.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {spec.options.map((option, idx) => (
                <span 
                  key={idx} 
                  className="inline-block bg-white border border-gray-200 px-3 py-1.5 rounded-md text-sm text-gray-700"
                >
                  {option}
                </span>
              ))}
            </div>
          ) : (
            <div className="text-gray-400 italic text-sm py-2">
              No common options available for this specification
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function extractCommonAndBuyerSpecs(
  stage1: Stage1Output,
  isqs: { config: ISQ; keys: ISQ[]; buyers: ISQ[] }
): { commonSpecs: CommonSpecItem[]; buyerISQs: BuyerISQItem[] } {
  // Collect all stage2 ISQs
  const stage2ISQs: ISQ[] = [
    isqs.config,
    ...isqs.keys,
    ...isqs.buyers
  ];
  
  const stage1AllSpecs: Array<{
    spec_name: string;
    options: string[];
    input_type: string;
    tier: 'Primary' | 'Secondary';
    normName: string;
  }> = [];
  
  // Extract all specs from stage1
  stage1.seller_specs.forEach((ss) => {
    ss.mcats.forEach((mcat) => {
      const { finalized_primary_specs, finalized_secondary_specs } = mcat.finalized_specs;
      
      // Primary specs
      finalized_primary_specs.specs.forEach((spec) => {
        stage1AllSpecs.push({
          spec_name: spec.spec_name,
          options: spec.options || [],
          input_type: spec.input_type,
          tier: 'Primary',
          normName: normalizeSpecName(spec.spec_name)
        });
      });
      
      // Secondary specs
      finalized_secondary_specs.specs.forEach((spec) => {
        stage1AllSpecs.push({
          spec_name: spec.spec_name,
          options: spec.options || [],
          input_type: spec.input_type,
          tier: 'Secondary',
          normName: normalizeSpecName(spec.spec_name)
        });
      });
    });
  });
  
  // Find semantically common specs
  const commonSpecs: CommonSpecItem[] = [];
  const matchedStage1 = new Set<number>();
  const matchedStage2 = new Set<number>();
  
  stage1AllSpecs.forEach((stage1Spec, i) => {
    let bestMatchIndex = -1;
    let bestMatchOptions: string[] = [];
    
    stage2ISQs.forEach((stage2ISQ, j) => {
      if (matchedStage2.has(j)) return;
      
      if (isSemanticallySimilar(stage1Spec.spec_name, stage2ISQ.name)) {
        if (bestMatchIndex === -1) {
          bestMatchIndex = j;
          bestMatchOptions = stage2ISQ.options || [];
        }
      }
    });
    
    if (bestMatchIndex !== -1) {
      matchedStage1.add(i);
      matchedStage2.add(bestMatchIndex);
      
      // Find common options with range matching
      const commonOptions = findCommonOptionsWithRangeMatching(
        stage1Spec.options, 
        bestMatchOptions,
        stage1Spec.normName
      );
      
      commonSpecs.push({
        spec_name: stage1Spec.spec_name,
        options: commonOptions,
        input_type: stage1Spec.input_type,
        category: stage1Spec.tier
      });
    }
  });
  
  // Remove duplicate specs (same spec name)
  const uniqueCommonSpecs = commonSpecs.filter((spec, index, self) =>
    index === self.findIndex(s => s.spec_name === spec.spec_name)
  );
  
  // Select buyer ISQs (prefer Primary specs with more options)
  const buyerISQs = selectBuyerISQs(uniqueCommonSpecs);
  
  return {
    commonSpecs: uniqueCommonSpecs,
    buyerISQs: buyerISQs
  };
}

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
  const fillerWords = ['sheet', 'plate', 'pipe', 'rod', 'bar', 'in', 'for', 'of', 'the', 'to'];
  const filteredWords = uniqueWords.filter(word => !fillerWords.includes(word));

  return filteredWords.join(' ').trim();
}

function isSemanticallySimilar(spec1: string, spec2: string): boolean {
  const norm1 = normalizeSpecName(spec1);
  const norm2 = normalizeSpecName(spec2);
  
  if (norm1 === norm2) return true;
  
  // Check if one contains the other
  if (norm1.includes(norm2) || norm2.includes(norm1)) return true;
  
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
    ['application', 'use', 'purpose', 'usage']
  ];
  
  for (const group of synonymGroups) {
    const hasSpec1 = group.some(word => norm1.includes(word));
    const hasSpec2 = group.some(word => norm2.includes(word));
    if (hasSpec1 && hasSpec2) return true;
  }
  
  return false;
}

// Helper function to extract numeric value from option
function extractValue(option: string): number | null {
  const match = option.match(/(\d+(\.\d+)?)/);
  return match ? parseFloat(match[1]) : null;
}

// Helper function to check if value is within range
function isValueInRange(value: number, rangeStr: string): boolean {
  const rangeMatch = rangeStr.match(/(\d+(\.\d+)?)\s*(?:to|–|-)\s*(\d+(\.\d+)?)/i);
  if (!rangeMatch) return false;
  
  const min = parseFloat(rangeMatch[1]);
  const max = parseFloat(rangeMatch[3]);
  
  return value >= min && value <= max;
}

function findCommonOptionsWithRangeMatching(
  options1: string[], 
  options2: string[],
  normName: string
): string[] {
  const common: string[] = [];
  const usedIndices = new Set<number>();
  const addedValues = new Set<string>();
  
  // Check if this spec typically has ranges
  const isRangeSpec = ['thickness', 'width', 'length', 'diameter', 'size'].some(
    term => normName.includes(term)
  );
  
  // First pass: exact matches
  options1.forEach((opt1, i) => {
    const cleanOpt1 = opt1.trim().toLowerCase();
    
    const exactMatchIndex = options2.findIndex((opt2, j) => {
      if (usedIndices.has(j)) return false;
      const cleanOpt2 = opt2.trim().toLowerCase();
      return cleanOpt1 === cleanOpt2;
    });
    
    if (exactMatchIndex !== -1 && !addedValues.has(cleanOpt1)) {
      common.push(opt1);
      usedIndices.add(exactMatchIndex);
      addedValues.add(cleanOpt1);
    }
  });
  
  // Second pass: range-to-discrete matching for range specs
  if (isRangeSpec) {
    // For each discrete value in options1, check if it fits in any range in options2
    options1.forEach((opt1, i) => {
      if (addedValues.has(opt1.trim().toLowerCase())) return;
      
      const value1 = extractValue(opt1);
      if (value1 === null) return;
      
      const rangeMatchIndex = options2.findIndex((opt2, j) => {
        if (usedIndices.has(j)) return false;
        if (isValueInRange(value1, opt2)) {
          return true;
        }
        return false;
      });
      
      if (rangeMatchIndex !== -1 && !addedValues.has(opt1.trim().toLowerCase())) {
        common.push(opt1);
        usedIndices.add(rangeMatchIndex);
        addedValues.add(opt1.trim().toLowerCase());
      }
    });
    
    // Also check reverse: for each discrete value in options2, check if it fits in any range in options1
    options2.forEach((opt2, j) => {
      if (usedIndices.has(j)) return;
      
      const value2 = extractValue(opt2);
      if (value2 === null) return;
      
      const rangeMatch = options1.find((opt1) => {
        if (isValueInRange(value2, opt1)) {
          return true;
        }
        return false;
      });
      
      if (rangeMatch && !addedValues.has(opt2.trim().toLowerCase())) {
        common.push(opt2);
        usedIndices.add(j);
        addedValues.add(opt2.trim().toLowerCase());
      }
    });
  }
  
  // Third pass: semantic matches for materials, grades, etc.
  options1.forEach((opt1, i) => {
    const cleanOpt1 = opt1.trim().toLowerCase();
    if (addedValues.has(cleanOpt1)) return;
    
    options2.forEach((opt2, j) => {
      if (usedIndices.has(j)) return;
      if (addedValues.has(cleanOpt1)) return;
      
      if (areOptionsSimilar(opt1, opt2) && !addedValues.has(cleanOpt1)) {
        common.push(opt1);
        usedIndices.add(j);
        addedValues.add(cleanOpt1);
      }
    });
  });
  
  return common;
}

function areOptionsSimilar(opt1: string, opt2: string): boolean {
  if (!opt1 || !opt2) return false;
  
  const clean1 = opt1.toLowerCase().trim();
  const clean2 = opt2.toLowerCase().trim();
  
  // Direct match
  if (clean1 === clean2) return true;
  
  // Material and grade matching
  const materialGroups = [
    ['304', 'ss304', 'ss 304', 'stainless steel 304'],
    ['316', 'ss316', 'ss 316', 'stainless steel 316'],
    ['430', 'ss430', 'ss 430'],
    ['201', 'ss201', 'ss 201'],
    ['202', 'ss202', 'ss 202'],
    ['310', 'ss310', 'ss 310'],
    ['304l', '304 l'],
    ['316l', '316 l'],
    ['ms', 'mild steel', 'carbon steel'],
    ['gi', 'galvanized iron'],
    ['aluminium', 'aluminum'],
    ['is 2062 e250', 'e250'],
    ['is 2062 e350', 'e350'],
    ['is 2062 e410', 'e410'],
    ['astm a36', 'a36'],
    ['jis g3101 ss400', 'ss400'],
    ['en s275jr', 's275jr'],
    ['en s355jr', 's355jr']
  ];
  
  for (const group of materialGroups) {
    const inGroup1 = group.some(term => clean1.includes(term));
    const inGroup2 = group.some(term => clean2.includes(term));
    if (inGroup1 && inGroup2) {
      return true;
    }
  }
  
  // Brand matching
  const brandGroups = [
    ['sail', 'steel authority of india'],
    ['tata steel', 'tata'],
    ['jsw steel', 'jsw'],
    ['essar steel', 'essar'],
    ['jindal steel', 'jindal'],
    ['bhushan steel', 'bhushan'],
    ['jspl', 'jindal steel & power'],
    ['arcelormittal', 'arcelor mittal']
  ];
  
  for (const group of brandGroups) {
    const inGroup1 = group.some(term => clean1.includes(term));
    const inGroup2 = group.some(term => clean2.includes(term));
    if (inGroup1 && inGroup2) {
      return true;
    }
  }
  
  // Finish matching
  const finishGroups = [
    ['hot rolled black', 'hot rolled', 'black'],
    ['pickled & oiled', 'pickled', 'oiled'],
    ['shot blasted', 'shot blast'],
    ['descaled', 'descaling'],
    ['mill finish', 'mill'],
    ['polished', 'mirror'],
    ['galvanized', 'gi', 'galvanize'],
    ['anodized', 'anodize'],
    ['painted', 'coated']
  ];
  
  for (const group of finishGroups) {
    const inGroup1 = group.some(term => clean1.includes(term));
    const inGroup2 = group.some(term => clean2.includes(term));
    if (inGroup1 && inGroup2) {
      return true;
    }
  }
  
  return false;
}

function selectBuyerISQs(commonSpecs: CommonSpecItem[]): BuyerISQItem[] {
  // Score each spec
  const scoredSpecs = commonSpecs.map(spec => {
    let score = 0;
    
    // Category priority
    if (spec.category === 'Primary') score += 10;
    if (spec.category === 'Secondary') score += 5;
    
    // Options count
    score += Math.min(spec.options.length, 10);
    
    // Important specs get bonus
    const importantSpecs = ['grade', 'thickness', 'material', 'size', 'width', 'length'];
    const isImportant = importantSpecs.some(term => 
      spec.spec_name.toLowerCase().includes(term)
    );
    if (isImportant) score += 5;
    
    return { ...spec, score };
  });
  
  // Sort by score (highest first)
  scoredSpecs.sort((a, b) => b.score - a.score);
  
  // Take top 2
  return scoredSpecs.slice(0, 2).map(spec => ({
    spec_name: spec.spec_name,
    options: deduplicateOptions(spec.options),
    category: spec.category
  }));
}

function deduplicateOptions(options: string[]): string[] {
  const unique: string[] = [];
  const seen = new Set<string>();
  
  for (const opt of options) {
    const cleanOpt = opt.trim().toLowerCase();
    if (!seen.has(cleanOpt)) {
      unique.push(opt);
      seen.add(cleanOpt);
    }
  }
  
  return unique.slice(0, 8); // Max 8 options for Buyer ISQs
}