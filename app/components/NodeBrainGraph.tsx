'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function NodeBrainGraph() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLegend, setShowLegend] = useState(false);

  useEffect(() => {
    if (iframeRef.current) {
      const iframe = iframeRef.current;
      
      // Load the HTML file
      fetch('/node_brain_graph.html')
        .then(response => {
          if (!response.ok) {
            throw new Error(`Failed to load: ${response.statusText}`);
          }
          return response.text();
        })
        .then(html => {
          if (iframe.contentDocument) {
            // Modify HTML to make it mobile-friendly and show all edges, hide Plotly legend
            const styles = `
              <style>
                body{margin:0;padding:0;overflow:hidden;} 
                .plotly-graph-div{width:100%!important;height:100%!important;max-width:100%!important;}
                
                /* Completely hide Plotly legend */
                .js-plotly-plot .legend,
                .plotly .legend,
                [class*="legend"] {
                  display: none !important;
                  visibility: hidden !important;
                }
              </style>
            `;
            
            let modifiedHtml = html
              // Make all edges visible by default
              .replace(/"visible":"legendonly"/g, '"visible":true')
              // Make responsive sizing for the plotly div
              .replace(/style="height:900px; width:1200px;"/g, 'style="height:100%; width:100%; min-height:400px; max-width:100%;"')
              .replace(/"width":1200,"height":900/g, '"width":undefined,"height":undefined')
              // Hide Plotly legend completely
              .replace(/"showlegend":true/g, '"showlegend":false')
              // Add responsive meta tag and styles
              .replace(/<head>/, `<head><meta name="viewport" content="width=device-width, initial-scale=1.0">${styles}`);
            
            iframe.contentDocument.open();
            iframe.contentDocument.write(modifiedHtml);
            iframe.contentDocument.close();
            
            // Wait for Plotly to load, then make all edges visible and responsive
            setTimeout(() => {
              try {
                const iframeWindow = iframe.contentWindow;
                const plotlyDiv = iframe.contentDocument?.getElementById('e5403982-4779-44fc-ba77-ba4e49f922ce');
                if (plotlyDiv && iframeWindow && (iframeWindow as any).Plotly) {
                  // Make all edges visible
                  const Plotly = (iframeWindow as any).Plotly;
                  const plotlyElement = plotlyDiv as any; // Plotly adds data property to the element
                  const currentData = plotlyElement.data || [];
                  
                  // Update visibility for all traces
                  currentData.forEach((trace: any, index: number) => {
                    if (trace.visible === 'legendonly' || trace.visible === false) {
                      Plotly.restyle(plotlyDiv, { visible: true }, index);
                    }
                  });
                  
                  // Make layout responsive and hide legend
                  Plotly.relayout(plotlyDiv, {
                    width: undefined,
                    height: undefined,
                    autosize: true,
                    'legend.showlegend': false
                  });
                }
              } catch (e) {
                console.log('Could not update Plotly visibility:', e);
              }
            }, 1500);
            
            setIsLoading(false);
          } else {
            setError('Unable to load iframe content');
            setIsLoading(false);
          }
        })
        .catch(error => {
          console.error('Failed to load visualization:', error);
          setError('Failed to load visualization. Please refresh the page.');
          setIsLoading(false);
        });
    }
  }, []);

  return (
    <div className="w-full rounded-lg border bg-card overflow-hidden shadow-sm">
      <div className="p-3 sm:p-4 border-b bg-muted/30">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <h3 className="text-base sm:text-lg font-semibold mb-1">Knowledge Graph Visualization</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Interactive 3D visualization of your task knowledge structure.
            </p>
          </div>
          <button
            onClick={() => setShowLegend(!showLegend)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs sm:text-sm font-medium bg-background hover:bg-muted border border-border rounded-md transition-colors whitespace-nowrap"
          >
            {showLegend ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Hide Legend
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Show Legend
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* Custom Legend */}
      {showLegend && (
        <div className="border-b bg-muted/20 p-4 max-h-[300px] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-semibold mb-2">Edge Types</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-8 h-0.5 bg-gray-500"></div>
                  <span>Sequence Edges</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-8 h-1 bg-orange-500"></div>
                  <span>Depends On Edges</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-8 h-0.5 bg-purple-500"></div>
                  <span>Similar To Edges</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-8 h-1 bg-red-500"></div>
                  <span>Cluster Edges</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-2">Node Types</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-red-700"></div>
                  <span>Hub Nodes</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-full bg-blue-500 border border-blue-700"></div>
                  <span>Regular Nodes</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="relative w-full bg-background h-[400px] sm:h-[500px] lg:h-[600px]">
        {isLoading && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/30 z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading visualization...</p>
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/30 z-10">
            <div className="text-center p-4">
              <p className="text-sm text-destructive mb-2">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  setIsLoading(true);
                  window.location.reload();
                }}
                className="text-sm text-primary hover:underline"
              >
                Refresh page
              </button>
            </div>
          </div>
        )}
        <iframe
          ref={iframeRef}
          className="w-full h-full border-0"
          style={{ 
            minHeight: '400px',
            display: isLoading || error ? 'none' : 'block',
            backgroundColor: 'transparent'
          }}
          title="Node Brain Graph Visualization"
          allowFullScreen
        />
      </div>
    </div>
  );
}

