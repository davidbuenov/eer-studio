/**
 * EER Studio - Enhanced Entity-Relationship Diagram Editor
 * Copyright (c) 2025 David Bueno Vallejo
 * 
 * Developed with the assistance of Gemini and GitHub Copilot AI
 * 
 * This software is provided as-is, without warranty of any kind.
 */

import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { BookOpen, Code, Share2, HelpCircle, X, Maximize2, ZoomIn, ZoomOut, Info } from 'lucide-react';

/**
 * DEFINICIÓN DE TIPOS
 */
type NodeType = 'entity' | 'weak_entity' | 'relationship' | 'identifying_relationship' | 'attribute' | 'key_attribute' | 'multivalued_attribute' | 'derived_attribute' | 'specialization' | 'union';

interface NodeData {
  id: string;
  type: NodeType;
  label: string;
  x: number;
  y: number;
  meta?: string; // Para 'd', 'o', 'u' en especializaciones
  lineIndex: number; // Para saber qué línea actualizar
}

interface LinkData {
  source: string;
  target: string;
  label?: string; // Cardinalidad o Rol
  style?: 'double' | 'solid'; // Para participación total
}

export interface EERDiagramerHandle {
  getCode: () => string;
  setCode: (c: string) => void;
}

const SAMPLE_CODE = `// Ejemplo con coordenadas persistentes
// Arrastra los nodos y verás cómo cambian los números (x, y)

// Entidades
ent EMPLEADO (400, 300)
ent DEPARTAMENTO (700, 300)
ent PROYECTO (700, 500)
weak_ent DEPENDIENTE (100, 300)

// Atributos Empleado
key_att Dni -> EMPLEADO (350, 220)
att Nombre -> EMPLEADO (450, 220)
derived_att Edad -> EMPLEADO (400, 180)

// Relaciones
rel TRABAJA_PARA (550, 300)
link EMPLEADO TRABAJA_PARA "N"
link DEPARTAMENTO TRABAJA_PARA "1"

rel CONTROLA (700, 400)
link DEPARTAMENTO CONTROLA "1"
link PROYECTO CONTROLA "N"

// Entidad Débil y Relación Identificativa
ident_rel TIENE_DEP (250, 300)
link EMPLEADO TIENE_DEP "1"
link DEPENDIENTE TIENE_DEP "N" [total]

// Jerarquía (EER Cap 4)
spec d -> EMPLEADO (400, 420)
ent SECRETARIA (280, 550)
ent INGENIERO (400, 550)
ent TECNICO (520, 550)

link d SECRETARIA
link d INGENIERO
link d TECNICO

// Unión / Categoría
// Para categorías, definimos las superclases primero
ent PERSONA (100, 650)
ent BANCO (300, 650)
ent EMPRESA (500, 650)

union u (300, 750)
link PERSONA u
link BANCO u
link EMPRESA u

ent PROPIETARIO (300, 850)
link u PROPIETARIO [total]
`;

/**
 * UTILS
 */
const COORD_REGEX = /\(\s*(-?\d+),\s*(-?\d+)\s*\)/;

/**
 * PARSER: Convierte el texto a datos, extrayendo coordenadas si existen
 */
