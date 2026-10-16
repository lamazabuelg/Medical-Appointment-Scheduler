import React, { useState } from "react";
import { ArrowRight, CheckCircle2, GitBranch, Shield, Zap, AlertCircle, Code, Layers } from "lucide-react";

export const AgentGraph: React.FC = () => {
  const [selectedNode, setSelectedNode] = useState<string>("validador");

  const nodes = [
    {
      id: "scraper",
      title: "1. Agente Scraper (Navegación)",
      tech: "Playwright Headless + Chromium",
      type: "Action / Tool Node",
      color: "blue",
      description:
        "Se conecta a agendatucita.husi.org.co/paciente, presiona 'Ingresar', ingresa tipo/número de documento y contraseña, abre 'Citas Programadas', hace clic en 'Reprogramar' y extrae el árbol DOM con las fechas y horarios disponibles.",
      inputs: ["doc_type", "doc_number", "password", "base_url"],
      outputs: ["cita_actual", "slots_disponibles (Array)"],
      codeSnippet: `async def node_scraper(state: HusiAgentState) -> HusiAgentState:
    scraper = HusiScraper(headless=True)
    await scraper.iniciar_navegador()
    await scraper.hacer_login(state["doc_type"], state["doc_number"], state["password"])
    state["cita_actual"] = await scraper.obtener_cita_actual()
    state["slots_disponibles"] = await scraper.buscar_slots_reprogramacion()
    await scraper.cerrar()
    return state`,
    },
    {
      id: "validador",
      title: "2. Agente Validador (Decisión)",
      tech: "Google GenAI SDK (gemini-3.8-flash)",
      type: "LLM Reasoning Node",
      color: "purple",
      description:
        "Toma la cita actual y los turnos extraídos. Realiza inferencia con Structured Outputs (Pydantic) verificando que el nuevo cupo sea más cercano en fecha, cumpla con la franja horaria solicitada (ej. tarde >= 12:00) y coincida con el especialista.",
      inputs: ["cita_actual", "slots_disponibles", "preferred_time", "max_date"],
      outputs: ["decision (CONFIRM_RESCHEDULE | KEEP_CURRENT)", "slot_seleccionado", "razon_decision"],
      codeSnippet: `def node_validador(state: HusiAgentState) -> HusiAgentState:
    validator = GeminiSlotValidator()
    res = validator.evaluar_candidatos(
        cita_actual=state["cita_actual"],
        slots_candidatos=state["slots_disponibles"],
        preferencia_horario=state["preferred_time"]
    )
    state["decision"] = res.decision
    state["slot_seleccionado"] = res.selected_slot
    state["razon_decision"] = res.reasoning
    return state`,
    },
    {
      id: "ejecutor",
      title: "3. Agente Ejecutor & Notificador",
      tech: "Playwright Click + SMTP / Telegram",
      type: "Execution & Alert Node",
      color: "emerald",
      description:
        "Si la bifurcación condicional aprueba la reprogramación, este nodo hace clic en el cupo exacto y en 'Confirmar Cambio'. Tras recibir el acuse de recibo de HUSI, dispara la notificación de alta prioridad al correo electrónico del paciente.",
      inputs: ["slot_seleccionado", "user_email", "telegram_chat_id"],
      outputs: ["reprogramado_exitoso: True", "notificacion_enviada: True"],
      codeSnippet: `async def node_ejecutor_notificador(state: HusiAgentState) -> HusiAgentState:
    scraper = HusiScraper(headless=True)
    await scraper.iniciar_navegador()
    await scraper.hacer_login(state["doc_type"], state["doc_number"], state["password"])
    exito = await scraper.confirmar_reprogramacion(state["slot_seleccionado"]["id"])
    if exito:
        NotificationManager().enviar_alerta_reprogramacion(
            nueva_cita=state["slot_seleccionado"],
            cita_anterior=state["cita_actual"]
        )
    return state`,
    },
  ];

  const activeNodeData = nodes.find((n) => n.id === selectedNode) || nodes[1];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bg-white p-5 rounded-xl border border-slate-200">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
            Arquitectura del Sistema
          </span>
          <span className="text-slate-300">·</span>
          <span className="text-xs text-slate-500 font-mono">
            LangGraph StateGraph & CrewAI
          </span>
        </div>
        <h2 className="text-lg font-bold text-slate-900">
          Grafo de Estados y Orquestación Multiagente
        </h2>
        <p className="text-xs text-slate-600 max-w-3xl mt-0.5">
          El flujo utiliza un grafo determinista con control estricto de reintentos y persistencia de sesión. Haz clic en cada nodo para inspeccionar sus entradas, salidas y lógica en Python.
        </p>
      </div>

      {/* Visual Graph Representation */}
      <div className="bg-slate-900 rounded-xl p-6 text-white border border-slate-800">
        <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-mono font-semibold">
              StateGraph(HusiAgentState) · Flujo de Ejecución Local
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Bifurcación Condicional: ¿Cumple criterios?
          </span>
        </div>

        {/* Nodes Flow Diagram */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
          {/* Node 1 */}
          <div
            onClick={() => setSelectedNode("scraper")}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              selectedNode === "scraper"
                ? "bg-blue-900/50 border-blue-400 ring-2 ring-blue-500/50"
                : "bg-slate-800/70 border-slate-700 hover:border-slate-500"
            }`}
          >
            <div className="text-[10px] font-mono text-blue-400 uppercase tracking-wider mb-1">
              Paso 1 · Tool Node
            </div>
            <div className="text-sm font-bold text-slate-100">Agente Scraper</div>
            <div className="text-xs text-slate-400 mt-1">Playwright Headless</div>
            <div className="mt-2 text-[10px] text-slate-400 bg-slate-950/60 p-1.5 rounded font-mono">
              Login HUSI ➔ Extrae Slots
            </div>
          </div>

          {/* Node 2 */}
          <div
            onClick={() => setSelectedNode("validador")}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              selectedNode === "validador"
                ? "bg-purple-900/50 border-purple-400 ring-2 ring-purple-500/50"
                : "bg-slate-800/70 border-slate-700 hover:border-slate-500"
            }`}
          >
            <div className="text-[10px] font-mono text-purple-400 uppercase tracking-wider mb-1">
              Paso 2 · Reasoning
            </div>
            <div className="text-sm font-bold text-slate-100">
              Agente Validador
            </div>
            <div className="text-xs text-purple-300 mt-1">
              Gemini 3.8 Flash SDK
            </div>
            <div className="mt-2 text-[10px] text-slate-400 bg-slate-950/60 p-1.5 rounded font-mono">
              Filtro Horario Tarde & Fecha
            </div>
          </div>

          {/* Conditional Edge */}
          <div className="p-3 rounded-lg border border-amber-500/40 bg-amber-950/30 text-amber-200 text-xs text-center">
            <div className="text-[10px] font-mono font-bold uppercase mb-1">
              Conditional Edge
            </div>
            <div className="font-semibold text-[11px]">
              ¿Adelanta fecha y es horario preferido?
            </div>
            <div className="flex items-center justify-center gap-3 mt-2 text-[10px] font-mono">
              <span className="text-emerald-400">SÍ ➔ Ejecutar</span>
              <span className="text-slate-400">NO ➔ END</span>
            </div>
          </div>

          {/* Node 3 */}
          <div
            onClick={() => setSelectedNode("ejecutor")}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              selectedNode === "ejecutor"
                ? "bg-emerald-900/50 border-emerald-400 ring-2 ring-emerald-500/50"
                : "bg-slate-800/70 border-slate-700 hover:border-slate-500"
            }`}
          >
            <div className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider mb-1">
              Paso 3 · Action
            </div>
            <div className="text-sm font-bold text-slate-100">
              Ejecutor & Alerta
            </div>
            <div className="text-xs text-emerald-300 mt-1">
              Confirmación + Email
            </div>
            <div className="mt-2 text-[10px] text-slate-400 bg-slate-950/60 p-1.5 rounded font-mono">
              Confirma en HUSI ➔ Alerta
            </div>
          </div>
        </div>
      </div>

      {/* Node Inspector Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-200 space-y-4">
          <div>
            <span className="text-[11px] font-mono font-semibold text-blue-700 uppercase">
              {activeNodeData.tech}
            </span>
            <h3 className="text-base font-bold text-slate-900 mt-0.5">
              {activeNodeData.title}
            </h3>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              {activeNodeData.description}
            </p>
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-200 text-xs">
            <div>
              <span className="font-semibold text-slate-700 block mb-1">
                Entradas del Estado (State Input):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {activeNodeData.inputs.map((inp) => (
                  <span
                    key={inp}
                    className="font-mono text-[11px] text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200"
                  >
                    {inp}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <span className="font-semibold text-slate-700 block mb-1">
                Salidas al Estado (State Mutation):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {activeNodeData.outputs.map((out) => (
                  <span
                    key={out}
                    className="font-mono text-[11px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200"
                  >
                    {out}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 bg-slate-900 p-5 rounded-xl border border-slate-800 text-slate-100">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
            <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
              <Code className="w-3.5 h-3.5 text-blue-400" />
              Implementación en Python (LangGraph Node)
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              asyncio & TypedDict
            </span>
          </div>
          <pre className="text-xs font-mono overflow-x-auto text-emerald-300 leading-relaxed p-2 bg-slate-950/70 rounded border border-slate-800">
            {activeNodeData.codeSnippet}
          </pre>
        </div>
      </div>

      {/* Comparison: LangGraph vs CrewAI */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-700" />
          Comparación de Orquestación para el Portal HUSI
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-lg bg-blue-50/50 border border-blue-200 space-y-1.5">
            <div className="font-bold text-blue-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-blue-700" />
              LangGraph (Opción Recomendada por Control)
            </div>
            <p className="text-slate-600 leading-relaxed">
              Ideal para flujos médicos donde no puedes permitirte acciones no deseadas. Proporciona bifurcación condicional estricta (no reprogramar si el cupo no es claramente mejor), manejo de estados duraderos y persistencia de cookies entre ejecuciones.
            </p>
          </div>
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-slate-700" />
              CrewAI (Opción por Roles de Equipo)
            </div>
            <p className="text-slate-600 leading-relaxed">
              Excelente si deseas estructurar agentes como personas (Investigador Scraper, Validador Clínico, Gestor de Citas) asignándoles herramientas de Playwright. Disponible en el archivo descargable <code className="font-mono text-slate-800">main_crewai.py</code>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
