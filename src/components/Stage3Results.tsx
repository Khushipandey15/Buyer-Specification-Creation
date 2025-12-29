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
          options: spec.options || [],
          input_type: spec.input_type,
          tier: 'Primary'
        });
      });
      
      finalized_secondary_specs.specs.forEach((spec) => {
        stage1AllSpecs.push({
          spec_name: spec.spec_name,
          options: spec.options || [],
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
        
        // Find common options
        const commonOptions = findCommonOptionsOnly(stage1Spec.options, stage2ISQ.options || []);
        
        // Add the spec to commonSpecs even if no common options found
        commonSpecs.push({
          spec_name: stage1Spec.spec_name,
          options: commonOptions,
          input_type: stage1Spec.input_type,
          category: stage1Spec.tier
        });
      }
    });
  });
  
  // Remove duplicate specs (same spec name wale)
  const uniqueCommonSpecs = commonSpecs.filter((spec, index, self) =>
    index === self.findIndex(s => s.spec_name === spec.spec_name)
  );
  
  // Select buyer ISQs from common specs
  const buyerISQs = selectTopBuyerISQsSemantic(uniqueCommonSpecs, stage2ISQs);
  
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
      // Get optimized options for Buyer ISQs
      const buyerOptions = getBuyerISQOptions(
        originalStage1Spec.options,
        correspondingStage2ISQ.options || []
      );
      
      return {
        ...buyerISQ,
        options: buyerOptions
      };
    }
    
    return buyerISQ;
  });
  
  return {
    commonSpecs: uniqueCommonSpecs,
    buyerISQs: optimizedBuyerISQs
  };
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

function isSemanticallySimilarOption(opt1: string, opt2: string): boolean {
  if (!opt1 || !opt2) return false;
  
  const clean1 = opt1.trim().toLowerCase();
  const clean2 = opt2.trim().toLowerCase();
  
  // Direct match
  if (clean1 === clean2) return true;
  
  // Remove extra spaces and compare
  const noSpace1 = clean1.replace(/\s+/g, '');
  const noSpace2 = clean2.replace(/\s+/g, '');
  if (noSpace1 === noSpace2) return true;
  
  // Special cases for common materials
  const materialEquivalences = [
    ['ss304', 'ss 304', '304', 'stainless steel 304', 'stainless304'],
    ['ss316', 'ss 316', '316', 'stainless steel 316', 'stainless316'],
    ['ms', 'mild steel', 'mildsteel', 'carbon steel'],
    ['gi', 'galvanized iron'],
    ['aluminium', 'aluminum'],
  ];
  
  for (const group of materialEquivalences) {
    const hasOpt1 = group.some(variant => clean1.includes(variant));
    const hasOpt2 = group.some(variant => clean2.includes(variant));
    
    if (hasOpt1 && hasOpt2) {
      // Check if same grade/number
      const num1 = clean1.match(/(\d+)/)?.[0];
      const num2 = clean2.match(/(\d+)/)?.[0];
      
      if (num1 && num2 && num1 !== num2) {
        return false; // Different grades
      }
      return true;
    }
  }
  
  // For measurements with units
  const extractMeasurement = (str: string) => {
    const numMatch = str.match(/(\d+(\.\d+)?)/);
    if (!numMatch) return null;
    
    const number = parseFloat(numMatch[1]);
    const unit = str.replace(numMatch[0], '').trim();
    
    return { number, unit };
  };
  
  const meas1 = extractMeasurement(clean1);
  const meas2 = extractMeasurement(clean2);
  
  if (meas1 && meas2 && meas1.number === meas2.number) {
    // Same number, check units
    const mmUnits = ['mm', 'millimeter', 'millimetre'];
    const cmUnits = ['cm', 'centimeter', 'centimetre'];
    const inchUnits = ['inch', 'in', '"', 'inches'];
    const ftUnits = ['ft', 'feet', 'foot'];
    
    const isMm1 = mmUnits.some(u => meas1.unit.includes(u));
    const isMm2 = mmUnits.some(u => meas2.unit.includes(u));
    const isCm1 = cmUnits.some(u => meas1.unit.includes(u));
    const isCm2 = cmUnits.some(u => meas2.unit.includes(u));
    const isInch1 = inchUnits.some(u => meas1.unit.includes(u));
    const isInch2 = inchUnits.some(u => meas2.unit.includes(u));
    const isFt1 = ftUnits.some(u => meas1.unit.includes(u));
    const isFt2 = ftUnits.some(u => meas2.unit.includes(u));
    
    if ((isMm1 && isMm2) || (isCm1 && isCm2) || 
        (isInch1 && isInch2) || (isFt1 && isFt2) ||
        (!isMm1 && !isCm1 && !isInch1 && !isFt1 && 
         !isMm2 && !isCm2 && !isInch2 && !isFt2)) {
      return true;
    }
  }
  
  // For finishes like Mirror, Hairline, etc.
  const finishEquivalences = [
    ['mirror', 'mirror finish', 'polished mirror'],
    ['hairline', 'hairline finish', 'brushed', 'brushed finish'],
    ['mill', 'mill finish', 'mill finished'],
    ['galvanized', 'gi', 'galvanized finish'],
    ['powder', 'powder coated', 'powder coating'],
  ];
  
  for (const group of finishEquivalences) {
    const hasOpt1 = group.some(variant => clean1.includes(variant));
    const hasOpt2 = group.some(variant => clean2.includes(variant));
    
    if (hasOpt1 && hasOpt2) return true;
  }
  
  return false;
}