const parseCode = (code: string) => {
  const lines = code.split('\n');
  const newNodes: NodeData[] = [];
  const newLinks: LinkData[] = [];
  const existingIds = new Set<string>(); // Para rastrear IDs y evitar duplicados
  
  let angle = 0;
  const radius = 250;
  const center = { x: 400, y: 300 };

  // Helper para posición por defecto (espiral) si no hay coords
  const getDefaultPos = () => {
    angle += 0.6;
    const r = radius + (angle * 15);
    return {
      x: Math.round(center.x + Math.cos(angle) * r),
      y: Math.round(center.y + Math.sin(angle) * r)
    };
  };

  lines.forEach((line, index) => {
    const cleanLine = line.trim();
    if (!cleanLine || cleanLine.startsWith('//')) return;

    // Extraer coordenadas si existen
    let x: number | null = null;
    let y: number | null = null;
    const coordMatch = cleanLine.match(COORD_REGEX);
    if (coordMatch) {
      x = parseInt(coordMatch[1], 10);
      y = parseInt(coordMatch[2], 10);
    }

    // Quitar coordenadas para procesar el comando limpio
    const lineWithoutCoords = cleanLine.replace(COORD_REGEX, '').trim();
    const parts = lineWithoutCoords.split(/\s+/);
    const command = parts[0].toLowerCase();

    // Comandos de Nodos
    if (['ent', 'weak_ent', 'rel', 'ident_rel', 'att', 'key_att', 'derived_att', 'multivalued_attribute'].includes(command)) {
      const label = parts[1];
      
      // Generar ID único. 
      const isAttribute = ['att', 'key_att', 'derived_att', 'multivalued_attribute'].includes(command);
      let id = label;
      
      if (isAttribute || existingIds.has(id)) {
        id = `${label}_${index}`;
      }
      existingIds.add(id);
      
      let finalX = x;
      let finalY = y;
      
      if (finalX === null || finalY === null) {
        const def = getDefaultPos();
        finalX = def.x;
        finalY = def.y;
      }

      let type: NodeType = 'entity';
      if (command === 'weak_ent') type = 'weak_entity';
      if (command === 'rel') type = 'relationship';
      if (command === 'ident_rel') type = 'identifying_relationship';
      if (command === 'att') type = 'attribute';
      if (command === 'key_att') type = 'key_attribute';
      if (command === 'derived_att') type = 'derived_attribute';
      if (command === 'multivalued_attribute') type = 'multivalued_attribute';

      newNodes.push({ id, type, label, x: finalX, y: finalY, lineIndex: index });

      // Atajo para atributo: att Nombre -> Entidad
      if (parts[2] === '->' && parts[3]) {
        newLinks.push({ source: parts[3], target: id, label: '', style: 'solid' });
      }
    }
    // Especialización / Unión
    else if (['spec', 'union'].includes(command)) {
      const meta = parts[1] || (command === 'union' ? 'u' : 'd'); 
      
      let id = parts[1] || `spec_${index}`;
      if (existingIds.has(id)) {
        id = `${id}_${index}`;
      }
      existingIds.add(id);

      let finalX = x;
      let finalY = y;

      if (finalX === null || finalY === null) {
        const def = getDefaultPos();
        finalX = def.x;
        finalY = def.y;
      }

      newNodes.push({ 
        id, 
        type: command === 'union' ? 'union' : 'specialization', 
        label: meta, 
        x: finalX, 
        y: finalY, 
        meta,
        lineIndex: index
      });

      if (parts[2] === '->' && parts[3]) {
        // Conexión doble a la superclase
        newLinks.push({ source: parts[3], target: id, label: '', style: 'double' });
      }
    }
    // Conexiones
    else if (command === 'link') {
      const source = parts[1];
      const target = parts[2];
      let label = '';
      let style: 'solid' | 'double' = 'solid';

      const labelMatch = lineWithoutCoords.match(/"([^"]+)"/);
      if (labelMatch) label = labelMatch[1];

      if (lineWithoutCoords.includes('[total]') || lineWithoutCoords.includes('[double]')) {
        style = 'double';
      }

      if (source && target) {
        newLinks.push({ source, target, label, style });
      }
    }
  });

  return { nodes: newNodes, links: newLinks };
};

