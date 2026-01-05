import React, { useState } from "react";
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
  priority: number;
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
  const [showAllBuyerISQs, setShowAllBuyerISQs] = useState(false);

  const primaryCommonSpecs = commonSpecs.filter((s) => s.category === "Primary");
  const secondaryCommonSpecs = commonSpecs.filter((s) => s.category === "Secondary");

  // Determine which Buyer ISQs to show
  const displayedBuyerISQs = showAllBuyerISQs ? buyerISQs : buyerISQs.slice(0, 2);
  const hasMoreBuyerISQs = buyerISQs.length > 2;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Stage 3: Final Specifications</h2>
      <p className="text-gray-600 mb-8">
        Specifications common to both Stage 1 and Stage 2
      </p>

      {commonSpecs.length === 0 && buyerISQs.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-lg text-yellow-800">
          <p className="font-semibold">No common specifications found</p>
          <p className="text-sm mt-2">There are no specifications that appear in both stages.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Common Specifications */}
          <div>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg p-6 h-full">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-blue-900 flex items-center gap-2">
                  <span className="inline-block w-10 h-10 bg-blue-300 rounded-full flex items-center justify-center text-blue-900 text-lg font-bold">
                    {commonSpecs.length}
                  </span>
                  Common Specifications
                </h3>
                <div className="text-sm text-blue-700 font-medium">
                  {primaryCommonSpecs.length} Primary, {secondaryCommonSpecs.length} Secondary
                </div>
              </div>
              <p className="text-sm text-blue-700 mb-6">
                Specifications that appear in both Stage 1 and Stage 2
              </p>

              <div className="space-y-6">
                {primaryCommonSpecs.length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold text-blue-700 mb-3">Primary Specs</h4>
                    <div className="space-y-4">
                      {primaryCommonSpecs.map((spec, idx) => (
                        <SpecCard key={idx} spec={spec} color="blue" />
                      ))}
                    </div>
                  </div>
                )}

                {secondaryCommonSpecs.length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold text-green-700 mb-3">Secondary Specs</h4>
                    <div className="space-y-4">
                      {secondaryCommonSpecs.map((spec, idx) => (
                        <SpecCard key={idx} spec={spec} color="green" />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Buyer ISQs */}
          <div>
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 rounded-lg p-6 h-full">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-amber-900 flex items-center gap-2">
                  <span className="inline-block w-10 h-10 bg-amber-300 rounded-full flex items-center justify-center text-amber-900 text-lg font-bold">
                    {buyerISQs.length}
                  </span>
                  Buyer ISQs
                </h3>
                <div className="text-sm text-amber-700 font-medium">
                  Based on buyer search patterns
                </div>
              </div>
              <p className="text-sm text-amber-700 mb-6">
                Important specifications frequently searched by buyers
              </p>

              {buyerISQs.length > 0 ? (
                <div>
                  <div className="space-y-6">
                    {displayedBuyerISQs.map((spec, idx) => (
                      <SpecCard key={idx} spec={spec} color="amber" />
                    ))}
                  </div>
                  
                  {hasMoreBuyerISQs && (
                    <div className="mt-6 text-center">
                      <button
                        onClick={() => setShowAllBuyerISQs(!showAllBuyerISQs)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 font-medium rounded-lg transition-colors"
                      >
                        {showAllBuyerISQs ? (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                            Show Less
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                            Show All {buyerISQs.length} Buyer ISQs
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white border border-amber-200 p-6 rounded-lg text-center">
                  <p className="text-gray-600">No buyer ISQs available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 pt-8 border-t-2 border-gray-200">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>Common Specifications:</strong> {commonSpecs.length} specification
              {commonSpecs.length !== 1 ? "s" : ""} found across both stages.
              {primaryCommonSpecs.length > 0 && ` ${primaryCommonSpecs.length} Primary,`}
              {secondaryCommonSpecs.length > 0 && ` ${secondaryCommonSpecs.length} Secondary`}
            </p>
          </div>
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>Buyer ISQs:</strong> {buyerISQs.length} specification
              {buyerISQs.length !== 1 ? "s" : ""} based on buyer search patterns.
              {hasMoreBuyerISQs && !showAllBuyerISQs && ` Showing 2 of ${buyerISQs.length}.`}
            </p>
          </div>
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
            {spec.options.length === 0 && (
              <span className="inline-block ml-2 text-gray-500 text-xs">
                (No common options)
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {spec.options.length > 0 ? (
          spec.options.map((option, idx) => (
            <span key={idx} className={`${colors.text} bg-white border border-current px-3 py-1 rounded-full text-sm`}>
              {option}
            </span>
          ))
        ) : (
          <span className="text-gray-400 italic text-sm">
            No common options available for this specification
          </span>
        )}
      </div>
    </div>
  );
}

function extractCommonAndBuyerSpecs(
  stage1: Stage1Output,
  isqs: { config: ISQ; keys: ISQ[]; buyers: ISQ[] }
): { commonSpecs: CommonSpecItem[]; buyerISQs: BuyerISQItem[] } {
  // Collect all stage2 ISQs with priorities
  const stage2ISQs: (ISQ & { priority: number })[] = [
    { ...isqs.config, priority: 3 }, // Config ISQ highest priority
    ...isqs.keys.map(k => ({ ...k, priority: 2 })), // Keys medium priority
    ...isqs.buyers.map(b => ({ ...b, priority: 1 })) // Buyers lowest priority
  ];
  
  const stage1AllSpecs: Array<{
    spec_name: string;
    options: string[];
    input_type: string;
    tier: 'Primary' | 'Secondary';
    priority: number;
  }> = [];
  
  // Extract all specs from stage1 with priorities
  stage1.seller_specs.forEach((ss) => {
    ss.mcats.forEach((mcat) => {
      const { finalized_primary_specs, finalized_secondary_specs } = mcat.finalized_specs;
      
      // Primary specs: priority 3
      finalized_primary_specs.specs.forEach((spec) => {
        stage1AllSpecs.push({
          spec_name: spec.spec_name,
          options: spec.options || [],
          input_type: spec.input_type,
          tier: 'Primary',
          priority: 3
        });
      });
      
      // Secondary specs: priority 2
      finalized_secondary_specs.specs.forEach((spec) => {
        stage1AllSpecs.push({
          spec_name: spec.spec_name,
          options: spec.options || [],
          input_type: spec.input_type,
          tier: 'Secondary',
          priority: 2
        });
      });
    });
  });
  
  // Find semantically common specs with improved matching
  const commonSpecs: CommonSpecItem[] = [];
  const matchedStage1 = new Set<number>();
  const matchedStage2 = new Set<number>();
  
  stage1AllSpecs.forEach((stage1Spec, i) => {
    // Find best matching Stage2 ISQ
    let bestMatchIndex = -1;
    let bestMatchPriority = 0;
    let bestMatchOptions: string[] = [];
    
    stage2ISQs.forEach((stage2ISQ, j) => {
      if (matchedStage2.has(j)) return;
      
      if (isSemanticallySimilar(stage1Spec.spec_name, stage2ISQ.name)) {
        const combinedPriority = stage1Spec.priority + stage2ISQ.priority;
        
        if (bestMatchIndex === -1 || combinedPriority > bestMatchPriority) {
          bestMatchIndex = j;
          bestMatchPriority = combinedPriority;
          bestMatchOptions = stage2ISQ.options || [];
        }
      }
    });
    
    if (bestMatchIndex !== -1) {
      matchedStage1.add(i);
      matchedStage2.add(bestMatchIndex);
      
      // Find common options with strong matching
      const commonOptions = findCommonOptionsWithStrongMatching(
        stage1Spec.options, 
        bestMatchOptions
      );
      
      // Calculate display priority
      const displayPriority = stage1Spec.priority + stage2ISQs[bestMatchIndex].priority;
      
      commonSpecs.push({
        spec_name: stage1Spec.spec_name,
        options: commonOptions,
        input_type: stage1Spec.input_type,
        category: stage1Spec.tier,
        priority: displayPriority
      });
    }
  });
  
  // Remove duplicate specs (same spec name)
  const uniqueCommonSpecs = commonSpecs.filter((spec, index, self) =>
    index === self.findIndex(s => s.spec_name === spec.spec_name)
  );
  
  // Sort by priority (highest first)
  uniqueCommonSpecs.sort((a, b) => b.priority - a.priority);
  
  // Select buyer ISQs from top priority specs
  const buyerISQs = selectTopBuyerISQsByPriority(uniqueCommonSpecs);
  
  // Optimize buyer ISQ options
  const optimizedBuyerISQs = buyerISQs.map(buyerISQ => {
    const originalStage1Spec = stage1AllSpecs.find(spec => 
      spec.spec_name === buyerISQ.spec_name
    );
    
    const correspondingStage2ISQ = stage2ISQs.find(isq => 
      isSemanticallySimilar(buyerISQ.spec_name, isq.name)
    );
    
    if (originalStage1Spec && correspondingStage2ISQ) {
      const optimizedOptions = getOptimizedBuyerOptions(
        originalStage1Spec.options,
        correspondingStage2ISQ.options || [],
        normalizeSpecName(buyerISQ.spec_name)
      );
      
      return {
        ...buyerISQ,
        options: optimizedOptions
      };
    }
    
    return buyerISQ;
  });
  
  return {
    commonSpecs: uniqueCommonSpecs,
    buyerISQs: optimizedBuyerISQs
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
  const fillerWords = ['sheet', 'plate', 'pipe', 'rod', 'bar', 'in', 'for', 'of', 'the'];
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
    ['310', 'ss310', 'ss 310'],
    ['304l', '304 l'],
    ['316l', '316 l'],
    ['ms', 'mild steel', 'carbon steel'],
    ['gi', 'galvanized iron'],
    ['aluminium', 'aluminum'],
  ];
  
  for (const group of materialGroups) {
    const inGroup1 = group.some(term => clean1.includes(term));
    const inGroup2 = group.some(term => clean2.includes(term));
    if (inGroup1 && inGroup2) {
      // Check if same numeric grade
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
    
    // Convert to mm for comparison
    if (unit === 'cm' || unit === 'centimeter') return value * 10;
    if (unit === 'm' || unit === 'meter') return value * 1000;
    if (unit === 'inch' || unit === 'in' || unit === '"') return value * 25.4;
    if (unit === 'ft' || unit === 'feet' || unit === "'") return value * 304.8;
    return value; // assume mm
  };
  
  const meas1 = getMeasurement(clean1);
  const meas2 = getMeasurement(clean2);
  
  if (meas1 && meas2 && Math.abs(meas1 - meas2) < 0.01) {
    return true;
  }
  
  // Mesh count matching (for wire mesh, etc.)
  const meshMatch1 = clean1.match(/(\d+)\s*mesh/i);
  const meshMatch2 = clean2.match(/(\d+)\s*mesh/i);
  if (meshMatch1 && meshMatch2 && meshMatch1[1] === meshMatch2[1]) {
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
    ['plain weave', 'plain'],
    ['twilled weave', 'twilled'],
    ['dutch weave', 'dutch'],
    ['crimped weave', 'crimped'],
  ];
  
  for (const group of shapeGroups) {
    const inGroup1 = group.some(term => clean1.includes(term));
    const inGroup2 = group.some(term => clean2.includes(term));
    if (inGroup1 && inGroup2) return true;
  }
  
  // Finish equivalences
  const finishGroups = [
    ['mill finish', 'mill'],
    ['polished', 'mirror', 'bright'],
    ['galvanized', 'gi'],
    ['brushed', 'hairline'],
    ['anodized', 'anodize'],
    ['painted', 'coated'],
  ];
  
  for (const group of finishGroups) {
    const inGroup1 = group.some(term => clean1.includes(term));
    const inGroup2 = group.some(term => clean2.includes(term));
    if (inGroup1 && inGroup2) return true;
  }
  
  return false;
}

function findCommonOptionsWithStrongMatching(options1: string[], options2: string[]): string[] {
  const common: string[] = [];
  const usedIndices = new Set<number>();
  const addedOptions = new Set<string>();
  
  // First pass: exact matches
  options1.forEach((opt1) => {
    const cleanOpt1 = opt1.trim().toLowerCase();
    
    const exactMatchIndex = options2.findIndex((opt2, j) => {
      if (usedIndices.has(j)) return false;
      const cleanOpt2 = opt2.trim().toLowerCase();
      return cleanOpt1 === cleanOpt2;
    });
    
    if (exactMatchIndex !== -1 && !addedOptions.has(cleanOpt1)) {
      common.push(opt1);
      usedIndices.add(exactMatchIndex);
      addedOptions.add(cleanOpt1);
    }
  });
  
  // Second pass: strong semantic matches
  options1.forEach((opt1) => {
    const cleanOpt1 = opt1.trim().toLowerCase();
    if (addedOptions.has(cleanOpt1)) return;
    
    options2.forEach((opt2, j) => {
      if (usedIndices.has(j)) return;
      if (addedOptions.has(cleanOpt1)) return;
      
      if (areOptionsStronglySimilar(opt1, opt2)) {
        common.push(opt1);
        usedIndices.add(j);
        addedOptions.add(cleanOpt1);
      }
    });
  });
  
  // Remove any remaining duplicates
  const finalCommon: string[] = [];
  const finalSeen = new Set<string>();
  
  for (const opt of common) {
    const cleanOpt = opt.trim().toLowerCase();
    if (!finalSeen.has(cleanOpt)) {
      finalCommon.push(opt);
      finalSeen.add(cleanOpt);
    }
  }
  
  return finalCommon;
}

function getOptimizedBuyerOptions(
  stage1Options: string[], 
  stage2Options: string[],
  normName: string
): string[] {
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
    
    // Take top options (max 8 total)
    const toAdd = Math.min(8 - result.length, remainingStage1.length);
    for (let i = 0; i < toAdd; i++) {
      result.push(remainingStage1[i]);
      seen.add(remainingStage1[i].trim().toLowerCase());
    }
  }
  
  // Step 4: Add remaining Stage 2 options if still needed
  //if (result.length < 8) {
  //  const remainingStage2 = stage2Options.filter(opt => {
  //    const cleanOpt = opt.trim().toLowerCase();
  //    return !seen.has(cleanOpt);
  //  });
    
   // const toAdd = Math.min(8 - result.length, remainingStage2.length);
   // for (let i = 0; i < toAdd; i++) {
   //   result.push(remainingStage2[i]);
   //   seen.add(remainingStage2[i].trim().toLowerCase());
   // }
  //}
  
  // Step 5: Ensure no duplicates in final result
  const finalResult: string[] = [];
  const finalSeen = new Set<string>();
  
  for (const opt of result) {
    const cleanOpt = opt.trim().toLowerCase();
    if (!finalSeen.has(cleanOpt)) {
      finalResult.push(opt);
      finalSeen.add(cleanOpt);
    }
  }
  
  return finalResult.slice(0, 8);
}

function selectTopBuyerISQsByPriority(
  commonSpecs: CommonSpecItem[]
): BuyerISQItem[] {
  // Take top 2 specs by priority
  return commonSpecs.slice(0, 2).map(spec => {
    // Remove duplicate options
    const uniqueOptions: string[] = [];
    const seenOptions = new Set<string>();
    
    spec.options.forEach(option => {
      const cleanOption = option.trim().toLowerCase();
      if (!seenOptions.has(cleanOption)) {
        uniqueOptions.push(option);
        seenOptions.add(cleanOption);
      }
    });
    
    return {
      spec_name: spec.spec_name,
      options: uniqueOptions,
      category: spec.category
    };
  });
}