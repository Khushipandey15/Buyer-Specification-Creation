import React from "react";
import type { ISQ } from "../types";

interface Stage2ResultsProps {
  isqs: {
    config: ISQ;
    keys: ISQ[];
  };
  onDownloadExcel: () => void;
}

export default function Stage2Results({ isqs, onDownloadExcel }: Stage2ResultsProps) {
  // Function to clean options
  const cleanOptions = (options: string[]): string[] => {
    if (!Array.isArray(options)) return [];
    
    return options
      .map(opt => {
        if (typeof opt !== 'string') return String(opt).trim();
        
        // Remove common formatting issues
        return opt
          .replace(/^["'\[]+/, '')  // Remove leading quotes/brackets
          .replace(/["'\]]+$/, '')  // Remove trailing quotes/brackets
          .replace(/^\s+|\s+$/g, '') // Trim whitespace
          .trim();
      })
      .filter(opt => {
        // Filter out invalid options
        if (!opt || opt.length === 0) return false;
        if (opt.toLowerCase().includes('option')) return false;
        if (opt.toLowerCase().includes('value')) return false;
        if (opt.toLowerCase().includes('spec')) return false;
        if (opt.toLowerCase() === 'undefined') return false;
        if (opt.toLowerCase() === 'null') return false;
        if (opt === '[]') return false;
        if (opt === '{}') return false;
        if (opt.length > 50) return false; // Too long
        return true;
      })
      .slice(0, 10); // Limit to 10 options max
  };

  // Validate and clean the data before rendering
  const cleanISQs = React.useMemo(() => {
    const cleanedConfig: ISQ = {
      name: isqs.config?.name?.trim() || "Specification",
      options: cleanOptions(isqs.config?.options || [])
    };

    const cleanedKeys: ISQ[] = (isqs.keys || []).map((key, index) => ({
      name: key?.name?.trim() || `Specification ${index + 1}`,
      options: cleanOptions(key?.options || [])
    })).filter(key => key.options.length > 0);

    return { config: cleanedConfig, keys: cleanedKeys };
  }, [isqs]);

  // Check if data is valid
  const isValidData = cleanISQs.config.options.length > 0 || 
                      cleanISQs.keys.some(key => key.options.length > 0);

  // If no valid data, show error
  if (!isValidData) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Stage 2: ISQ Extraction</h2>
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-lg my-6">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">
            ⚠️ No Valid Specifications Found
          </h3>
          <p className="text-yellow-700 mb-4">
            The extraction process did not find valid specifications from the provided URLs.
            This could be because:
          </p>
          <ul className="list-disc pl-5 text-yellow-700 mb-4 space-y-1">
            <li>URLs didn't contain clear product specifications</li>
            <li>Website content couldn't be properly parsed</li>
            <li>Product information was not in a standard format</li>
          </ul>
          <div className="mt-4 p-4 bg-yellow-100 rounded">
            <p className="text-sm text-yellow-800 font-medium mb-2">Raw data received:</p>
            <pre className="text-xs bg-white p-2 rounded overflow-auto max-h-40">
              {JSON.stringify(isqs, null, 2)}
            </pre>
          </div>
        </div>
        
        <div className="mt-8 p-6 bg-blue-50 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">Suggestions:</h3>
          <ul className="list-disc pl-5 text-blue-700 space-y-2">
            <li>Try different product URLs with clearer specifications</li>
            <li>Ensure URLs are from e-commerce sites with product details</li>
            <li>Check if the websites are accessible and not blocked</li>
            <li>Try popular e-commerce sites like Amazon, Flipkart, etc.</li>
          </ul>
        </div>
      </div>
    );
  }

  // Calculate statistics
  const totalOptions = cleanISQs.config.options.length + 
                      cleanISQs.keys.reduce((sum, key) => sum + key.options.length, 0);
  const hasConfig = cleanISQs.config.options.length > 0;
  const hasKeys = cleanISQs.keys.length > 0;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Stage 2: ISQ Extraction Complete</h2>
          <p className="text-gray-600">
            Extracted {totalOptions} options across {1 + cleanISQs.keys.length} specifications
          </p>
        </div>
        <button
          onClick={onDownloadExcel}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Download Excel
        </button>
      </div>

      {/* Data Quality Indicator */}
      <div className="mb-8 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-3 h-3 rounded-full ${hasConfig ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
            <span className="text-sm font-medium">
              Config ISQ: {hasConfig ? `${cleanISQs.config.options.length} options found` : 'No valid options'}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className={`w-3 h-3 rounded-full ${hasKeys ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
            <span className="text-sm font-medium">
              Key ISQs: {cleanISQs.keys.length} valid specifications
            </span>
          </div>
        </div>
      </div>

      {/* Config ISQ - Only show if has options */}
      {hasConfig && (
        <div className="mb-8">
          <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-bold text-red-900">Config ISQ</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Influences pricing and primary product variation • {cleanISQs.config.options.length} options
                </p>
              </div>
              <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                Most Important
              </span>
            </div>
            <div className="mb-4">
              <p className="font-semibold text-lg text-gray-900">{cleanISQs.config.name}</p>
            </div>
            {cleanISQs.config.options.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {cleanISQs.config.options.map((option, idx) => (
                  <span 
                    key={idx} 
                    className="bg-red-200 text-red-800 px-4 py-2 rounded-full font-medium hover:bg-red-300 transition-colors"
                    title={option}
                  >
                    {option.length > 30 ? `${option.substring(0, 30)}...` : option}
                  </span>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-red-100 rounded">
                <p className="text-red-700">No valid options extracted for this specification.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Key ISQs - Only show if has keys */}
      {hasKeys && (
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Key ISQs ({cleanISQs.keys.length})</h2>
            <span className="text-sm text-gray-500">
              Other important specifications
            </span>
          </div>
          
          {cleanISQs.keys.length === 0 ? (
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-lg">
              <p className="text-yellow-700">No key specifications were extracted from the URLs.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {cleanISQs.keys.map((isq, idx) => (
                <div key={idx} className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-lg hover:bg-blue-100 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-semibold text-lg text-gray-900">
                        {idx + 1}. {isq.name}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {isq.options.length} options available
                      </p>
                    </div>
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                      Key #{idx + 1}
                    </span>
                  </div>
                  
                  {isq.options.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {isq.options.map((option, oIdx) => (
                        <span 
                          key={oIdx} 
                          className="bg-blue-200 text-blue-800 px-3 py-1 rounded-full text-sm hover:bg-blue-300 transition-colors"
                          title={option}
                        >
                          {option.length > 25 ? `${option.substring(0, 25)}...` : option}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 bg-blue-100 rounded">
                      <p className="text-blue-700 text-sm">No valid options extracted for this specification.</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Data Summary */}
      <div className="mt-8 p-6 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Extraction Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="text-2xl font-bold text-gray-900">{cleanISQs.config.options.length}</div>
            <div className="text-sm text-gray-600">Config ISQ Options</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="text-2xl font-bold text-gray-900">{cleanISQs.keys.length}</div>
            <div className="text-sm text-gray-600">Key Specifications</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="text-2xl font-bold text-gray-900">{totalOptions}</div>
            <div className="text-sm text-gray-600">Total Options Extracted</div>
          </div>
        </div>
        
        {/* Raw Data Preview (for debugging) */}
        <details className="mt-6">
          <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
            View Raw Data
          </summary>
          <div className="mt-2 p-4 bg-white rounded border">
            <pre className="text-xs overflow-auto max-h-60">
              {JSON.stringify({ config: cleanISQs.config, keys: cleanISQs.keys }, null, 2)}
            </pre>
          </div>
        </details>
      </div>
    </div>
  );
}