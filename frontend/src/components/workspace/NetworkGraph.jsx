import React, { useRef, useCallback } from 'react';
// import { ForceGraph2D } from 'react-force-graph-2d';
import ForceGraph2D from 'react-force-graph-2d';
import { Share2, ZoomIn, ZoomOut, Maximize } from 'lucide-react';

// Mock data that would come from the /api/graph-analysis/<person_id> endpoint
const mockGraphData = {
  nodes: [
    { id: 'PER-001', name: 'Arjun Verma', type: 'Person', risk: 'High' },
    { id: 'ACC-1234', name: 'CNB Account', type: 'Account' },
    { id: 'ACC-5678', name: 'DTB Account', type: 'Account' },
    { id: 'COM-001', name: 'Zenith Global Exports', type: 'Company', risk: 'High' },
    { id: 'PER-002', name: 'Riya Singh', type: 'Person' },
    { id: 'ACC-9101', name: 'Riya\'s Account', type: 'Account' },
    { id: 'PER-003', name: 'Anonymous Depositor', type: 'Person', risk: 'Medium' },
  ],
  links: [
    { source: 'PER-001', target: 'ACC-1234', label: 'Owns' },
    { source: 'PER-001', target: 'ACC-5678', label: 'Owns' },
    { source: 'PER-003', target: 'ACC-1234', value: 48000, label: '₹48k Deposit' },
    { source: 'PER-003', target: 'ACC-1234', value: 45000, label: '₹45k Deposit' },
    { source: 'ACC-5678', target: 'COM-001', value: 800000, label: '₹800k Transfer' },
    { source: 'COM-001', target: 'ACC-9101', value: 750000, label: '₹750k Payout' },
    { source: 'PER-002', target: 'ACC-9101', label: 'Owns' },
  ],
};

const getNodeColor = (node) => {
    if (node.id === 'PER-001') return '#00AEEF'; // Highlight main subject
    switch (node.risk) {
        case 'High': return '#ef4444';
        case 'Medium': return '#f97316';
        default: break;
    }
    switch (node.type) {
        case 'Person': return '#a855f7';
        case 'Company': return '#ec4899';
        case 'Account': return '#84cc16';
        default: return '#6b7280';
    }
};

const NetworkGraph = ({ graphData = mockGraphData }) => {
  const fgRef = useRef();

  const handleZoomIn = () => fgRef.current.zoom(fgRef.current.zoom() * 1.2, 500);
  const handleZoomOut = () => fgRef.current.zoom(fgRef.current.zoom() * 0.8, 500);
  const handleFit = () => fgRef.current.zoomToFit(500, 100);

  const nodeCanvasObject = useCallback((node, ctx, globalScale) => {
    const label = node.name;
    const fontSize = 14 / globalScale;
    ctx.font = `${fontSize}px Sans-Serif`;
    const textWidth = ctx.measureText(label).width;
    const r = Math.sqrt(Math.max(0, node.val || 1)) * 6 / globalScale + 4;

    // Node circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
    ctx.fillStyle = getNodeColor(node);
    ctx.fill();

    // Node label
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillText(label, node.x, node.y + r + 8 / globalScale);
  }, []);

  return (
    <div className="w-full h-[700px] bg-gray-900/70 backdrop-blur-xl border border-cyan-500/20 rounded-lg shadow-2xl shadow-cyan-900/30 p-2 animate-fadeIn mt-6 relative">
      <div className="flex items-center justify-between p-4 absolute top-0 left-0 right-0 z-10">
        <div className="flex items-center">
            <Share2 className="h-6 w-6 text-cyan-300 mr-3" />
            <h2 className="text-xl font-bold text-cyan-300">Financial Network Graph</h2>
        </div>
        <div className="flex items-center space-x-2 p-1 bg-gray-800/70 rounded-md">
            <button onClick={handleZoomIn} className="p-2 text-gray-300 hover:bg-gray-700/50 rounded"><ZoomIn size={18}/></button>
            <button onClick={handleZoomOut} className="p-2 text-gray-300 hover:bg-gray-700/50 rounded"><ZoomOut size={18}/></button>
            <button onClick={handleFit} className="p-2 text-gray-300 hover:bg-gray-700/50 rounded"><Maximize size={18}/></button>
        </div>
      </div>
      
      <ForceGraph2D
        ref={fgRef}
        graphData={graphData}
        nodeLabel="name"
        nodeCanvasObject={nodeCanvasObject}
        nodePointerAreaPaint={(node, color, ctx) => {
          ctx.fillStyle = color;
          const r = Math.sqrt(Math.max(0, node.val || 1)) * 6 + 6;
          ctx.fillRect(node.x - r, node.y - r, 2 * r, 2 * r); 
        }}
        linkColor={() => 'rgba(255,255,255,0.2)'}
        linkWidth={1}
        linkDirectionalParticles={2}
        linkDirectionalParticleWidth={2}
        linkDirectionalParticleColor={(link) => link.source.id === 'PER-001' ? '#00AEEF' : '#ef4444'}
        backgroundColor="rgba(0,0,0,0)"
        cooldownTicks={100}
        onEngineStop={() => fgRef.current.zoomToFit(500, 100)}
      />
    </div>
  );
};

export default NetworkGraph;