function areOptionsStronglySimilar(opt1: string, opt2: string): boolean {
  if (!opt1 || !opt2) return false;
  
  const clean1 = opt1.toLowerCase().trim().replace(/\s+/g, '');
  const clean2 = opt2.toLowerCase().trim().replace(/\s+/g, '');
  
  // Direct match
  if (clean1 === clean2) return true;
  
  // Common equivalences
  const equivalences: Record<string, string[]> = {
    'round': ['circular', 'circle'],
    'square': ['squared'],
    'slotted': ['slot'],
    'rectangular': ['rectangle'],
    'hexagonal': ['hexagon'],
    'flat': ['flatbar'],
    'angle': ['lshape', 'l-shaped'],
    'channel': ['cshape', 'c-shaped'],
    'pipe': ['tube', 'tubular'],
    '304': ['304l', '304h', 'ss304', 'ss304'],
    '316': ['316l', '316ti', 'ss316', 'ss316'],
    'ss304': ['stainlesssteel304', 'stainless304'],
    'ss316': ['stainlesssteel316', 'stainless316'],
    'ms': ['mildsteel', 'carbonsteel'],
    'gi': ['galvanizediron'],
    'aluminium': ['aluminum'],
    'small': ['sm', 's'],
    'medium': ['med', 'm'],
    'large': ['lg', 'l'],
    'extralarge': ['xl', 'x-large'],
  };
  
  // Check equivalence groups
  for (const [base, alts] of Object.entries(equivalences)) {
    const allVariants = [base, ...alts];
    const hasOpt1 = allVariants.some(variant => clean1.includes(variant));
    const hasOpt2 = allVariants.some(variant => clean2.includes(variant));
    
    if (hasOpt1 && hasOpt2) {
      return true;
    }
  }
  
  // Number-based matching (for sizes, thickness, etc.)
  const numMatch1 = clean1.match(/(\d+(\.\d+)?)/);
  const numMatch2 = clean2.match(/(\d+(\.\d+)?)/);
  
  if (numMatch1 && numMatch2 && numMatch1[1] === numMatch2[1]) {
    // Same number found
    const unit1 = clean1.replace(numMatch1[1], '');
    const unit2 = clean2.replace(numMatch2[1], '');
    
    // Check if units are compatible
    const mmUnits = ['mm', 'millimeter', 'millimetre'];
    const cmUnits = ['cm', 'centimeter', 'centimetre'];
    const inchUnits = ['inch', 'in', '"', 'inches'];
    const ftUnits = ['ft', 'feet', 'foot'];
    
    const hasMm1 = mmUnits.some(u => unit1.includes(u));
    const hasMm2 = mmUnits.some(u => unit2.includes(u));
    const hasCm1 = cmUnits.some(u => unit1.includes(u));
    const hasCm2 = cmUnits.some(u => unit2.includes(u));
    const hasInch1 = inchUnits.some(u => unit1.includes(u));
    const hasInch2 = inchUnits.some(u => unit2.includes(u));
    const hasFt1 = ftUnits.some(u => unit1.includes(u));
    const hasFt2 = ftUnits.some(u => unit2.includes(u));
    
    if ((hasMm1 && hasMm2) || (hasCm1 && hasCm2) || 
        (hasInch1 && hasInch2) || (hasFt1 && hasFt2) ||
        (!hasMm1 && !hasCm1 && !hasInch1 && !hasFt1 && 
         !hasMm2 && !hasCm2 && !hasInch2 && !hasFt2)) {
      return true;
    }
  }
  
  return false;
}

// For Common Specs: Bas common options only (jitne hain sab)
function findCommonOptionsOnly(options1: string[], options2: string[]): string[] {
  const common: string[] = [];
  const usedIndices = new Set<number>();
  const addedOptions = new Set<string>(); // Duplicates track karne ke liye
  
  // First pass: exact matches
  options1.forEach((opt1) => {
    const cleanOpt1 = opt1.trim().toLowerCase();
    
    const exactMatchIndex = options2.findIndex((opt2, j) => {
      if (usedIndices.has(j)) return false;
      const cleanOpt2 = opt2.trim().toLowerCase();
      return cleanOpt1 === cleanOpt2;
    });
    
    if (exactMatchIndex !== -1 && !addedOptions.has(cleanOpt1)) {
      common.push(opt1); // Original casing preserve karo
      usedIndices.add(exactMatchIndex);
      addedOptions.add(cleanOpt1);
    }
  });
  
  // Second pass: semantic matches (baki options ke liye)
  options1.forEach((opt1) => {
    const cleanOpt1 = opt1.trim().toLowerCase();
    if (addedOptions.has(cleanOpt1)) return; // Already added
    
    options2.forEach((opt2, j) => {
      if (usedIndices.has(j)) return;
      if (addedOptions.has(cleanOpt1)) return;
      
      if (isSemanticallySimilarOption(opt1, opt2)) {
        common.push(opt1);
        usedIndices.add(j);
        addedOptions.add(cleanOpt1);
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
  
  // Standardize common terms
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
  
  // Split into words and standardize
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
  
  // Remove duplicates
  const uniqueWords = [...new Set(standardizedWords)];
  
  // Remove common filler words
  const fillerWords = ['sheet', 'plate', 'pipe', 'rod', 'bar', 'in', 'for', 'of', 'the'];
  const filteredWords = uniqueWords.filter(word => !fillerWords.includes(word));
  
  return filteredWords.join(' ').trim();
}