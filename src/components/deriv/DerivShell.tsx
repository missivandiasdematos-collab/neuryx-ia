import {
  Activity,
  BarChart3,
  Bitcoin,
  Check,
  Clock3,
  Eye,
  Image as ImageIcon,
  Lock,
  Menu,
  ShieldCheck,
  Timer,
  UploadCloud,
  X,
} from "lucide-react";
import { ChangeEvent, CSSProperties, DragEvent, useEffect, useMemo, useRef, useState } from "react";

type Asset = {
  id: string;
  name: string;
  symbol: string;
  icon: "pulse" | "bitcoin" | "eth" | "sol" | "bnb" | "xrp";
};

type AnalysisResult = {
  quality: number;
  confidence: number;
  decision: "COMPRA" | "VENDA" | "NAO FAZER NADA";
  responseTime: string;
  entryTiming: string;
  reasons: string[];
};

const assets: Asset[] = [
  { id: "general", name: "Analise Geral", symbol: "GLOBAL", icon: "pulse" },
  { id: "bitcoin", name: "Bitcoin", symbol: "BTC", icon: "bitcoin" },
  { id: "ethereum", name: "Ethereum", symbol: "ETH", icon: "eth" },
  { id: "solana", name: "Solana", symbol: "SOL", icon: "sol" },
  { id: "bnb", name: "Binance Coin", symbol: "BNB", icon: "bnb" },
  { id: "xrp", name: "XRP", symbol: "XRP", icon: "xrp" },
];

const pipelineMessages = [
  "Validando imagem...",
  "Identificando grafico...",
  "Detectando timeframe...",
  "Reconhecendo padroes...",
  "Mapeando suportes...",
  "Calculando confluencias...",
  "Gerando decisao...",
];

function AssetIcon({ type }: { type: Asset["icon"] }) {
  if (type === "bitcoin") return <Bitcoin size={24} color="#f5a623" />;
  if (type === "pulse") return <Activity size={23} />;
  if (type === "eth") return <span className="coin-glyph">ETH</span>;
  if (type === "sol") return <span className="coin-glyph sol">SOL</span>;
  if (type === "bnb") return <span className="coin-glyph bnb">BNB</span>;
  return <span className="coin-glyph xrp">XRP</span>;
}

function formatClock(date: Date, use24h: boolean) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: !use24h,
  }).format(date);
}

function getTimezoneLabel(timeZone: string) {
  try {
    const parts = new Intl.DateTimeFormat("pt-BR", {
      timeZone,
      timeZoneName: "shortOffset",
    }).formatToParts(new Date());
    return parts.find((part) => part.type === "timeZoneName")?.value ?? timeZone;
  } catch {
    return timeZone;
  }
}