function EERDiagrammer(_: unknown, ref: React.Ref<EERDiagramerHandle>) {
  const [code, setCode] = useState(SAMPLE_CODE);
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [links, setLinks] = useState<LinkData[]>([]);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showFileMenu, setShowFileMenu] = useState(false);
  const [showCredits, setShowCredits] = useState(false);
  const [showAIPrompt, setShowAIPrompt] = useState(false);
  const [scale, setScale] = useState(0.8);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [lastFileHandle, setLastFileHandle] = useState<unknown | null>(null);
  
  const svgRef = useRef<SVGSVGElement>(null);
  const codeRef = useRef(code);

  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  useImperativeHandle(ref, () => ({
    getCode: () => codeRef.current,
    setCode: (c: string) => setCode(c),
  }));


  useEffect(() => {
    const timer = setTimeout(() => {
      const { nodes: parsedNodes, links: parsedLinks } = parseCode(code);
      setNodes(parsedNodes);
      setLinks(parsedLinks);
    }, 300);
    return () => clearTimeout(timer);
  }, [code]);

  const updateCodePosition = (nodeId: string, newX: number, newY: number) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    const lines = codeRef.current.split('\n');
    const lineIndex = node.lineIndex;
    
    if (lineIndex >= 0 && lineIndex < lines.length) {
      let line = lines[lineIndex];
      if (COORD_REGEX.test(line)) {
        line = line.replace(COORD_REGEX, '');
      }
      line = line.trimEnd();
      const newLine = `${line} (${Math.round(newX)}, ${Math.round(newY)})`;
      
      lines[lineIndex] = newLine;
      const newCode = lines.join('\n');
      
      setCode(newCode);
    }
  };

  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDraggedNodeId(id);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggedNodeId) {
      const svg = svgRef.current;
      if (!svg) return;
      const CTM = svg.getScreenCTM();
      if (!CTM) return;
      
      const x = (e.clientX - CTM.e) / CTM.a / scale - offset.x / scale;
      const y = (e.clientY - CTM.f) / CTM.d / scale - offset.y / scale;

      setNodes(prev => prev.map(n => 
        n.id === draggedNodeId ? { ...n, x, y } : n
      ));
    } else if (isDraggingCanvas) {
      setOffset(prev => ({
        x: prev.x + e.movementX,
        y: prev.y + e.movementY
      }));
    }
  };

  const handleMouseUp = () => {
    if (draggedNodeId) {
      const node = nodes.find(n => n.id === draggedNodeId);
      if (node) {
        updateCodePosition(node.id, node.x, node.y);
      }
      setDraggedNodeId(null);
    }
    setIsDraggingCanvas(false);
  };

  const renderNodeShape = (node: NodeData) => {
    const strokeColor = '#334155';
    const strokeWidth = 2;
    const fillColor = '#ffffff';
    const textColor = '#0f172a';

    switch (node.type) {
      case 'entity':
        return (
          <g>
            <rect x="-50" y="-25" width="100" height="50" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} rx="2" className="drop-shadow-sm" />
            <text x="0" y="5" textAnchor="middle" fill={textColor} fontSize="12" fontWeight="bold" style={{ pointerEvents: 'none', userSelect: 'none' }}>{node.label}</text>
          </g>
        );
      case 'weak_entity':
        return (
          <g>
            <rect x="-50" y="-25" width="100" height="50" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} rx="2" className="drop-shadow-sm"/>
            <rect x="-44" y="-19" width="88" height="38" fill="none" stroke={strokeColor} strokeWidth={strokeWidth} rx="1" />
            <text x="0" y="5" textAnchor="middle" fill={textColor} fontSize="12" fontWeight="bold" style={{ pointerEvents: 'none', userSelect: 'none' }}>{node.label}</text>
          </g>
        );
      case 'relationship':
        return (
          <g>
            <polygon points="0,-40 60,0 0,40 -60,0" fill="#f8fafc" stroke={strokeColor} strokeWidth={strokeWidth} className="drop-shadow-sm"/>
            <text x="0" y="5" textAnchor="middle" fill={textColor} fontSize="11" fontWeight="bold" style={{ pointerEvents: 'none', userSelect: 'none' }}>{node.label}</text>
          </g>
        );
      case 'identifying_relationship':
        return (
          <g>
            <polygon points="0,-40 60,0 0,40 -60,0" fill="#f8fafc" stroke={strokeColor} strokeWidth={strokeWidth} className="drop-shadow-sm"/>
            <polygon points="0,-32 48,0 0,32 -48,0" fill="none" stroke={strokeColor} strokeWidth={strokeWidth} />
            <text x="0" y="5" textAnchor="middle" fill={textColor} fontSize="11" fontWeight="bold" style={{ pointerEvents: 'none', userSelect: 'none' }}>{node.label}</text>
          </g>
        );
      case 'attribute':
      case 'key_attribute':
      case 'multivalued_attribute':
      case 'derived_attribute':
      {
        const isKey = node.type === 'key_attribute';
        const isMulti = node.type === 'multivalued_attribute';
        const isDerived = node.type === 'derived_attribute';
        return (
          <g>
            <ellipse cx="0" cy="0" rx="45" ry="25" fill="#f1f5f9" stroke={strokeColor} strokeWidth={strokeWidth} strokeDasharray={isDerived ? "4" : "0"} className="drop-shadow-sm"/>
            {isMulti && <ellipse cx="0" cy="0" rx="38" ry="18" fill="none" stroke={strokeColor} strokeWidth={strokeWidth} />}
            <text x="0" y="4" textAnchor="middle" fill={textColor} fontSize="11" textDecoration={isKey ? "underline" : "none"} style={{ pointerEvents: 'none', userSelect: 'none' }}>{node.label}</text>
          </g>
        );
      }
      case 'specialization':
      case 'union':
        return (
          <g>
            <circle cx="0" cy="0" r="18" fill="#fff" stroke={strokeColor} strokeWidth={strokeWidth} className="drop-shadow-sm"/>
            <text x="0" y="5" textAnchor="middle" fontWeight="bold" fontSize="14" style={{ pointerEvents: 'none', userSelect: 'none' }}>{node.label}</text>
          </g>
        );
      default:
        return null;
    }
  };

  const renderLinks = () => {
    return links.map((link, i) => {
      const sourceNode = nodes.find(n => n.id === link.source);
      const targetNode = nodes.find(n => n.id === link.target);
      if (!sourceNode || !targetNode) return null;

      // CORRECCIÓN FINAL:
      // 1. Detectar si el origen es una especialización/unión y el destino es una entidad (subclase/categoría).
      // 2. El símbolo de subconjunto debe abrirse hacia el ORIGEN (la especialización).
      
      const isSourceSpec = sourceNode.type === 'specialization' || sourceNode.type === 'union';
      const isTargetEntity = targetNode.type === 'entity' || targetNode.type === 'weak_entity';
      const showSubsetSymbol = isSourceSpec && isTargetEntity;
      
      const midX = (sourceNode.x + targetNode.x) / 2;
      const midY = (sourceNode.y + targetNode.y) / 2;
      
      // Calcular ángulo para rotar el símbolo correctamente
      const angle = Math.atan2(targetNode.y - sourceNode.y, targetNode.x - sourceNode.x) * 180 / Math.PI;

      return (
        <g key={i}>
          <line
            x1={sourceNode.x}
            y1={sourceNode.y}
            x2={targetNode.x}
            y2={targetNode.y}
            stroke="#64748b"
            strokeWidth={link.style === 'double' ? 4 : 1.5}
            strokeLinecap="round"
          />
          {link.style === 'double' && (
             <line
             x1={sourceNode.x}
             y1={sourceNode.y}
             x2={targetNode.x}
             y2={targetNode.y}
             stroke="#ffffff"
             strokeWidth={2}
             strokeLinecap="round"
           />
          )}

          {showSubsetSymbol && (
            <path 
              d={`M ${midX-8} ${midY-5} Q ${midX} ${midY+8} ${midX+8} ${midY-5}`}
              fill="none"
              stroke="#64748b"
              strokeWidth="2"
              // Rotación ajustada: angle - 90 asegura que la copa se abra hacia el nodo Origen (la especialización)
              transform={`rotate(${angle - 90}, ${midX}, ${midY})`}
            />
          )}

          {link.label && (
            <g transform={`translate(${midX}, ${midY})`}>
              <rect x="-10" y="-10" width="20" height="20" fill="white" opacity="0.9" rx="4" />
              <text x="0" y="5" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#0f172a" style={{ pointerEvents: 'none', userSelect: 'none' }}>{link.label}</text>
            </g>
          )}
        </g>
      );
    });
  };

  const handleExport = () => {
    if (svgRef.current) {
      const data = new XMLSerializer().serializeToString(svgRef.current);
      const blob = new Blob([data], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'eer-diagram.svg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // File menu actions (Open, Save, Save As)
  const handleOpenFile = async () => {
    try {
      const picker = (window as unknown as { showOpenFilePicker?: (opts: unknown) => Promise<FileSystemFileHandle[]> }).showOpenFilePicker;
      const handles = picker ? await picker({
        types: [{ description: 'EER Files', accept: { 'text/plain': ['.eer'] } }],
        multiple: false,
      }) : [];
      const handle = handles && handles[0];
      if (handle) {
        const file = await (handle as unknown as { getFile: () => Promise<File> }).getFile();
        const text = await file.text();
        setCode(text);
        setLastFileHandle(handle);
      } else {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.eer,text/plain';
        input.onchange = async () => {
          const f = (input.files && input.files[0]) || null;
          if (!f) return;
          const text = await f.text();
          setCode(text);
        };
        input.click();
      }
    } finally {
      setShowFileMenu(false);
    }
  };

  const saveToHandle = async (handle: unknown, content: string) => {
    const writable = await (handle as unknown as { createWritable: () => Promise<{ write: (data: string) => Promise<void>; close: () => Promise<void>; }> }).createWritable();
    await writable.write(content);
    await writable.close();
  };

  const handleSaveFile = async () => {
    try {
      if (lastFileHandle) {
        await saveToHandle(lastFileHandle, codeRef.current);
      } else {
        const savePicker = (window as unknown as { showSaveFilePicker?: (opts: unknown) => Promise<FileSystemFileHandle> }).showSaveFilePicker;
        if (savePicker) {
          const fileHandle = await savePicker({
            types: [{ description: 'EER Files', accept: { 'text/plain': ['.eer'] } }],
            suggestedName: 'diagram.eer',
          });
          await saveToHandle(fileHandle, codeRef.current);
          setLastFileHandle(fileHandle);
        } else {
          const blob = new Blob([codeRef.current], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'diagram.eer';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      }
    } finally {
      setShowFileMenu(false);
    }
  };

  const handleSaveAsFile = async () => {
    try {
      const savePicker = (window as unknown as { showSaveFilePicker?: (opts: unknown) => Promise<FileSystemFileHandle> }).showSaveFilePicker;
      if (savePicker) {
        const fileHandle = await savePicker({
          types: [{ description: 'EER Files', accept: { 'text/plain': ['.eer'] } }],
          suggestedName: 'diagram.eer',
        });
        await saveToHandle(fileHandle, codeRef.current);
        setLastFileHandle(fileHandle);
      } else {
        const blob = new Blob([codeRef.current], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'diagram.eer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } finally {
      setShowFileMenu(false);
    }
  };

  return (
    <div className="flex h-screen w-full flex-col bg-slate-50 text-slate-900 font-sans overflow-hidden">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 shadow-sm z-30">
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-indigo-600" />
          <h1 className="text-xl font-bold text-slate-800">EER Studio</h1>
          <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">Edición Bidireccional</span>
          <div className="relative ml-4" onMouseDown={e => e.stopPropagation()}>
            <button onClick={() => setShowFileMenu(s => !s)} className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 border border-slate-200">File</button>
            {showFileMenu && (
              <div className="absolute left-0 mt-1 w-40 rounded-md border border-slate-200 bg-white shadow-lg z-40">
                <button onClick={handleOpenFile} className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-100">Open</button>
                <button onClick={handleSaveFile} className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-100">Save</button>
                <button onClick={handleSaveAsFile} className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-100">Save as</button>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowHelp(true)} className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors">
            <HelpCircle className="h-4 w-4" /> Sintaxis
          </button>
          <button onClick={() => setShowAIPrompt(true)} className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors">
            <Code className="h-4 w-4" /> Prompt para tu IA
          </button>
          <button onClick={() => setShowCredits(true)} className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors">
            <Info className="h-4 w-4" /> Créditos
          </button>
          <button onClick={handleExport} className="flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 shadow-sm transition-colors">
            <Share2 className="h-4 w-4" /> Exportar SVG
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        
        <div className="flex w-1/3 min-w-[300px] flex-col border-r border-slate-200 bg-white shadow-lg z-20">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2 bg-slate-50">
            <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <Code className="h-3 w-3" /> Definición
            </span>
            <div className="text-[10px] text-slate-400">Las coordenadas se actualizan al mover nodos</div>
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="flex-1 resize-none bg-slate-50 p-4 font-mono text-xs md:text-sm leading-relaxed text-slate-700 focus:outline-none selection:bg-indigo-100"
            spellCheck={false}
          />
        </div>

        <div className="relative flex-1 bg-slate-50 overflow-hidden cursor-grab active:cursor-grabbing"
             onMouseDown={() => setIsDraggingCanvas(true)}
             onMouseMove={handleMouseMove}
             onMouseUp={handleMouseUp}
             onMouseLeave={handleMouseUp}
        >
          <div className="absolute bottom-4 right-4 flex gap-2 rounded-lg bg-white p-1 shadow-lg border border-slate-200 z-20" onMouseDown={e => e.stopPropagation()}>
            <button onClick={() => setScale(s => Math.max(0.1, s - 0.1))} className="p-2 hover:bg-slate-100 rounded text-slate-600"><ZoomOut className="h-5 w-5" /></button>
            <span className="flex items-center px-2 text-xs font-medium text-slate-500 min-w-[3rem] justify-center">{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale(s => Math.min(3, s + 0.1))} className="p-2 hover:bg-slate-100 rounded text-slate-600"><ZoomIn className="h-5 w-5" /></button>
            <div className="w-px bg-slate-200 my-1 mx-1"></div>
            <button onClick={() => { setOffset({x:0, y:0}); setScale(0.8); }} className="p-2 hover:bg-slate-100 rounded text-slate-600"><Maximize2 className="h-5 w-5" /></button>
          </div>

          <svg 
            ref={svgRef}
            className="h-full w-full touch-none"
          >
            <g transform={`translate(${offset.x}, ${offset.y}) scale(${scale})`}>
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect x={-50000} y={-50000} width={100000} height={100000} fill="url(#grid)" />

              {renderLinks()}
              {nodes.map(node => (
                <g 
                  key={node.id} 
                  transform={`translate(${node.x}, ${node.y})`}
                  onMouseDown={(e) => handleMouseDown(e, node.id)}
                  style={{ cursor: 'grab' }}
                >
                  {renderNodeShape(node)}
                </g>
              ))}
            </g>
          </svg>
        </div>
      </div>

      {showAIPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl rounded-xl bg-white p-6 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 flex-shrink-0">
              <h2 className="text-lg font-bold text-slate-800">🤖 Prompt para tu IA</h2>
              <button onClick={() => setShowAIPrompt(false)} className="rounded-full p-1 hover:bg-slate-100"><X className="h-5 w-5 text-slate-500" /></button>
            </div>
            <div className="overflow-y-auto p-4 text-sm text-slate-700 space-y-4">
              <p className="text-slate-600">
                Usa este prompt con <strong>ChatGPT, Claude, Gemini</strong> u otra IA para generar código EER automáticamente.
              </p>
              
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Copiar este prompt</span>
                  <button 
                    onClick={() => {
                      const promptText = `Actúa como un experto en diseño de bases de datos y generador de código para la herramienta "EER Studio". Tu tarea es analizar una descripción en lenguaje natural de un problema de requisitos de datos y convertirla en el código DSL (Domain Specific Language) específico que utiliza EER Studio para generar diagramas.

### Reglas de Sintaxis de EER Studio:

1. **Entidades:**
   - Fuertes: \`ent NOMBRE_ENTIDAD\`
   - Débiles: \`weak_ent NOMBRE_ENTIDAD\`
   - (Opcional) Puedes añadir coordenadas: \`ent USUARIO (100, 200)\`

2. **Atributos:**
   - Simple: \`att NombreAtributo -> ENTIDAD\`
   - Clave (identificador): \`key_att NombreAtributo -> ENTIDAD\`
   - Derivado: \`derived_att NombreAtributo -> ENTIDAD\`
   - Multivaluado: \`multivalued_att NombreAtributo -> ENTIDAD\`

3. **Relaciones:**
   - Normal: \`rel NOMBRE_RELACION\`
   - Identificativa (para entidades débiles): \`ident_rel NOMBRE_RELACION\`

4. **Conexiones (Links) y Cardinalidad:**
   - Sintaxis: \`link ENTIDAD RELACION "CARDINALIDAD"\`
   - Cardinalidades: "1", "N", "M"
   - Participación Total: \`link EMPLEADO TRABAJA_EN "N" [total]\`

5. **Jerarquías (Especialización/Generalización):**
   - Definir especialización: \`spec TIPO -> SUPERCLASE\`
     - TIPO: 'd' (disjunta) o 'o' (solapada)
   - Conectar subclases: \`link TIPO SUBCLASE\`
   - Ejemplo:
     \`\`\`
     spec d -> EMPLEADO
     link d SECRETARIA
     link d INGENIERO
     \`\`\`

6. **Uniones (Categorías):**
   - Definir unión: \`union u\`
   - Conectar superclases: \`link SUPERCLASE u\`
   - Conectar categoría: \`link u CATEGORIA\`

### Ejemplo:

**Input:** "Un empleado trabaja en un departamento. El empleado tiene DNI (clave) y Nombre. El departamento tiene un Nombre."

**Output:**
\`\`\`
// Entidades
ent EMPLEADO
ent DEPARTAMENTO

// Atributos
key_att DNI -> EMPLEADO
att Nombre -> EMPLEADO
att Nombre -> DEPARTAMENTO

// Relaciones
rel TRABAJA_EN
link EMPLEADO TRABAJA_EN "N" [total]
link DEPARTAMENTO TRABAJA_EN "1"
\`\`\`

### Tu Tarea:

Genera el código EER Studio para el siguiente problema. Identifica correctamente claves, cardinalidades, jerarquías y entidades débiles. Puedes sugerir coordenadas aproximadas para evitar superposiciones.

**Problema a modelar:**
[AQUÍ PEGA TU PROBLEMA DE BASE DE DATOS]`;
                      navigator.clipboard.writeText(promptText);
                    }}
                    className="rounded-md bg-indigo-600 px-3 py-1 text-xs text-white hover:bg-indigo-700"
                  >
                    Copiar
                  </button>
                </div>
                <pre className="text-xs overflow-x-auto whitespace-pre-wrap font-mono bg-white p-3 rounded border border-slate-200 max-h-96">
{`Actúa como un experto en diseño de bases de datos y generador de código para la herramienta "EER Studio". Tu tarea es analizar una descripción en lenguaje natural de un problema de requisitos de datos y convertirla en el código DSL (Domain Specific Language) específico que utiliza EER Studio para generar diagramas.

### Reglas de Sintaxis de EER Studio:

1. **Entidades:**
   - Fuertes: \`ent NOMBRE_ENTIDAD\`
   - Débiles: \`weak_ent NOMBRE_ENTIDAD\`
   - (Opcional) Puedes añadir coordenadas: \`ent USUARIO (100, 200)\`

2. **Atributos:**
   - Simple: \`att NombreAtributo -> ENTIDAD\`
   - Clave (identificador): \`key_att NombreAtributo -> ENTIDAD\`
   - Derivado: \`derived_att NombreAtributo -> ENTIDAD\`
   - Multivaluado: \`multivalued_att NombreAtributo -> ENTIDAD\`

3. **Relaciones:**
   - Normal: \`rel NOMBRE_RELACION\`
   - Identificativa (para entidades débiles): \`ident_rel NOMBRE_RELACION\`

4. **Conexiones (Links) y Cardinalidad:**
   - Sintaxis: \`link ENTIDAD RELACION "CARDINALIDAD"\`
   - Cardinalidades: "1", "N", "M"
   - Participación Total: \`link EMPLEADO TRABAJA_EN "N" [total]\`

5. **Jerarquías (Especialización/Generalización):**
   - Definir especialización: \`spec TIPO -> SUPERCLASE\`
     - TIPO: 'd' (disjunta) o 'o' (solapada)
   - Conectar subclases: \`link TIPO SUBCLASE\`
   - Ejemplo:
     \`\`\`
     spec d -> EMPLEADO
     link d SECRETARIA
     link d INGENIERO
     \`\`\`

6. **Uniones (Categorías):**
   - Definir unión: \`union u\`
   - Conectar superclases: \`link SUPERCLASE u\`
   - Conectar categoría: \`link u CATEGORIA\`

### Ejemplo:

**Input:** "Un empleado trabaja en un departamento. El empleado tiene DNI (clave) y Nombre. El departamento tiene un Nombre."

**Output:**
\`\`\`
// Entidades
ent EMPLEADO
ent DEPARTAMENTO

// Atributos
key_att DNI -> EMPLEADO
att Nombre -> EMPLEADO
att Nombre -> DEPARTAMENTO

// Relaciones
rel TRABAJA_EN
link EMPLEADO TRABAJA_EN "N" [total]
link DEPARTAMENTO TRABAJA_EN "1"
\`\`\`

### Tu Tarea:

Genera el código EER Studio para el siguiente problema. Identifica correctamente claves, cardinalidades, jerarquías y entidades débiles. Puedes sugerir coordenadas aproximadas para evitar superposiciones.

**Problema a modelar:**
[AQUÍ PEGA TU PROBLEMA DE BASE DE DATOS]`}
                </pre>
              </div>

              <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
                <h3 className="font-semibold text-indigo-900 mb-2">📋 Instrucciones:</h3>
                <ol className="text-sm space-y-1 list-decimal list-inside text-slate-700">
                  <li>Haz clic en "Copiar" para copiar el prompt</li>
                  <li>Pégalo en ChatGPT, Claude, Gemini o tu IA favorita</li>
                  <li>Reemplaza <code className="bg-white px-1 rounded text-xs">[AQUÍ PEGA TU PROBLEMA DE BASE DE DATOS]</code> con tu enunciado</li>
                  <li>Copia el código generado por la IA</li>
                  <li>Pégalo en el panel izquierdo de EER Studio</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCredits && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl bg-gradient-to-br from-indigo-50 to-white p-8 shadow-2xl border border-indigo-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-indigo-900">Créditos</h2>
              <button onClick={() => setShowCredits(false)} className="rounded-full p-1 hover:bg-indigo-100 transition-colors">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            
            <div className="space-y-6 text-slate-700">
              <div className="text-center">
                <BookOpen className="h-16 w-16 text-indigo-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-indigo-900 mb-2">EER Studio</h3>
                <p className="text-sm text-slate-600">Editor de Diagramas Entidad-Relación Extendido</p>
              </div>

              <div className="bg-white rounded-lg p-4 border border-indigo-100">
                <p className="text-sm leading-relaxed">
                  <strong className="text-indigo-900">Desarrollado por:</strong><br />
                  <a href="https://davidbuenov.com/" target="_blank" rel="noopener noreferrer" className="text-lg font-semibold text-indigo-700 hover:text-indigo-900 hover:underline transition-colors">
                    David Bueno Vallejo
                  </a>
                </p>
              </div>

              <div className="bg-white rounded-lg p-4 border border-indigo-100">
                <p className="text-sm leading-relaxed">
                  <strong className="text-indigo-900">Asistencia de IA:</strong><br />
                  Este proyecto fue desarrollado con la ayuda de <strong>Gemini</strong> y <strong>GitHub Copilot</strong>,
                  herramientas de inteligencia artificial que facilitaron el desarrollo y la implementación de funcionalidades.
                </p>
              </div>

              <div className="text-center pt-4 border-t border-indigo-100">
                <p className="text-xs text-slate-500">
                  © 2025 David Bueno Vallejo<br />
                  Todos los derechos reservados
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 flex-shrink-0">
              <h2 className="text-lg font-bold text-slate-800">Guía de Sintaxis EER</h2>
              <button onClick={() => setShowHelp(false)} className="rounded-full p-1 hover:bg-slate-100"><X className="h-5 w-5 text-slate-500" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-slate-600 overflow-y-auto p-2">
              <div>
                <h3 className="mb-2 font-bold text-indigo-600">Entidades y Relaciones</h3>
                <ul className="space-y-2">
                  <li className="flex flex-col"><code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800 w-fit">ent NOMBRE (x, y)</code> <span>Entidad. Coords opcionales.</span></li>
                  <li className="flex flex-col"><code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800 w-fit">weak_ent NOMBRE</code> <span>Entidad débil.</span></li>
                  <li className="flex flex-col"><code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800 w-fit">rel NOMBRE</code> <span>Relación.</span></li>
                  <li className="flex flex-col"><code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800 w-fit">ident_rel NOMBRE</code> <span>Relación identificativa.</span></li>
                </ul>
              </div>
              <div>
                <h3 className="mb-2 font-bold text-indigo-600">Atributos</h3>
                <ul className="space-y-2">
                  <li className="flex flex-col"><code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800 w-fit">att NOMBRE -&gt; ENTIDAD</code> <span>Atributo simple.</span></li>
                  <li className="flex flex-col"><code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800 w-fit">key_att NOMBRE -&gt; ENTIDAD</code> <span>Atributo clave.</span></li>
                  <li className="flex flex-col"><code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800 w-fit">derived_att NOMBRE</code> <span>Derivado.</span></li>
                  <li className="flex flex-col"><code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800 w-fit">multivalued_attribute</code> <span>Multivaluado.</span></li>
                </ul>
              </div>
              <div>
                <h3 className="mb-2 font-bold text-indigo-600">Conexiones</h3>
                <ul className="space-y-2">
                  <li className="flex flex-col"><code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800 w-fit">link A B "1"</code> <span>Conexión simple.</span></li>
                  <li className="flex flex-col"><code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800 w-fit">link A B "N" [total]</code> <span>Participación total.</span></li>
                </ul>
              </div>
              <div>
                <h3 className="mb-2 font-bold text-indigo-600">EER (Avanzado)</h3>
                <ul className="space-y-2">
                  <li className="flex flex-col"><code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800 w-fit">spec d -&gt; SUPERCLASE</code> <span>Especialización.</span></li>
                  <li className="flex flex-col"><code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800 w-fit">link d SUBCLASE</code> <span>Conecta subclase.</span></li>
                  <li className="flex flex-col"><code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800 w-fit">union u</code> <span>Categoría de Unión.</span></li>
                </ul>
              </div>
            </div>
            <div className="mt-6 border-t border-slate-100 pt-4 text-center flex-shrink-0">
              <button onClick={() => setShowHelp(false)} className="rounded-md bg-indigo-600 px-6 py-2 text-sm font-bold text-white hover:bg-indigo-700 transition-colors">Entendido</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const EERDiagrammerWithRef = forwardRef(EERDiagrammer);
export default EERDiagrammerWithRef;