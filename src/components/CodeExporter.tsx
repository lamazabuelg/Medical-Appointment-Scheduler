import React, { useState } from "react";
import { codeFiles, CodeFile } from "../data/codeTemplates";
import { Copy, Check, Download, FileCode, Terminal, Sparkles, FolderDown } from "lucide-react";

export const CodeExporter: React.FC = () => {
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  const currentFile = codeFiles[activeFileIndex] || codeFiles[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSingle = () => {
    const blob = new Blob([currentFile.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = currentFile.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadAll = () => {
    codeFiles.forEach((file, index) => {
      setTimeout(() => {
        const blob = new Blob([file.content], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.filename;
        a.click();
        URL.revokeObjectURL(url);
      }, index * 250);
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
              Exportador de Código 100% Local
            </span>
            <span className="text-slate-300">·</span>
            <span className="text-xs text-slate-500 font-mono">
              Python 3.10+ · LangGraph · Playwright
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            Archivos del Proyecto para tu Máquina Local
          </h2>
          <p className="text-xs text-slate-600 max-w-2xl mt-0.5">
            Descarga o copia los archivos listos para ejecutar. Incluyen la automatización completa de Playwright para HUSI, los esquemas Pydantic y el cliente unificado de Google GenAI SDK.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleDownloadAll}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold bg-blue-700 hover:bg-blue-800 text-white rounded-lg shadow-xs transition-colors"
          >
            <FolderDown className="w-3.5 h-3.5" />
            Descargar Todos los Archivos
          </button>
        </div>
      </div>

      {/* Local Setup Quickstart Guide */}
      <div className="bg-slate-900 text-slate-200 p-4 rounded-xl border border-slate-800 text-xs">
        <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
          <span className="font-mono font-semibold flex items-center gap-2 text-emerald-400">
            <Terminal className="w-4 h-4" />
            Guía de Inicio Rápido en tu Terminal Local
          </span>
          <span className="text-[11px] font-mono text-slate-500">
            macOS / Linux / Windows WSL
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-[11px]">
          <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
            <span className="text-slate-500 block mb-1"># 1. Crear entorno:</span>
            <code className="text-amber-300">python -m venv venv && source venv/bin/activate</code>
          </div>
          <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
            <span className="text-slate-500 block mb-1"># 2. Instalar paquetes:</span>
            <code className="text-blue-300">pip install -r requirements.txt && playwright install chromium</code>
          </div>
          <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
            <span className="text-slate-500 block mb-1"># 3. Correr orquestador:</span>
            <code className="text-emerald-300">python main_langgraph.py</code>
          </div>
        </div>
      </div>

      {/* Code Viewer */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        {/* File Tabs */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 pt-3 flex items-center gap-2 overflow-x-auto">
          {codeFiles.map((file, idx) => (
            <button
              key={file.filename}
              onClick={() => setActiveFileIndex(idx)}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-mono rounded-t-lg transition-colors border-t border-x -mb-px whitespace-nowrap ${
                activeFileIndex === idx
                  ? "bg-white border-slate-200 font-bold text-blue-700 shadow-2xs"
                  : "bg-transparent border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              {file.filename}
            </button>
          ))}
        </div>

        {/* Action bar for current file */}
        <div className="px-5 py-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
          <div>
            <div className="text-xs font-bold text-slate-900 font-mono">
              {currentFile.filename}
            </div>
            <div className="text-[11px] text-slate-500">
              {currentFile.description}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copied ? "¡Copiado!" : "Copiar"}</span>
            </button>
            <button
              onClick={handleDownloadSingle}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Descargar
            </button>
          </div>
        </div>

        {/* Code Content */}
        <div className="p-4 bg-slate-950 overflow-x-auto text-xs font-mono text-slate-100 leading-relaxed max-h-[500px]">
          <pre>{currentFile.content}</pre>
        </div>
      </div>
    </div>
  );
};
