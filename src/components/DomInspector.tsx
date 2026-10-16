import React, { useState } from "react";
import { Sparkles, Code, CheckCircle, Search, RefreshCw, Terminal, ArrowRight } from "lucide-react";

export const DomInspector: React.FC = () => {
  const [selectedSnippetKey, setSelectedSnippetKey] = useState<string>("header_ingresar");
  const [customHtml, setCustomHtml] = useState<string>(sampleSnippets.header_ingresar);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const handleSelectSnippet = (key: string) => {
    setSelectedSnippetKey(key);
    setCustomHtml((sampleSnippets as any)[key]);
    setAnalysisResult(null);
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setAnalysisResult(null);
    try {
      const response = await fetch("/api/agent/analyze-dom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          htmlSnippet: customHtml,
          targetAction:
            "Identificar selectores Playwright robustos para agendatucita.husi.org.co/paciente",
        }),
      });
      const data = await response.json();
      setAnalysisResult(data);
    } catch (e: any) {
      alert("Error al analizar DOM: " + e.message);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
              Análisis del DOM HUSI con Gemini
            </span>
            <span className="text-slate-300">·</span>
            <span className="text-xs text-slate-500 font-mono">
              Inferencia LLM para Playwright
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            Inspector de Selectores y Estructura Web HUSI
          </h2>
          <p className="text-xs text-slate-600 max-w-2xl mt-0.5">
            Usa el modelo Gemini 3.8 Flash para analizar el marcado HTML real del portal de citas y obtener selectores resistentes a cambios de interfaz en Playwright.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg shadow-xs transition-colors ${
              analyzing
                ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                : "bg-purple-700 hover:bg-purple-800 text-white"
            }`}
          >
            {analyzing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            {analyzing ? "Analizando con Gemini..." : "Analizar DOM con Gemini"}
          </button>
        </div>
      </div>

      {/* Snippet Picker Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => handleSelectSnippet("header_ingresar")}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
            selectedSnippetKey === "header_ingresar"
              ? "bg-blue-700 text-white font-semibold"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          1. Botón 'Ingresar' (Arriba a la derecha)
        </button>
        <button
          onClick={() => handleSelectSnippet("login_form")}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
            selectedSnippetKey === "login_form"
              ? "bg-blue-700 text-white font-semibold"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          2. Formulario de Documento y Clave
        </button>
        <button
          onClick={() => handleSelectSnippet("citas_reprogramar")}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
            selectedSnippetKey === "citas_reprogramar"
              ? "bg-blue-700 text-white font-semibold"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          3. Citas Programadas & Botón 'Reprogramar'
        </button>
        <button
          onClick={() => handleSelectSnippet("calendar_slots")}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
            selectedSnippetKey === "calendar_slots"
              ? "bg-blue-700 text-white font-semibold"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          4. Horarios y Diálogo de Confirmación
        </button>
      </div>

      {/* Split Code and Gemini Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: HTML Code Input */}
        <div className="lg:col-span-6 bg-white p-4 rounded-xl border border-slate-200 space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
            <span className="font-bold text-slate-800 font-mono">
              Fragmento DOM / HTML de Entrada:
            </span>
            <span className="text-[11px] text-slate-400">
              Editable o pega tu propio HTML
            </span>
          </div>
          <textarea
            value={customHtml}
            onChange={(e) => setCustomHtml(e.target.value)}
            rows={14}
            className="w-full text-xs font-mono bg-slate-950 text-slate-100 p-3 rounded-lg border border-slate-800 leading-relaxed focus:outline-blue-600"
          />
        </div>

        {/* Right: Gemini Analysis Result */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-600" />
                Selectores Recomendados por Gemini (Playwright)
              </span>
              <span className="text-[10px] font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                gemini-3.8-flash
              </span>
            </div>

            {analysisResult ? (
              <div className="space-y-3 text-xs">
                <p className="text-slate-600 leading-relaxed">
                  {analysisResult.analysis}
                </p>

                {analysisResult.recommendedSelectors && (
                  <div className="space-y-2">
                    <span className="font-bold text-slate-800 block">
                      Selectores CSS / Texto Optimizados:
                    </span>
                    <div className="space-y-1.5">
                      {Object.entries(analysisResult.recommendedSelectors).map(
                        ([key, val]: any) => (
                          <div
                            key={key}
                            className="bg-slate-50 p-2 rounded border border-slate-200 font-mono text-[11px]"
                          >
                            <span className="text-blue-700 font-semibold block">
                              {key}:
                            </span>
                            <code className="text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-200 block mt-1 truncate">
                              {val}
                            </code>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500 text-xs">
                <Search className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                Haz clic en <strong>"Analizar DOM con Gemini"</strong> para generar selectores específicos con IA.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const sampleSnippets = {
  header_ingresar: `<header class="navbar navbar-husi">
  <div class="logo">
    <img src="/husi-logo.png" alt="Hospital Universitario San Ignacio">
  </div>
  <nav class="nav-actions">
    <!-- Botón en la esquina superior derecha según solicitud -->
    <a href="/login" id="btn-ingresar" class="btn btn-primary btn-sm">
      <i class="icon-user"></i> Ingresar
    </a>
  </nav>
</header>`,

  login_form: `<div class="modal-dialog modal-login">
  <form id="form-auth" action="/api/login" method="POST">
    <label for="tipo_doc">Tipo de Identificación:</label>
    <select name="tipoDocumento" id="tipo_doc" class="form-control">
      <option value="CC" selected>Cédula de Ciudadanía</option>
      <option value="TI">Tarjeta de Identidad</option>
      <option value="CE">Cédula de Extranjería</option>
      <option value="PA">Pasaporte</option>
    </select>
    
    <label for="documento">Número de Documento:</label>
    <input type="number" name="numDocumento" id="documento" required placeholder="Número">

    <label for="password">Contraseña:</label>
    <input type="password" name="clave" id="password" required>

    <button type="submit" class="btn btn-success btn-block" id="btn-submit-auth">
      Iniciar Sesión
    </button>
  </form>
</div>`,

  citas_reprogramar: `<section class="panel-citas-programadas">
  <h3>Mis Citas Médicas Asignadas</h3>
  <table class="table table-striped citas-list">
    <thead>
      <tr>
        <th>Especialidad</th>
        <th>Médico</th>
        <th>Fecha y Hora</th>
        <th>Acciones</th>
      </tr>
    </thead>
    <tbody>
      <tr data-cita-id="HUSI-CIT-89211">
        <td>Medicina General</td>
        <td>Dr. Carlos Restrepo</td>
        <td>2026-11-28 10:30 AM</td>
        <td>
          <!-- Botón de Reprogramar para adelantar agenda -->
          <button class="btn btn-warning btn-reprogramar" data-action="reprogramar">
            Reprogramar
          </button>
        </td>
      </tr>
    </tbody>
  </table>
</section>`,

  calendar_slots: `<div class="modal-agenda-disponible">
  <h4>Seleccionar Nuevo Horario Disponible</h4>
  <div class="slots-container">
    <button class="slot-item slot-available" data-slot-id="SLOT-001" data-date="2026-10-22" data-time="15:40">
      <span class="fecha">2026-10-22</span>
      <span class="hora">15:40 hrs</span>
      <span class="doctor">Dra. Marcela Gómez</span>
    </button>
    <button class="slot-item slot-available" data-slot-id="SLOT-002" data-date="2026-10-24" data-time="16:20">
      <span class="fecha">2026-10-24</span>
      <span class="hora">16:20 hrs</span>
      <span class="doctor">Dr. Carlos Restrepo</span>
    </button>
  </div>
  <button id="btn-confirm-reschedule" class="btn btn-primary">
    Confirmar Reprogramación
  </button>
</div>`,
};
