// FSM Editor with Right-Click Delete Menu for Nodes (WASM-integrated)

import React, { useCallback, useState, useRef } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  addEdge,
  useNodesState,
  useEdgesState,
  MarkerType,
  ConnectionLineType
} from 'reactflow';
import 'reactflow/dist/style.css';
import { v4 as uuidv4 } from 'uuid';
import init, {parse_dbc_text } from './pkg/dbc_parser';

const initialNodes = [
  {
    id: 'start',
    type: 'editableNode',
    position: { x: 100, y: 100 },
    data: { label: 'Start', onUpdateLabel: () => {} },
    sourcePosition: 'right',
    targetPosition: 'left'
  }
];

const initialEdges = [];

import { Handle, Position } from 'reactflow';

function EditableNode({ id, data, selected }) {
  const [value, setValue] = useState(data.label);

  const handleChange = (e) => {
    setValue(e.target.value);
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    const confirmDelete = window.confirm('Delete this state?');
    if (confirmDelete) {
      data.onDelete(id);
    }
  };

  return (
    <div
      onContextMenu={handleContextMenu}
      className="react-flow__node-default"
      style={{ border: selected ? '2px solid #007bff' : '1px solid #ddd', padding: 4, borderRadius: 4, background: '#fff', position: 'relative' }}
    >
      <input
        style={{ width: '100px', border: 'none', background: 'transparent' }}
        value={value}
        onChange={handleChange}
        onBlur={() => data.onUpdateLabel(id, value)}
      />
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
function CommentNode({ id, data, selected }) {
  const [value, setValue] = useState(data.text || '');

  const handleChange = (e) => {
    setValue(e.target.value);
  };

  const handleBlur = () => {
    data.onUpdateComment(id, value);
  };
  const handleContextMenu = (e) => {
    e.preventDefault();
    const confirmDelete = window.confirm('Delete this comment?');
    if (confirmDelete) {
      data.onDelete(id);
    }
  };
  return (
    <div
      onContextMenu={handleContextMenu}
      className="react-flow__node-default"
      style={{
        padding: 8,
        border: selected ? '2px solid #007bff' : '1px dashed #bbb',
        background: '#f5f5f5',
        borderRadius: 6,
        minWidth: 150
      }}
    >
      <textarea
        style={{
          width: '100%',
          height: '60px',
          border: 'none',
          background: 'transparent',
          resize: 'none'
        }}
        placeholder="Write comment..."
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
      />
    </div>
  );
}

function ConditionNode({ id, data , selected}) {

  const borderStyle = selected ? '3px solid #007bff' : '2px dashed #5cb85c';

  const handleContextMenu = (e) => {
    e.preventDefault();
    if (window.confirm('Delete this condition node?')) {
      data.onDelete(id);
    }
  };

  const updateCondition = (index, field, value) => {
    data.onUpdateCondition(id, index, field, value);
  };

  const updateLogicType = (newLogic) => {
    data.onUpdateLogicType(id, newLogic);
  };

  return (
    <div
      onContextMenu={handleContextMenu}
      style={{ padding: 6, border: selected ? '3px solid #007bff' : '2px dashed #f0ad4e', background: '#fff3cd', borderRadius: 6, fontSize: '0.8em' }}
    >
      <strong>Condition Block</strong>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />

      <div style={{ marginTop: 5 }}>
        <label style={{ fontSize: '0.75em' }}>Logic:</label>
        <select
          value={data.logicType || 'all'}
          onChange={(e) => updateLogicType(e.target.value)}
          style={{ fontSize: '0.75em', marginLeft: 5 }}
        >
          <option value="all">ALL (AND)</option>
          <option value="any">ANY (OR)</option>
        </select>
      </div>

      {data.conditions && data.conditions.length > 0 && (
        <ul style={{ marginTop: 5, paddingLeft: 10 }}>
          {data.conditions.map((cond, idx) => (
            <li key={idx} style={{ marginBottom: 4 }}>
              <input
                style={{ width: '60%', fontSize: '0.75em' }}
                value={cond.key}
                onChange={(e) => updateCondition(idx, 'key', e.target.value)}
                placeholder="Signal"
              />
              <select
                style={{ fontSize: '0.75em', marginLeft: 4 }}
                value={cond.op}
                onChange={(e) => updateCondition(idx, 'op', e.target.value)}
              >
                <option value="eq">==</option>
                <option value="ne">!=</option>
                <option value="gt">&gt;</option>
                <option value="lt">&lt;</option>
                <option value="in">in</option>
                <option value="ge">&gt;=</option>
                <option value="le">&lt;=</option>
              </select>
              {cond.op === 'in' ? (
              <input
                style={{ width: '30%', fontSize: '0.75em', marginLeft: 4 }}
                type="text"
                value={cond.value}
                onChange={(e) => updateCondition(idx, 'value', e.target.value)}
                placeholder="Comma separated values"
              />
            ) : (
              <input
                style={{ width: '20%', fontSize: '0.75em', marginLeft: 4 }}
                type="number"
                value={cond.value}
                onChange={(e) => updateCondition(idx, 'value', e.target.value)}
                placeholder="Value"
              />
            )}

            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ActionNode({ id, data , selected}) {
  const handleContextMenu = (e) => {
    e.preventDefault();
    if (window.confirm('Delete this action node?')) {
      data.onDelete(id);
    }
  };

  const updateAction = (index, field, value) => {
    data.onUpdateAction(id, index, field, value);
  };

  return (
    <div
      onContextMenu={handleContextMenu}
      style={{ padding: 6, border: selected ? '3px solid #007bff' : '2px dashed #5cb85c', background: '#dff0d8', borderRadius: 6, fontSize: '0.8em' }}
    >
      <strong>Action Block</strong>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />

      {data.actions && data.actions.length > 0 && (
        <ul style={{ marginTop: 5, paddingLeft: 10 }}>
          {data.actions.map((act, idx) => (
            <li key={idx} style={{ marginBottom: 4 }}>
              <input
                style={{ width: '60%', fontSize: '0.75em' }}
                value={act.signal}
                onChange={(e) => updateAction(idx, 'signal', e.target.value)}
                placeholder="Signal"
              />
              <input
                style={{ width: '20%', fontSize: '0.75em', marginLeft: 4 }}
                type="number"
                value={act.value}
                onChange={(e) => updateAction(idx, 'value', e.target.value)}
                placeholder="Value"
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}


const nodeTypes = {
  editableNode: EditableNode,
  conditionNode: ConditionNode,
  actionNode: ActionNode,
  commentNode: CommentNode,
};

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef();
  const dbcInputRef = useRef();
  const [dbcTree, setDbcTree] = useState(null);
  const [selectedSignal, setSelectedSignal] = useState(null); 
  const [isModalOpen, setIsModalOpen] = useState(false);    
  const [activeNodeId, setActiveNodeId] = useState(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [initialStateName, setInitialStateName] = useState('');
  const [isSelectInitialOpen, setIsSelectInitialOpen] = useState(false);




  const updateNodeLabel = (id, newLabel) => {
    setNodes((nds) => nds.map(n => n.id === id ? { ...n, data: { ...n.data, label: newLabel, onUpdateLabel: updateNodeLabel, onDelete: deleteNode } } : n));
  };

  const deleteNode = (id) => {
    setNodes((nds) => nds.filter(n => n.id !== id));
    setEdges((eds) => eds.filter(e => e.source !== id && e.target !== id));
  };

  const onConnect = useCallback((params) => {
    const sourceNode = nodes.find((n) => n.id === params.source);
    const targetNode = nodes.find((n) => n.id === params.target);

    const isValidConnection =
      (sourceNode?.type === 'editableNode' && targetNode?.type === 'conditionNode') ||
      (sourceNode?.type === 'conditionNode' && targetNode?.type === 'actionNode') ||
      (sourceNode?.type === 'actionNode' && targetNode?.type === 'editableNode');

    if (!isValidConnection) {
      alert('Invalid connection! Follow: State → Condition → Action → State');
      return;
    }

    const newEdge = {
      ...params,
      id: uuidv4(),
      label: '',
      markerEnd: {
        type: MarkerType.ArrowClosed
      },
      style: { strokeWidth: 2 },
      type: 'smoothstep'
    };
    setEdges((eds) => addEdge(newEdge, eds));
  }, [setEdges, nodes]);
  const updateCondition = (nodeId, index, field, value) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === nodeId && n.type === 'conditionNode') {
          const newConditions = [...(n.data.conditions || [])];
          newConditions[index][field] = value;
          return {
            ...n,
            data: {
              ...n.data,
              conditions: newConditions,
            }
          };
        }
        return n;
      })
    );
  };
  
  const updateAction = (nodeId, index, field, value) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === nodeId && n.type === 'actionNode') {
          const newActions = [...(n.data.actions || [])];
          newActions[index][field] = value;
          return {
            ...n,
            data: {
              ...n.data,
              actions: newActions,
            }
          };
        }
        return n;
      })
    );
  };
  
  const updateLogicType = (nodeId, newLogic) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === nodeId && n.type === 'conditionNode') {
          return {
            ...n,
            data: {
              ...n.data,
              logicType: newLogic,
            }
          };
        }
        return n;
      })
    );
  };
  const addStateNode = () => {
    const id = uuidv4();
    const label = `State ${nodes.length}`;
    setNodes((nds) => [
      ...nds,
      {
        id,
        type: 'editableNode',
        position: { x: Math.random() * 400, y: Math.random() * 400 },
        data: { label, onUpdateLabel: updateNodeLabel, onDelete: deleteNode },
        sourcePosition: 'right',
        targetPosition: 'left'
      }
    ]);
  };

  const addConditionNode = () => {
    const id = uuidv4();
    setNodes((nds) => [
      ...nds,
      {
        id,
        type: 'conditionNode',
        position: { x: Math.random() * 400, y: Math.random() * 400 },
        data: {},
        sourcePosition: 'right',
        targetPosition: 'left',
        data: {
          conditions: [],
          onDelete: deleteNode,
          onUpdateCondition: updateCondition,
          onUpdateLogicType: updateLogicType,
        }
      }
    ]);
  };

  
  const addActionNode = () => {
    const id = uuidv4();
    setNodes((nds) => [
      ...nds,
      {
        id,
        type: 'actionNode',
        position: { x: Math.random() * 400, y: Math.random() * 400 },
        data: {},
        sourcePosition: 'right',
        targetPosition: 'left',
        data: {
          actions: [],
          onDelete: deleteNode,
          onUpdateAction: updateAction,
        }
        
      }
    ]);
  };
  const addCommentNode = () => {
    const id = uuidv4();
    setNodes((nds) => [
      ...nds,
      {
        id,
        type: 'commentNode',
        position: { x: Math.random() * 400, y: Math.random() * 400 },
        data: { text: '', onUpdateComment: updateCommentText ,  onDelete: deleteNode },
        draggable: true,
        selectable: true
      }
    ]);
  };
  
  const updateCommentText = (id, newText) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, text: newText, onUpdateComment: updateCommentText } } : n))
    );
  };
  
  const saveFSMFinal = () => {

    if (!initialStateName) {
      setIsSelectInitialOpen(true);
      return;
    }

    const stateNodes = nodes.filter(
      (n) => n.type === 'editableNode'
    );
    
    const fsm = {
      initialState: initialStateName || "Unknown",
      states: []
    };
  
    for (const stateNode of stateNodes) {
      const state = {
        name: stateNode.data.label,
        transitions: []
      };
  
      const outgoing = edges.filter(e => e.source === stateNode.id);
  
      for (const edgeToCondition of outgoing) {
        const conditionNode = nodes.find(n => n.id === edgeToCondition.target && n.type === 'conditionNode');
        if (!conditionNode) continue;
  
        const condOutgoing = edges.filter(e => e.source === conditionNode.id);
  
        for (const edgeToAction of condOutgoing) {
          const actionNode = nodes.find(n => n.id === edgeToAction.target && n.type === 'actionNode');
          if (!actionNode) continue;
  
          const actionOutgoing = edges.find(e => e.source === actionNode.id);
          if (!actionOutgoing) continue;
  
          const targetStateNode = nodes.find(n => n.id === actionOutgoing.target && n.type === 'editableNode');
          if (!targetStateNode) continue;
  
          // Build condition part
          let conditionObj = {};
  
          if (conditionNode.data.logicType === "any") {
            conditionObj.any = (conditionNode.data.conditions || []).map(c => {
              if (c.op === 'in') {
                return {
                  key: c.key,
                  in: typeof c.value === 'string'
                    ? c.value.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v))
                    : Array.isArray(c.value) ? c.value : []
                };
              } else {
                return {
                  key: c.key,
                  [c.op]: parseFloat(c.value)
                };
              }
            });
          } else {
            conditionObj.all = (conditionNode.data.conditions || []).map(c => {
              if (c.op === 'in') {
                return {
                  key: c.key,
                  in: typeof c.value === 'string'
                    ? c.value.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v))
                    : Array.isArray(c.value) ? c.value : []
                };
              } else {
                return {
                  key: c.key,
                  [c.op]: parseFloat(c.value)
                };
              }
            });
          }
          
  
          // Build action part
          const actionsArray = (actionNode.data.actions || []).map(a => ({
            signal: a.signal,
            value: parseFloat(a.value)
          }));
  
          const transition = {
            condition: conditionObj,
            actions: actionsArray,
            nextState: targetStateNode.data.label
          };
  
          state.transitions.push(transition);
        }
      }
  
      fsm.states.push(state);
    }
  
    // Save to file
    const blob = new Blob([JSON.stringify(fsm, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fsm.json';
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const handleSave = () => {
    const fsmData = { nodes, edges };
    const blob = new Blob([JSON.stringify(fsmData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'drawing.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoad = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const json = JSON.parse(e.target.result);
      const enrichedNodes = (json.nodes || []).map(n => ({
        ...n,
        data: { ...n.data, onUpdateLabel: updateNodeLabel, onDelete: deleteNode },
        sourcePosition: 'right',
        targetPosition: 'left'
      }));
      setNodes(enrichedNodes);
      setEdges(json.edges || []);
    };
    reader.readAsText(file);
  };

  const handleDbcLoad = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      await init();
      const parsed = parse_dbc_text(e.target.result);
      const grouped = groupDbcByNode(parsed);
      setDbcTree(grouped);
    };
    reader.readAsText(file);
  };
  const groupDbcByNode = (parsed) => {
    const grouped = {};
  
    parsed.messages.forEach(msg => {
      if (!grouped[msg.node]) {
        grouped[msg.node] = {};
      }
      grouped[msg.node][msg.name] = {
        id: msg.id,
        dlc: msg.dlc,
        pgn: msg.pgn,
        sa: msg.sa,
        priority: msg.priority,
        signals: msg.signals
      };
    });
  
    return grouped;
  };
  

  const onEdgeDoubleClick = (event, edge) => {
    const newLabel = prompt('Edit transition label:', edge.label || '');
    if (newLabel !== null) {
      setEdges((eds) => eds.map(e => e.id === edge.id ? { ...e, label: newLabel } : e));
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <style>{`.react-flow__handle { background: #007bff; width: 8px; height: 8px; border-radius: 50%; }`}</style>
      <div style={{ position: 'absolute', zIndex: 10, top: 10, left: 10 }}>
        <button onClick={addStateNode}>➕ Add State</button>
        <button onClick={addConditionNode}>⚙️ Add Condition</button>
        <button onClick={addActionNode}>🎬 Add Action</button>
        <button onClick={handleSave}>💾 Save JSON</button>
        <button onClick={saveFSMFinal}>📥 Save FSM</button>
        <button onClick={addCommentNode}>💬 Add Comment</button>
        <button onClick={() => fileInputRef.current.click()}>📂 Load JSON</button>
        <button onClick={() => dbcInputRef.current.click()}>📤 Load DBC</button>
        <button onClick={() => setIsHelpOpen(true)}>❔ Help</button>
        <input
          ref={dbcInputRef}
          type="file"
          accept=".dbc"
          style={{ display: 'none' }}
          onChange={handleDbcLoad}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={handleLoad}
        />
      </div>
      {isModalOpen && (
      <SignalPickerModal
        selectedSignal={selectedSignal}
        onClose={() => setIsModalOpen(false)}
        onConfirm={(signal, blockType) => {
          if (!activeNodeId) {
            alert('Please select a Condition or Action block first!');
            setIsModalOpen(false);
            return;
          }
        
          setNodes((nds) => nds.map(node => {
            if (node.id === activeNodeId) {
              if (blockType === 'condition' && node.type === 'conditionNode') {
                const newCondition = { key: signal, op: 'eq', value: 0 }; // default
                return {
                  ...node,
                  data: {
                    ...node.data,
                    conditions: [...(node.data.conditions || []), newCondition]
                  }
                };
              } else if (blockType === 'action' && node.type === 'actionNode') {
                if (!signal.startsWith('Vehicle_Control_Unit.')) {
                  alert('Only Vehicle_Control_Unit signals are allowed in Action block!');
                  return node;
                }
                const newAction = { signal: signal, value: 0 }; // default
                return {
                  ...node,
                  data: {
                    ...node.data,
                    actions: [...(node.data.actions || []), newAction]
                  }
                };
              }
            }
            return node;
          }));
        
          setIsModalOpen(false);
        }}
        
      />
    )}
  {isHelpOpen && (
    <div style={{
      position: 'absolute',
      top: 80,
      left: 50,
      width: '450px',
      background: '#ffffff',
      border: '1px solid #ccc',
      borderRadius: '8px',
      padding: '20px',
      zIndex: 100,
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      maxHeight: '80vh',
      overflowY: 'auto'
    }}>
      <h3>ℹ️ How to Use the FSM Editor</h3>
    
      <h4>🔵 Main Steps:</h4>
      <ol style={{ fontSize: '0.9em', paddingLeft: 20 }}>
        <li>📤 <strong>Load a DBC file</strong> to import available signals.</li>
        <li>➕ <strong>Add State</strong> nodes to represent FSM states.</li>
        <li>⚙️ <strong>Add Condition</strong> nodes and connect State ➔ Condition.</li>
        <li>🎬 <strong>Add Action</strong> nodes and connect Condition ➔ Action.</li>
        <li>➕ <strong>Connect Action back to next State</strong> (Action ➔ State).</li>
        <li>🖱️ <strong>Click on a Signal</strong> in the DBC Tree to build conditions or actions easily.</li>
        <li>💬 (Optional) <strong>Add Comments</strong> anywhere for design notes.</li>
        <li>📥 <strong>Save FSM</strong> when done — this generates a clean JSON usable in Qt-for-Embedded!</li>
      </ol>
    
      <h4>🛠 Button Functions:</h4>
      <ul style={{ fontSize: '0.9em', paddingLeft: 20 }}>
        <li><strong>➕ Add State</strong>: Add a new FSM state node</li>
        <li><strong>⚙️ Add Condition</strong>: Add a condition block to build transition logic</li>
        <li><strong>🎬 Add Action</strong>: Add an action block to assign values before transitioning</li>
        <li><strong>💬 Add Comment</strong>: Add a free-floating comment box (for notes)</li>
        <li><strong>📥 Save FSM</strong>: Save your entire FSM in clean JSON format for Qt-for-Embedded</li>
        <li><strong>📂 Load JSON</strong>: Load a previously saved FSM project</li>
        <li><strong>📤 Load DBC</strong>: Load a DBC file to bring signals into editor</li>
      </ul>
    
      <h4>🎯 Extra Tips:</h4>
      <ul style={{ fontSize: '0.9em', paddingLeft: 20 }}>
        <li><strong>Click on Signal</strong>: To easily add to Conditions or Actions</li>
        <li><strong>Right-click on Edge</strong>: Delete a transition connection</li>
        <li><strong>Double-click on Edge</strong>: Edit the label (e.g., timing, event)</li>
        <li><strong>Drag nodes freely</strong>: Arrange your diagram visually</li>
      </ul>
    
      <button onClick={() => setIsHelpOpen(false)} style={{
        marginTop: '10px',
        background: '#007bff',
        color: 'white',
        border: 'none',
        padding: '8px 16px',
        borderRadius: '6px',
        cursor: 'pointer'
      }}>
        Close
      </button>
    </div>
    
  )}
{isSelectInitialOpen && (
  <div style={{
    position: 'absolute',
    top: 120,
    left: 60,
    width: '400px',
    background: '#ffffff',
    border: '1px solid #ccc',
    borderRadius: '8px',
    padding: '20px',
    zIndex: 100,
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
  }}>
    <h3>🚀 Set Initial State</h3>
    <p>Select which state should be the starting point:</p>

    <select
      value={initialStateName}
      onChange={(e) => setInitialStateName(e.target.value)}
      style={{ width: '100%', padding: '8px', marginBottom: '20px' }}
    >
      <option value="">-- Select State --</option>
      {nodes.filter(n => n.type === 'editableNode').map((n) => (
        <option key={n.id} value={n.data.label}>{n.data.label}</option>
      ))}
    </select>

    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <button
        onClick={() => {
          if (initialStateName) {
            setIsSelectInitialOpen(false);
          } else {
            alert('Please select a valid Initial State!');
          }
        }}
        style={{
          background: '#007bff',
          color: 'white',
          border: 'none',
          padding: '8px 16px',
          borderRadius: '6px',
          cursor: 'pointer'
        }}
      >
        Confirm
      </button>

      <button
        onClick={() => setIsSelectInitialOpen(false)}
        style={{
          background: '#ccc',
          color: '#333',
          border: 'none',
          padding: '8px 16px',
          borderRadius: '6px',
          cursor: 'pointer'
        }}
      >
        Close
      </button>
    </div>
  </div>
)}

    {dbcTree && (
      <div style={{
        position: 'absolute',
        top: 180,
        left: 10,
        zIndex: 10,
        maxHeight: 700,
        overflowY: 'auto',
        background: '#f8f9fa',
        padding: 10,
        border: '1px solid #ddd',
        borderRadius: 8,
        width: 400
      }}>
        <strong>DBC Tree (Expandable & Searchable)</strong>
        <br />
        <input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: '100%', padding: 4, marginBottom: 8, marginTop: 8 }}
        />

        <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
          {Object.entries(dbcTree).map(([nodeName, messages]) => (
            <DBCNode
              key={nodeName}
              nodeName={nodeName}
              messages={messages}
              searchQuery={searchQuery}
              setSelectedSignal = {setSelectedSignal}
              setIsModalOpen= {setIsModalOpen}
            />
          ))}
        </ul>
      </div>
    )}


      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(event, node) => {
          setActiveNodeId(node.id);
        }}        
        onEdgeDoubleClick={(event, edge) => {
          event.preventDefault();
          if (event.type === 'contextmenu') return;
          const newLabel = prompt('Edit transition label:', edge.label || '');
          if (newLabel !== null) {
            setEdges((eds) => eds.map(e => e.id === edge.id ? { ...e, label: newLabel } : e));
          }
        }}
        onEdgeContextMenu={(event, edge) => {
          event.preventDefault();
          const confirmDelete = window.confirm('Delete this transition?');
          if (confirmDelete) {
            setEdges((eds) => eds.filter((e) => e.id !== edge.id));
          }
        }}
        fitView
        nodeTypes={nodeTypes}
        defaultEdgeOptions={{ markerEnd: { type: MarkerType.ArrowClosed } }}
        connectionLineType={ConnectionLineType.SmoothStep}
        deleteKeyCode={46}
      >
        <MiniMap />
        <Controls />
        <Background />
      </ReactFlow>
    </div>
    
  );
}
function DBCNode({ nodeName, messages, searchQuery , setSelectedSignal, setIsModalOpen}) {
  const [expanded, setExpanded] = useState(false);

  const nodeMatches = nodeName.toLowerCase().includes(searchQuery.toLowerCase());
  const anyMessageMatches = Object.keys(messages).some(msgName =>
    msgName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    messages[msgName].signals.some(sig =>
      sig.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  if (searchQuery && !nodeMatches && !anyMessageMatches) {
    return null; // Hide if no match
  }

  return (
    <li style={{ marginBottom: 5 }}>
      <div style={{ cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setExpanded(prev => !prev)}>
        {expanded || searchQuery ? '▼' : '▶'} {nodeName}
      </div>

      {(expanded || searchQuery) && (
        <ul style={{ listStyle: 'none', paddingLeft: 20 }}>
          {Object.entries(messages).map(([msgName, messageData]) => (
            <DBCMessage
              key={msgName}
              messageName={msgName}
              messageData={messageData}
              searchQuery={searchQuery}
              nodeName ={nodeName}
              setSelectedSignal = {setSelectedSignal}
              setIsModalOpen ={setIsModalOpen}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function DBCMessage({ messageName, messageData, searchQuery ,nodeName, setSelectedSignal, setIsModalOpen}) {
  const [expanded, setExpanded] = useState(false);

  const messageMatches = messageName.toLowerCase().includes(searchQuery.toLowerCase());
  const anySignalMatches = messageData.signals.some(sig =>
    sig.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (searchQuery && !messageMatches && !anySignalMatches) {
    return null;
  }

  return (
    <li style={{ marginBottom: 5 }}>
      <div
        style={{ cursor: 'pointer', fontWeight: 'normal' }}
        onClick={() => setExpanded(prev => !prev)}
      >
        {expanded || searchQuery ? '▼' : '▶'} {messageName}
      </div>

      {(expanded || searchQuery) && (
        <div style={{ marginLeft: 20 }}>
          {messageData.comment && (
            <div style={{ fontSize: '0.8em', color: '#777', marginBottom: 5 }}>
              📝 {messageData.comment}
            </div>
          )}
          <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
            {messageData.signals
              .filter(sig =>
                sig.name.toLowerCase().includes(searchQuery.toLowerCase()) || !searchQuery
              )
              .map((sig, idx) => (
                <DBCSignal key={idx} signal={sig} searchQuery={searchQuery}
                nodeName={nodeName}
                messageName={messageName}
                setSelectedSignal ={setSelectedSignal} 
                setIsModalOpen= {setIsModalOpen}/>
              ))}
          </ul>
        </div>
      )}
    </li>
  );
}
function DBCSignal({ signal, searchQuery,nodeName,messageName, setSelectedSignal, setIsModalOpen }) {
  const signalMatches =
    signal.name.toLowerCase().includes(searchQuery.toLowerCase());
  const commentMatches =
    (signal.comment || "").toLowerCase().includes(searchQuery.toLowerCase());
  const valueDescMatches =
    signal.value_descriptions &&
    Object.values(signal.value_descriptions).some(desc =>
      desc.toLowerCase().includes(searchQuery.toLowerCase())
    );

  if (searchQuery && !signalMatches && !commentMatches && !valueDescMatches) {
    return null;
  }

  return (
    <li style={{ fontSize: '0.9em', color: '#555', marginBottom: 4 }}>
  🔹
  <span
    style={{
      color: '#007bff',
      textDecoration: 'underline',
      textUnderlineOffset: '2px',
      cursor: 'pointer',
      marginLeft: 4,
    }}
    onClick={() => {
      setSelectedSignal(`${nodeName}.${messageName}.${signal.name}`);
      setIsModalOpen(true);
    }}
  >
    {signal.name}
  </span>

  {signal.comment && (
    <div style={{ fontSize: '0.8em', color: '#777', marginLeft: 10 }}>
      📝 {signal.comment}
    </div>
  )}
  
  {signal.value_descriptions ? (
    <ul style={{ fontSize: '0.8em', color: '#888', marginLeft: 20 }}>
      {Object.entries(signal.value_descriptions).map(([val, desc]) => (
        <li key={val}>
          {val} → "{desc}"
        </li>
      ))}
    </ul>
  ) : (
    <div style={{ fontSize: '0.8em', color: '#888', marginLeft: 20 }}>
      Min: {signal.min} | Max: {signal.max}
    </div>
  )}
</li>

  );
}

function SignalPickerModal({ selectedSignal, onClose, onConfirm }) {
  const [targetBlock, setTargetBlock] = useState('condition'); // Default choice

  if (!selectedSignal) return null; // No modal if no signal clicked

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{ background: 'white', padding: 20, borderRadius: 8, minWidth: 400 }}>
        <h3>Use Signal in FSM</h3>
        <p><strong>Selected:</strong> {selectedSignal}</p>

        <div style={{ marginTop: 10 }}>
          <label>
            <input
              type="radio"
              value="condition"
              checked={targetBlock === 'condition'}
              onChange={(e) => setTargetBlock(e.target.value)}
            />
            Condition Block
          </label>
          <br />
          <label>
            <input
              type="radio"
              value="action"
              checked={targetBlock === 'action'}
              onChange={(e) => setTargetBlock(e.target.value)}
            />
            Action Block
          </label>
        </div>

        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between' }}>
          <button onClick={onClose}>Cancel</button>
          <button onClick={() => onConfirm(selectedSignal, targetBlock)}>Confirm</button>
        </div>
      </div>
    </div>
  );
}