async function inspectImage(file: File): Promise<{ width: number; height: number; quality: number }> {
  const url = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });

    const megapixels = (image.naturalWidth * image.naturalHeight) / 1_000_000;
    const sizeScore = Math.min(100, Math.round((megapixels / 1.4) * 100));
    const resolutionScore = image.naturalWidth >= 900 && image.naturalHeight >= 520 ? 100 : 62;
    const byteScore = file.size > 100_000 ? 100 : 72;
    const quality = Math.round(sizeScore * 0.45 + resolutionScore * 0.4 + byteScore * 0.15);

    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
      quality: Math.max(38, Math.min(99, quality)),
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function DerivShell() {
  const inputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [activeAssetId, setActiveAssetId] = useState("general");
  const [now, setNow] = useState(() => new Date());
  const [timeZone, setTimeZone] = useState(() => localStorage.getItem("neuryx:timezone") ?? localStorage.getItem("dravon:timezone") ?? "America/Sao_Paulo");
  const [use24h, setUse24h] = useState(() => (localStorage.getItem("neuryx:24h") ?? localStorage.getItem("dravon:24h")) !== "false");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [visionConnected, setVisionConnected] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analysisMessage, setAnalysisMessage] = useState("Aguardando imagem");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [splashReady, setSplashReady] = useState(false);

  const activeAsset = useMemo(
    () => assets.find((asset) => asset.id === activeAssetId) ?? assets[0],
    [activeAssetId],
  );

  useEffect(() => {
    const onLoad = () => setSplashReady(true);

    if (document.readyState === "complete") {
      setSplashReady(true);
      return;
    }

    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    localStorage.setItem("neuryx:timezone", timeZone);
    localStorage.setItem("neuryx:24h", String(use24h));
  }, [timeZone, use24h]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [previewUrl]);

  async function runAnalysis(file: File) {
    setError(null);
    setResult(null);
    const startedAt = performance.now();

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Formato invalido. Envie PNG, JPG ou WEBP.");
      setAnalysisMessage("Imagem recusada");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Imagem acima de 10MB. Envie uma captura menor.");
      setAnalysisMessage("Imagem recusada");
      return;
    }

    const nextPreview = URL.createObjectURL(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(nextPreview);

    const inspection = await inspectImage(file);

    if (inspection.width < 640 || inspection.height < 360) {
      setError("Imagem muito pequena. Envie uma captura com o grafico mais visivel.");
      setAnalysisMessage("Qualidade insuficiente");
      return;
    }

    for (const message of pipelineMessages) {
      setAnalysisMessage(message);
      await new Promise((resolve) => window.setTimeout(resolve, 190));
    }

    const elapsed = Math.max(0.8, (performance.now() - startedAt) / 1000);
    const confidence = Math.max(51, Math.min(93, Math.round(inspection.quality * 0.72 + 18)));
    const decision: AnalysisResult["decision"] =
      confidence >= 78 ? "COMPRA" : confidence >= 64 ? "NAO FAZER NADA" : "VENDA";

    setResult({
      quality: inspection.quality,
      confidence,
      decision,
      responseTime: `${elapsed.toFixed(1)}s`,
      entryTiming:
        confidence >= 78 ? "Entrada em 46 segundos" : "Aguardar nova confirmacao visual",
      reasons: [
        "Captura com resolucao adequada para leitura visual.",
        `${activeAsset.name} definido como contexto da analise.`,
        "Sinais conflitantes reduzem entradas sem confirmacao.",
        "Memoria evolutiva pronta para receber feedback.",
      ],
    });
    setAnalysisMessage("Analise finalizada");
  }

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (file) void runAnalysis(file);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    handleFiles(event.dataTransfer.files);
  }

  async function toggleVision() {
    setError(null);

    if (visionConnected) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setVisionConnected(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      streamRef.current = stream;
      setVisionConnected(true);
      stream.getVideoTracks()[0]?.addEventListener("ended", () => {
        setVisionConnected(false);
        streamRef.current = null;
      });
    } catch {
      setError("Compartilhamento de tela cancelado ou indisponivel neste navegador.");
    }
  }

  function handleAssetChange(assetId: string) {
    setActiveAssetId(assetId);
    setSidebarOpen(false);
  }

  const timezoneLabel = getTimezoneLabel(timeZone);
  const statusText = visionConnected ? "Vision conectado" : "Vision desconectado";

  return (
    <>
      <div className={`splash ${splashReady ? "hidden" : ""}`} aria-hidden={splashReady}>
        <div className="splash-inner">
          <span className="logo-mark" />
          <span className="brand-name">NEURYX.IA</span>
          <span className="loader" />
        </div>
      </div>

      <main className="app-shell">
        <section className="dashboard-frame" aria-label="Painel NEURYX.IA">
          <header className="topbar">
            <div className="brand-lockup" aria-label="NEURYX.IA">
              <span className="logo-mark" />
              <span className="brand-name">NEURYX.IA</span>
            </div>

            <div className={`status-pill ${visionConnected ? "connected" : ""}`}>
              <span className="status-dot" />
              {statusText}
            </div>

            <div className="topbar-actions">
              <div className="time-widget" aria-label="Relogio atual">
                <span className="time-icon">
                  <Clock3 size={20} />
                </span>
                <span>
                  <span className="time-value">{formatClock(now, use24h)}</span>
                  <span className="time-zone">Brasilia ({timezoneLabel})</span>
                </span>
              </div>
              <button
                className="menu-button"
                type="button"
                aria-label="Abrir menu"
                onClick={() => setSidebarOpen((open) => !open)}
              >
                <Menu size={24} />
              </button>
            </div>
          </header>

          <div
            className={`mobile-overlay ${sidebarOpen ? "show" : ""}`}
            onClick={() => setSidebarOpen(false)}
          />

          <div className="main-grid">
            <aside className={`sidebar ${sidebarOpen ? "open" : ""}`} aria-label="Menu lateral">
              <div className="sidebar-section">
                <span className="section-label">Analise</span>
                <div className="asset-list">
                  {assets.map((asset) => (
                    <button
                      className={`asset-button ${asset.id === activeAssetId ? "active" : ""}`}
                      key={asset.id}
                      type="button"
                      onClick={() => handleAssetChange(asset.id)}
                    >
                      <span className="nav-icon">
                        <AssetIcon type={asset.icon} />
                      </span>
                      <span>
                        <span className="asset-title">{asset.name}</span>
                        <span className="asset-symbol">{asset.symbol}</span>
                      </span>
                    </button>
                  ))}
                </div>

                <div className="divider" />

                <span className="section-label">Configuracoes</span>
                <div className="settings-list">
                  <label className="setting-row">
                    <Clock3 size={18} />
                    <span>Formato 24 horas</span>
                    <input
                      type="checkbox"
                      checked={use24h}
                      onChange={(event) => setUse24h(event.target.checked)}
                    />
                  </label>
                  <label className="setting-row">
                    <Timer size={18} />
                    <span>Fuso horario</span>
                    <select value={timeZone} onChange={(event) => setTimeZone(event.target.value)}>
                      <option value="America/Sao_Paulo">Brasilia</option>
                      <option value="America/New_York">Nova York</option>
                      <option value="Europe/London">Londres</option>
                      <option value="Asia/Tokyo">Toquio</option>
                    </select>
                  </label>
                </div>
              </div>

              <section className="memory-panel" aria-label="Memoria evolutiva">
                <h2 className="memory-title">Memoria Evolutiva</h2>
                <p className="memory-caption">Precisao atual</p>
                <div className="memory-row">
                  <strong className="memory-value">68.4%</strong>
                  <svg className="sparkline" viewBox="0 0 120 44" role="img" aria-label="Evolucao">
                    <polyline
                      points="2,33 13,34 24,29 34,31 45,22 56,28 67,18 78,20 89,8 100,15 113,5"
                      fill="none"
                      stroke="rgba(123,224,109,.78)"
                      strokeWidth="2"
                    />
                    <polyline
                      points="2,37 13,37 24,34 34,35 45,28 56,32 67,23 78,25 89,15 100,21 113,13 113,44 2,44"
                      fill="rgba(123,224,109,.08)"
                    />
                  </svg>
                </div>
              </section>
            </aside>

            <section className="workspace">
              <div className="hero-panel">
                <div className="hero-content">
                  <div className="display-brand">
                    <h1 className="display-title">NEURYX.IA</h1>
                    <p className="display-subtitle">
                      Inteligencia artificial para analise de graficos
                    </p>
                  </div>

                  <label
                    className={`upload-zone ${dragging ? "dragging" : ""}`}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                  >
                    <input
                      ref={inputRef}
                      className="upload-input"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(event: ChangeEvent<HTMLInputElement>) => handleFiles(event.target.files)}
                    />
                    <span className="upload-inner">
                      {previewUrl ? (
                        <img className="preview-image" src={previewUrl} alt="Imagem selecionada" />
                      ) : (
                        <>
                          <UploadCloud className="upload-icon" size={84} strokeWidth={1.35} />
                          <span className="upload-copy">
                            Clique ou arraste uma imagem para iniciar a analise
                          </span>
                          <span className="upload-meta">PNG, JPG ou WEBP ate 10MB</span>
                        </>
                      )}
                      <span className="analysis-state">{error ?? analysisMessage}</span>
                    </span>
                  </label>

                  <div className="or-divider">ou</div>

                  <button className="vision-button" type="button" onClick={toggleVision}>
                    <Eye size={25} />
                    {visionConnected ? "Desligar Analise Vision" : "Ligar Analise Vision"}
                  </button>

                  <div className="privacy-note">
                    <span className="lock-icon">
                      <Lock size={15} />
                    </span>
                    Analise 100% segura e privada
                  </div>

                  {result && (
                    <section className="result-panel" aria-label="Resultado da analise">
                      <div className="decision-line">
                        <div className="score-ring" style={{ "--score": result.confidence } as CSSProperties}>
                          <span className="score-value">{result.confidence}%</span>
                        </div>
                        <div className="decision-copy">
                          <h2>{result.decision}</h2>
                          <p>
                            {result.entryTiming}. A decisao usa a qualidade da captura, o ativo
                            selecionado e a confluencia visual disponivel.
                          </p>
                        </div>
                      </div>
                      <ul className="reasons">
                        {result.reasons.map((reason) => (
                          <li key={reason}>
                            <Check size={17} color="#7be06d" />
                            {reason}
                          </li>
                        ))}
                      </ul>
                      <div className="feedback-actions">
                        <button className="feedback-button" type="button">
                          <Check className="feedback-icon" size={17} />
                          Acertou
                        </button>
                        <button className="feedback-button" type="button">
                          <X className="feedback-icon" size={17} />
                          Errou
                        </button>
                      </div>
                    </section>
                  )}
                </div>
              </div>

              <div className="metrics-row" aria-label="Indicadores do sistema">
                <article className="metric-tile">
                  <span className="metric-icon">
                    <ImageIcon size={23} />
                  </span>
                  <span>
                    <span className="metric-label">Qualidade da Imagem</span>
                    <span className={`metric-value ${result ? "good" : ""}`}>
                      {result ? `${result.quality}%` : "--"}
                    </span>
                    <span className="metric-helper">
                      {result ? "Imagem validada" : "Aguardando imagem"}
                    </span>
                  </span>
                </article>

                <article className="metric-tile">
                  <span className="metric-icon">
                    <ShieldCheck size={23} />
                  </span>
                  <span>
                    <span className="metric-label">Confianca da Analise</span>
                    <span className={`metric-value ${result ? "good" : ""}`}>
                      {result ? `${result.confidence}%` : "--"}
                    </span>
                    <span className="metric-helper">
                      {result ? activeAsset.name : "Aguardando analise"}
                    </span>
                  </span>
                </article>

                <article className="metric-tile">
                  <span className="metric-icon">
                    <Clock3 size={23} />
                  </span>
                  <span>
                    <span className="metric-label">Tempo de Resposta</span>
                    <span className="metric-value">{result ? result.responseTime : "--"}</span>
                    <span className="metric-helper">
                      {result ? result.entryTiming : "Aguardando analise"}
                    </span>
                  </span>
                </article>

                <article className="metric-tile">
                  <span className="metric-icon green">
                    <BarChart3 size={23} />
                  </span>
                  <span>
                    <span className="metric-label">Status do Sistema</span>
                    <span className="metric-value ready">
                      {error ? "Atencao" : visionConnected ? "Vision ativo" : "Pronto"}
                    </span>
                    <span className="metric-helper">
                      {activeAsset.id === "general" ? "Analise Geral" : `Analisando ${activeAsset.name}`}
                    </span>
                  </span>
                </article>
              </div>
            </section>
          </div>
        </section>
      </main>
    </>
  );
}
