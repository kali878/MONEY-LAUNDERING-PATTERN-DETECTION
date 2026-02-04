import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
// API base is resolved by centralized api services
import { updateCaseNotes } from "../services/api.js";
import Header from "../components/common/Header";
import Sidebar from "../components/common/Sidebar";
import Loader from "../components/common/Loader";
import ErrorBanner from "../components/common/ErrorBanner.jsx";
import LoadingOverlay from "../components/common/LoadingOverlay.jsx";
import useFetchData from "../hooks/useFetchData";
import {
  Files,
  User,
  BrainCircuit,
  Users,
  StickyNote,
  HelpCircle,
  Maximize2,
  Minimize2,
  Filter,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  MarkerType,
  useNodesState,
  useEdgesState,
} from "reactflow";
import "reactflow/dist/style.css";

// --- Enhanced Network Graph with Advanced Features ---
const NetworkGraph = ({ personId }) => {
  // Fetch more data to make filters more effective
  const { data: graphData, loading, error } = useFetchData(`/graph/${personId}?limit=100`);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState(null);

  // State for advanced filters
  const [filterAmount, setFilterAmount] = useState(0);
  const [direction, setDirection] = useState("all"); // 'all', 'outgoing', 'incoming'
  const [visibleTypes, setVisibleTypes] = useState(["Person", "Company"]);

  // Memoized transforms for performance
  const filteredEdges = useMemo(() => {
    if (!graphData?.edges) return [];
    return graphData.edges.filter((edge) => {
      const amount = parseInt(edge.label.replace(/[^0-9]/g, "")) || 0;
      if (amount < filterAmount) return false;
      if (direction === "outgoing" && !edge.isOutgoing) return false;
      if (direction === "incoming" && edge.isOutgoing) return false;
      return true;
    });
  }, [graphData, filterAmount, direction]);

  const centerNode = useMemo(() => {
    if (!graphData?.nodes || graphData.nodes.length === 0) return null;
    const c = graphData.nodes.find((n) => n.isCenter);
    return c || { ...graphData.nodes[0], isCenter: true };
  }, [graphData]);

  const filteredNodes = useMemo(() => {
    if (!graphData?.nodes || !centerNode) return [];
    const connectedIds = new Set();
    filteredEdges.forEach((e) => {
      connectedIds.add(e.source);
      connectedIds.add(e.target);
    });
    connectedIds.add(centerNode.id);
    const candidateNodes = graphData.nodes.filter((n) => connectedIds.has(n.id));
    return candidateNodes.filter((n) => n.id === centerNode.id || visibleTypes.includes(n.type));
  }, [graphData, filteredEdges, visibleTypes, centerNode]);

  const formattedNodes = useMemo(() => {
    if (!centerNode) return [];
    const peers = filteredNodes.filter((n) => n.id !== centerNode.id);
    const centerPos = { x: 0, y: 0 };
    const radius = 350;
    return [
      {
        id: centerNode.id,
        position: centerPos,
        data: { label: centerNode.label, type: centerNode.type },
        style: {
          background:
            centerNode.type === "Person"
              ? "linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)"
              : "linear-gradient(135deg, #be185d 0%, #db2777 100%)",
          color: "white",
          border: "4px solid #facc15",
          borderRadius: "50%",
          width: 140,
          height: 140,
          fontSize: "13px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "8px",
          boxShadow: "0 0 50px rgba(250, 204, 21, 0.55)",
          animation: "pulse 3s infinite",
          cursor: "pointer",
        },
      },
      ...peers.map((node, i) => {
        const angle = (i / (peers.length || 1)) * 2 * Math.PI;
        return {
          id: node.id,
          position: {
            x: centerPos.x + radius * Math.cos(angle),
            y: centerPos.y + radius * Math.sin(angle),
          },
          data: { label: node.label, type: node.type },
          style: {
            background:
              node.type === "Person"
                ? "linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)"
                : "linear-gradient(135deg, #be185d 0%, #db2777 100%)",
            color: "white",
            border: "2px solid rgba(255,255,255,0.35)",
            borderRadius: "50%",
            width: 90,
            height: 90,
            fontSize: "11px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "6px",
            boxShadow: "0 8px 18px rgba(0,0,0,0.45)",
            transition: "transform 0.2s ease-in-out",
            cursor: "pointer",
          },
        };
      }),
    ];
  }, [filteredNodes, centerNode]);

  const formattedEdges = useMemo(() => {
    return filteredEdges.map((edge, i) => ({
      id: `e${i}`,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      type: "smoothstep",
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: edge.isOutgoing ? "#10b981" : "#ef4444",
        width: 18,
        height: 18,
      },
      style: {
        stroke: edge.isOutgoing ? "#10b981" : "#ef4444",
        strokeWidth: 2.5,
        opacity: 0.9,
      },
      labelStyle: { fill: "white", fontWeight: "600" },
      labelBgStyle: {
        fill: "#1f2937",
        padding: "3px 6px",
        borderRadius: "4px",
      },
    }));
  }, [filteredEdges]);

  useEffect(() => {
    if (!graphData) return;
    setNodes(formattedNodes);
    setEdges(formattedEdges);
  }, [graphData, formattedNodes, formattedEdges, setNodes, setEdges]);

  const onNodeClick = useCallback((event, node) => setSelectedNode(node), []);

  if (loading)
    return (
      <div className="h-full flex items-center justify-center">
        <Loader />
      </div>
    );
  if (error)
    return (
      <div className="p-4"><ErrorBanner message={`Error loading graph: ${error.message}`} /></div>
    );

  return (
    <div className="h-full w-full relative">
      <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }`}</style>

      {/* --- NEW: Advanced Filter Panel --- */}
      <div className="absolute top-4 left-4 z-10 bg-gray-800/90 backdrop-blur-sm rounded-lg p-4 border border-gray-600 w-64 animate-fadeIn">
        <h4 className="text-sm font-semibold mb-3 text-gray-200 flex items-center">
          <Filter className="h-4 w-4 mr-2" />
          Graph Filters
        </h4>
        <div className="space-y-4">
          <div className="text-xs">
            <label className="block mb-1 text-gray-400">
              Min. Transaction (₹{filterAmount.toLocaleString("en-IN")})
            </label>
            <input
              type="range"
              min="0"
              max="100000"
              step="5000"
              value={filterAmount}
              onChange={(e) => setFilterAmount(Number(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>
          <div className="text-xs">
            <label className="block mb-2 text-gray-400">
              Transaction Direction
            </label>
            <div className="flex bg-gray-900/50 p-1 rounded-md">
              <FilterButton
                active={direction === "all"}
                onClick={() => setDirection("all")}
              >
                All
              </FilterButton>
              <FilterButton
                active={direction === "outgoing"}
                onClick={() => setDirection("outgoing")}
              >
                <ArrowRight className="h-3 w-3 mr-1" />
                Out
              </FilterButton>
              <FilterButton
                active={direction === "incoming"}
                onClick={() => setDirection("incoming")}
              >
                <ArrowLeft className="h-3 w-3 mr-1" />
                In
              </FilterButton>
            </div>
          </div>
          <div className="flex space-x-4 text-xs">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={visibleTypes.includes("Person")}
                onChange={() =>
                  setVisibleTypes((p) =>
                    p.includes("Person")
                      ? p.filter((t) => t !== "Person")
                      : [...p, "Person"]
                  )
                }
                className="form-checkbox h-4 w-4 bg-gray-700 border-gray-600 text-cyan-600 focus:ring-cyan-500 rounded"
              />
              <span className="text-gray-300">Persons</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={visibleTypes.includes("Company")}
                onChange={() =>
                  setVisibleTypes((p) =>
                    p.includes("Company")
                      ? p.filter((t) => t !== "Company")
                      : [...p, "Company"]
                  )
                }
                className="form-checkbox h-4 w-4 bg-gray-700 border-gray-600 text-pink-600 focus:ring-pink-500 rounded"
              />
              <span className="text-gray-300">Companies</span>
            </label>
          </div>
        </div>
      </div>

      {/* Node Details Overlay */}
      {selectedNode && (
        <div className="absolute top-4 right-4 z-10 bg-gray-800/90 backdrop-blur-sm rounded-lg p-4 border border-gray-600 w-64 animate-fadeIn">
          <h4 className="font-bold text-white mb-2">
            {selectedNode.data.label}
          </h4>
          <div className="text-sm text-gray-300 space-y-1">
            <p>
              <strong>Type:</strong> {selectedNode.data.type}
            </p>
            <p>
              <strong>ID:</strong> {selectedNode.id}
            </p>
          </div>
          <button
            onClick={() => setSelectedNode(null)}
            className="mt-3 text-xs w-full bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded text-white transition"
          >
            Close
          </button>
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={{ padding: 0.25 }}
      >
        <MiniMap
          style={{ backgroundColor: "#111827" }}
          nodeColor={(n) => n.style.background}
        />
        <Controls />
        <Background color="#4b5563" gap={24} size={2} />
      </ReactFlow>
    </div>
  );
};

const FilterButton = ({ active, children, ...props }) => (
  <button
    {...props}
    className={`flex-1 flex items-center justify-center text-center px-2 py-1 rounded-sm text-xs transition ${
      active
        ? "bg-cyan-600 text-white font-bold"
        : "hover:bg-gray-700 text-gray-300"
    }`}
  >
    {children}
  </button>
);

// --- Main Workspace Component with Fullscreen Toggle ---
const InvestigationWorkspace = () => {
  const { caseId } = useParams();
  const {
    data: caseData,
    loading,
    error,
  } = useFetchData(
    caseId && !caseId.includes("-placeholder") ? `/cases/${caseId}` : null
  );
  const { data: notesData, refetch: refetchNotes } = useFetchData(
    caseId && !caseId.includes("-placeholder") ? `/cases/${caseId}/notes` : null
  );
  const [isGraphFullscreen, setIsGraphFullscreen] = useState(false);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesStatus, setNotesStatus] = useState(null); // {type, message}
  // API base available if needed, but requests use centralized api.js helpers

  useEffect(() => {
    if (notesData && typeof notesData.notes === "string") {
  setNotes(notesData.notes);
    }
  }, [notesData, caseId]);

  const handleSaveNotes = async () => {
    if (!caseId) return;
    setSavingNotes(true);
    setNotesStatus(null);
    try {
  await updateCaseNotes(caseId, notes);
      setNotesStatus({ type: "success", message: "Notes saved" });
      refetchNotes();
    } catch (e) {
      setNotesStatus({ type: "error", message: e.message });
    } finally {
      setSavingNotes(false);
      setTimeout(() => setNotesStatus(null), 3000);
    }
  };

  if (!caseId || caseId.includes("-placeholder")) {
    return (
      <div className="flex h-screen bg-gray-900 text-white font-sans">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 flex items-center justify-center text-center p-6">
            <div>
              <HelpCircle className="h-24 w-24 text-cyan-500 mx-auto mb-6" />
              <h1 className="text-4xl font-bold text-gray-100 mb-2">
                No Case Selected
              </h1>
              <p className="text-lg text-gray-400 mb-6">
                Please select an alert from the dashboard to begin an
                investigation.
              </p>
              <Link
                to="/dashboard"
                className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-6 rounded-lg transition"
              >
                Return to Dashboard
              </Link>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (loading) return <Loader />;
  if (error)
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <div className="w-full max-w-xl px-6"><ErrorBanner message={`Failed to load case data: ${error.message}`} /></div>
      </div>
    );

  const personDetails = caseData?.risk_profile?.person_details;
  const riskProfile = caseData?.risk_profile;
  const aiSummary = caseData?.ai_summary;

  return (
    <div className="flex h-screen bg-gray-900 text-white font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-900/50 p-6 pt-24">
          <div className="max-w-full mx-auto px-4">
            <div className="mb-6 flex items-center justify-between animate-fadeIn">
              <div className="flex items-center space-x-3">
                <div className="bg-purple-500/20 p-2 rounded-lg">
                  <Files className="h-8 w-8 text-purple-400" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-100">
                    Investigation Workspace
                  </h1>
                  <p className="text-gray-400">Case ID: {caseId}</p>
                </div>
              </div>
              <button
                onClick={() => setIsGraphFullscreen(!isGraphFullscreen)}
                className="bg-gray-700/50 hover:bg-gray-600 p-2 rounded-lg transition"
                title="Toggle Graph Fullscreen"
                aria-label="Toggle graph fullscreen"
              >
                {isGraphFullscreen ? (
                  <Minimize2 className="h-5 w-5" />
                ) : (
                  <Maximize2 className="h-5 w-5" />
                )}
              </button>
            </div>

            <div
              className={`flex flex-col xl:flex-row gap-6 ${
                isGraphFullscreen
                  ? "h-[calc(100vh-10rem)]"
                  : "h-[calc(100vh-12rem)]"
              }`}
            >
              {!isGraphFullscreen && (
                <div className="xl:w-1/3 flex flex-col gap-6 overflow-y-auto pr-2">
                  <InfoPanel title="AI Summary & Risk" icon={BrainCircuit}>
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-semibold text-gray-300">
                        Overall Risk Score
                      </span>
                      <span className="bg-red-500/20 text-red-300 text-xl font-bold rounded-full h-12 w-12 flex items-center justify-center border-2 border-red-400">
                        {riskProfile?.final_risk_score}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm">{aiSummary}</p>
                  </InfoPanel>
                  <InfoPanel title="Subject Details" icon={User}>
                    <div className="space-y-3 text-sm">
                      <DetailRow
                        label="Name"
                        value={personDetails?.full_name}
                      />
                      <DetailRow
                        label="PAN"
                        value={personDetails?.pan_number}
                      />
                      <DetailRow
                        label="Salary"
                        value={
                          personDetails?.monthly_salary_inr
                            ? `₹${personDetails.monthly_salary_inr.toLocaleString(
                                "en-IN"
                              )} /mo`
                            : "N/A"
                        }
                      />
                      <DetailRow
                        label="Address"
                        value={personDetails?.address}
                      />
                    </div>
                  </InfoPanel>
                  <InfoPanel title="Investigator Notes" icon={StickyNote}>
                    <div className="relative">
                    {savingNotes && (
                      <LoadingOverlay overlay message="Saving notes..." />
                    )}
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full h-48 bg-gray-900/70 border border-gray-600 rounded-lg p-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:outline-none transition"
                      placeholder="Add your observations..."
                    />
                    <div className="mt-3 flex items-center gap-3">
                      <button
                        onClick={handleSaveNotes}
                        disabled={savingNotes}
                        className="flex-1 bg-purple-600/60 hover:bg-purple-600 disabled:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition"
                      >
                        {savingNotes ? "Saving..." : "Save Notes"}
                      </button>
                      {notesStatus?.type === 'error' && (
                        <div className="flex-1"><ErrorBanner message={notesStatus.message} /></div>
                      )}
                      {notesData?.source && (
                        <span className="text-[10px] text-gray-500 italic">
                          source: {notesData.source}
                        </span>
                      )}
                    </div>
                    {notesStatus?.type === 'success' && (
                      <div className="mt-3"><ErrorBanner message={notesStatus.message} variant="success" /></div>
                    )}
                    </div>
                  </InfoPanel>
                </div>
              )}
              <div
                className={`flex-1 h-full min-h-[500px] ${
                  isGraphFullscreen ? "xl:w-full" : "xl:w-2/3"
                }`}
              >
                <InfoPanel title="Transaction Network" icon={Users} fullHeight>
                  <NetworkGraph personId={caseId} />
                </InfoPanel>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
const InfoPanel = ({ title, icon: Icon, children, fullHeight = false }) => (
  <div
    className={`bg-gray-800/50 rounded-xl border border-gray-700 ${
      fullHeight ? "flex flex-col h-full" : ""
    }`}
  >
    <div className="flex items-center space-x-3 p-4 border-b border-gray-700">
      <Icon className="h-6 w-6 text-purple-400" />
      <h2 className="text-lg font-bold">{title}</h2>
    </div>
    <div className={`p-4 ${fullHeight ? "flex-1" : ""}`}>{children}</div>
  </div>
);
const DetailRow = ({ label, value }) => (
  <div className="flex justify-between border-b border-gray-700/50 py-1">
    <strong className="text-gray-400 font-medium">{label}:</strong>
    <span className="text-right text-gray-200">{value}</span>
  </div>
);
export default InvestigationWorkspace;
