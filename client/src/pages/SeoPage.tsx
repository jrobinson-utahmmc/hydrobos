import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search,
  Loader2,
  Globe,
  Smartphone,
  Monitor,
  BarChart3,
  Zap,
  Eye,
  Shield,
  TrendingUp,
  MessageSquare,
  Send,
  FileText,
  Image as ImageIcon,
  Link,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  ExternalLink,
  History,
  Sparkles,
  Bot,
  User,
  Copy,
  ArrowRight,
  Info,
  Key,
  Settings,
} from 'lucide-react';
import { seoApi, packageApi, integrationApi } from '../services/api';

type Tab = 'analyze' | 'ai' | 'content' | 'images' | 'domain';

// Map of which integration each tab needs
const TAB_INTEGRATION_REQUIREMENTS: Record<Tab, { integrationId: string; label: string; description: string }[]> = {
  analyze: [
    { integrationId: 'google-pagespeed', label: 'Google PageSpeed', description: 'Required for page analysis and Core Web Vitals scoring' },
  ],
  ai: [
    { integrationId: 'anthropic', label: 'Anthropic (Claude)', description: 'Required for AI-powered SEO chat and content analysis' },
  ],
  content: [
    { integrationId: 'anthropic', label: 'Anthropic (Claude)', description: 'Required for AI content generation' },
  ],
  images: [
    { integrationId: 'google-vision', label: 'Google Vision', description: 'Required for image analysis and alt-text suggestions' },
  ],
  domain: [
    { integrationId: 'ahrefs', label: 'Ahrefs', description: 'Required for domain intelligence, backlinks, and keyword data' },
  ],
};

interface IntegrationStatus {
  integrationId: string;
  name: string;
  enabled: boolean;
  hasKey: boolean;
}

// ── Integration Setup Banner ──
function SetupBanner({ integrations, activeTab }: { integrations: IntegrationStatus[]; activeTab: Tab }) {
  const required = TAB_INTEGRATION_REQUIREMENTS[activeTab];
  const missing = required.filter((r) => {
    const integration = integrations.find((i) => i.integrationId === r.integrationId);
    return !integration?.enabled || !integration?.hasKey;
  });

  if (missing.length === 0) return null;

  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <Key className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-amber-300">API Keys Required</p>
          <p className="text-xs text-amber-400/80 mt-1">
            This feature requires the following integrations to be configured:
          </p>
          <ul className="mt-2 space-y-1">
            {missing.map((m) => (
              <li key={m.integrationId} className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                <AlertCircle className="w-3 h-3 text-amber-400" />
                <span>
                  <strong className="text-[var(--text-primary)]">{m.label}</strong> — {m.description}
                </span>
              </li>
            ))}
          </ul>
          <a
            href="/packages"
            className="inline-flex items-center gap-1.5 mt-3 px-4 py-1.5 bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-medium rounded-lg hover:bg-amber-500/30 transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            Configure in Package Manager → API Integrations
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Overview of all integration statuses ──
function IntegrationOverview({ integrations }: { integrations: IntegrationStatus[] }) {
  const configured = integrations.filter((i) => i.enabled && i.hasKey).length;
  if (configured === integrations.length) return null;

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-[var(--text-secondary)]" />
          <span className="text-xs font-medium text-[var(--text-secondary)]">
            Integration Status — {configured}/{integrations.length} configured
          </span>
        </div>
        <a
          href="/packages"
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
        >
          Manage <ExternalLink className="w-3 h-3" />
        </a>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {integrations.map((i) => (
          <div
            key={i.integrationId}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${
              i.enabled && i.hasKey
                ? 'bg-green-500/10 border-green-500/30 text-green-400'
                : 'bg-[var(--bg-primary)] border-[var(--border)] text-[var(--text-secondary)]'
            }`}
          >
            {i.enabled && i.hasKey ? (
              <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-amber-400" />
            )}
            <span className="truncate">{i.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Score Ring Component ──
function ScoreRing({ score, label, size = 80 }: { score: number; label: string; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color =
    score >= 90 ? 'text-green-500' : score >= 50 ? 'text-yellow-500' : 'text-red-500';

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={4}
            className="text-[var(--border)]"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={color}
          />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center text-lg font-bold ${color}`}>
          {score}
        </span>
      </div>
      <span className="text-xs text-[var(--text-secondary)] font-medium">{label}</span>
    </div>
  );
}

// ── Analyze Tab ──
function AnalyzeTab({ integrations }: { integrations: IntegrationStatus[] }) {
  const [url, setUrl] = useState('');
  const [strategy, setStrategy] = useState<'mobile' | 'desktop'>('mobile');
  const [includeAi, setIncludeAi] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const pagespeed = integrations.find((i) => i.integrationId === 'google-pagespeed');
  const isConfigured = pagespeed?.enabled && pagespeed?.hasKey;

  useEffect(() => {
    loadHistory();
    loadLast();
  }, []);

  const loadHistory = async () => {
    try {
      const res = await seoApi.analysisHistory({ limit: 10 });
      setHistory(res.data || []);
    } catch { /* empty history is fine */ }
  };

  const loadLast = async () => {
    try {
      const res = await seoApi.lastAnalysis();
      if (res.data) {
        setResult(res.data);
        if (res.data.url) setUrl(res.data.url);
      }
    } catch { /* no previous analysis is fine */ }
  };

  const runAnalysis = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await seoApi.analyze({ url: url.trim(), strategy, includeAiInsights: includeAi });
      setResult(res.data);
      loadHistory();
    } catch (err: any) {
      setError(err.message || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const scores = result?.scores || result?.analysis?.scores;
  const recommendations = result?.recommendations || result?.analysis?.recommendations || [];
  const aiInsights = result?.aiInsights || result?.analysis?.aiInsights;

  return (
    <div className="space-y-6">
      {/* URL Input */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runAnalysis()}
              placeholder="Enter URL to analyze (e.g. https://example.com)"
              className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <div className="flex bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg overflow-hidden">
              <button
                onClick={() => setStrategy('mobile')}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
                  strategy === 'mobile'
                    ? 'bg-gradient-to-r from-slate-800 to-blue-900 text-white'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                Mobile
              </button>
              <button
                onClick={() => setStrategy('desktop')}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
                  strategy === 'desktop'
                    ? 'bg-gradient-to-r from-slate-800 to-blue-900 text-white'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                Desktop
              </button>
            </div>
            <label className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-xs font-medium text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)] transition-colors">
              <input
                type="checkbox"
                checked={includeAi}
                onChange={(e) => setIncludeAi(e.target.checked)}
                className="rounded border-[var(--border)]"
              />
              <Sparkles className="w-3.5 h-3.5" />
              AI
            </label>
            <button
              onClick={runAnalysis}
              disabled={loading || !url.trim()}
              className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-slate-800 to-blue-900 text-white text-sm font-medium rounded-lg hover:shadow-lg hover:shadow-blue-900/25 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Analyze
            </button>
          </div>
        </div>
        {/* History toggle */}
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="mt-3 flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <History className="w-3.5 h-3.5" />
          Recent analyses ({history.length})
          <ChevronRight className={`w-3 h-3 transition-transform ${showHistory ? 'rotate-90' : ''}`} />
        </button>
        {showHistory && history.length > 0 && (
          <div className="mt-2 space-y-1">
            {history.map((item: any, i: number) => (
              <button
                key={i}
                onClick={() => { setUrl(item.url); setResult(item); setShowHistory(false); }}
                className="w-full flex items-center justify-between px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-xs hover:bg-[var(--bg-tertiary)] transition-colors"
              >
                <span className="text-[var(--text-primary)] truncate">{item.url}</span>
                <span className="text-[var(--text-secondary)] flex-shrink-0 ml-2">
                  Score: {item.overallScore ?? item.scores?.seo ?? '—'} · {item.strategy} · {new Date(item.createdAt || item.analyzedAt).toLocaleDateString()}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-sm text-[var(--text-secondary)]">Running PageSpeed analysis...</p>
        </div>
      )}

      {/* Empty State */}
      {!result && !loading && !error && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-[var(--text-secondary)]">
          <Search className="w-12 h-12 opacity-20" />
          {isConfigured ? (
            <>
              <p className="text-sm font-medium text-[var(--text-primary)]">No analyses yet</p>
              <p className="text-xs text-center max-w-sm">
                Enter a URL above and click Analyze to run a PageSpeed audit. Results are saved to your history for 90 days.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-amber-300">Google PageSpeed API key required</p>
              <p className="text-xs text-center max-w-sm">
                To analyze pages, configure your Google PageSpeed API key in Package Manager → API Integrations.
                You can get a free key from the{' '}
                <a href="https://developers.google.com/speed/docs/insights/v5/get-started" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">
                  Google PageSpeed Insights API
                </a>.
              </p>
              <a
                href="/packages"
                className="flex items-center gap-1.5 mt-2 px-4 py-2 bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-medium rounded-lg hover:bg-amber-500/30 transition-colors"
              >
                <Settings className="w-3.5 h-3.5" />
                Configure API Keys
              </a>
            </>
          )}
        </div>
      )}

      {/* Results */}
      {scores && !loading && (
        <div className="space-y-6">
          {/* Score Cards */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Core Web Vitals</h3>
            <div className="flex flex-wrap justify-center gap-8">
              <ScoreRing score={scores.performance ?? 0} label="Performance" />
              <ScoreRing score={scores.accessibility ?? 0} label="Accessibility" />
              <ScoreRing score={scores.bestPractices ?? scores['best-practices'] ?? 0} label="Best Practices" />
              <ScoreRing score={scores.seo ?? 0} label="SEO" />
            </div>
          </div>

          {/* AI Insights */}
          {aiInsights && (
            <div className="bg-[var(--bg-secondary)] border border-blue-500/30 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-400" />
                AI Insights
              </h3>
              <div className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">
                {typeof aiInsights === 'string' ? aiInsights : JSON.stringify(aiInsights, null, 2)}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
                Recommendations ({recommendations.length})
              </h3>
              <div className="space-y-2">
                {recommendations.slice(0, 20).map((rec: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg"
                  >
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                      rec.impact === 'high' ? 'bg-red-500' : rec.impact === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                    }`} />
                    <div>
                      <p className="text-sm text-[var(--text-primary)] font-medium">{rec.title || rec.message || rec}</p>
                      {rec.description && (
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">{rec.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── AI Chat Tab ──
function AiTab({ integrations }: { integrations: IntegrationStatus[] }) {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const anthropic = integrations.find((i) => i.integrationId === 'anthropic');
  const isConfigured = anthropic?.enabled && anthropic?.hasKey;

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(scrollToBottom, [messages, scrollToBottom]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: msg }]);
    setLoading(true);
    try {
      const res = await seoApi.aiChat(msg, messages.length > 0 ? { previousMessages: messages.slice(-6) } : undefined);
      const reply = res.data?.response || res.data?.message || res.data?.content || JSON.stringify(res.data);
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (err: any) {
      setMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-280px)] bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl overflow-hidden">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-[var(--text-secondary)]">
            <Bot className="w-12 h-12 opacity-30" />
            <p className="text-sm font-medium">SEO AI Assistant</p>
            {isConfigured ? (
              <>
                <p className="text-xs text-center max-w-sm">
                  Ask questions about SEO strategy, content optimization, technical SEO, keyword research, and more.
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {['Improve my page speed', 'Write meta tags for a blog', 'Explain Core Web Vitals', 'Keyword strategy tips'].map((q) => (
                    <button
                      key={q}
                      onClick={() => { setInput(q); textareaRef.current?.focus(); }}
                      className="px-3 py-1.5 text-xs bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <p className="text-xs text-center max-w-sm text-amber-300">
                  Anthropic (Claude) API key required to use the AI assistant.
                </p>
                <a
                  href="/packages"
                  className="flex items-center gap-1.5 mt-2 px-4 py-2 bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-medium rounded-lg hover:bg-amber-500/30 transition-colors"
                >
                  <Settings className="w-3.5 h-3.5" />
                  Configure API Keys
                </a>
              </>
            )}
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-slate-800 to-blue-900 text-white'
                  : 'bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)]'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
              {msg.role === 'assistant' && (
                <button
                  onClick={() => copyToClipboard(msg.content)}
                  className="mt-2 flex items-center gap-1 text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <Copy className="w-3 h-3" /> Copy
                </button>
              )}
            </div>
            {msg.role === 'user' && (
              <div className="w-7 h-7 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)] flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-[var(--text-secondary)]" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl px-4 py-3">
              <Loader2 className="w-4 h-4 animate-spin text-[var(--text-secondary)]" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[var(--border)] p-3">
        <div className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about SEO..."
            rows={1}
            className="flex-1 px-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-sm resize-none"
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-slate-800 to-blue-900 text-white rounded-lg hover:shadow-lg hover:shadow-blue-900/25 transition-all disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Content Tab ──
function ContentTab({ integrations }: { integrations: IntegrationStatus[] }) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [items, setItems] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const anthropic = integrations.find((i) => i.integrationId === 'anthropic');
  const isConfigured = anthropic?.enabled && anthropic?.hasKey;

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const res = await seoApi.contentTemplates();
      setTemplates(res.data || []);
      if (res.data?.length > 0) setSelectedTemplate(res.data[0].id || res.data[0].templateId || '');
    } catch { /* ignore */ }
  };

  const generate = async () => {
    if (!selectedTemplate || !items.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const parsedItems = items.split('\n').filter(Boolean).map((line) => {
        try { return JSON.parse(line); } catch { return { title: line.trim() }; }
      });
      const res = await seoApi.generateContent({ templateId: selectedTemplate, items: parsedItems });
      setResult(res.data);
    } catch (err: any) {
      setError(err.message || 'Content generation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {!isConfigured && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-[var(--text-secondary)]">
          <FileText className="w-12 h-12 opacity-20" />
          <p className="text-sm font-medium text-amber-300">Anthropic API key required</p>
          <p className="text-xs text-center max-w-sm">
            Content generation uses Claude AI. Configure your Anthropic API key in Package Manager → API Integrations.
          </p>
          <a
            href="/packages"
            className="flex items-center gap-1.5 mt-2 px-4 py-2 bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-medium rounded-lg hover:bg-amber-500/30 transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            Configure API Keys
          </a>
        </div>
      )}
      {isConfigured && (
      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Generate SEO Content</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Template</label>
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              {templates.length === 0 && <option value="">No templates available</option>}
              {templates.map((t: any) => (
                <option key={t.id || t.templateId} value={t.id || t.templateId}>
                  {t.name || t.title || t.id || t.templateId}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Items (one per line — page title or JSON object)
            </label>
            <textarea
              value={items}
              onChange={(e) => setItems(e.target.value)}
              placeholder={"Homepage\nAbout Us\nContact\n\nor JSON:\n{\"title\": \"Blog Post\", \"keywords\": [\"seo\", \"tips\"]}"}
              rows={6}
              className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-blue-500/40 font-mono resize-none"
            />
          </div>
          <button
            onClick={generate}
            disabled={loading || !selectedTemplate || !items.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-slate-800 to-blue-900 text-white text-sm font-medium rounded-lg hover:shadow-lg hover:shadow-blue-900/25 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Generate Content
          </button>
        </div>
      </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {result && (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Generated Content</h3>
          <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg p-4 text-sm text-[var(--text-primary)] whitespace-pre-wrap font-mono leading-relaxed max-h-96 overflow-y-auto">
            {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Images Tab ──
function ImagesTab({ integrations }: { integrations: IntegrationStatus[] }) {
  const [images, setImages] = useState<any[]>([]);
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const vision = integrations.find((i) => i.integrationId === 'google-vision');
  const isConfigured = vision?.enabled && vision?.hasKey;

  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async () => {
    setLoading(true);
    try {
      const res = await seoApi.listImages();
      setImages(res.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const analyzeImage = async () => {
    if (!imageUrl.trim()) return;
    setAnalyzing(true);
    setError('');
    setResult(null);
    try {
      const res = await seoApi.analyzeImage(imageUrl.trim());
      setResult(res.data);
    } catch (err: any) {
      setError(err.message || 'Image analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      {!isConfigured && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-[var(--text-secondary)]">
          <ImageIcon className="w-12 h-12 opacity-20" />
          <p className="text-sm font-medium text-amber-300">Google Vision API key required</p>
          <p className="text-xs text-center max-w-sm">
            Image analysis uses Google Cloud Vision. Configure your API key in Package Manager → API Integrations.
          </p>
          <a
            href="/packages"
            className="flex items-center gap-1.5 mt-2 px-4 py-2 bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-medium rounded-lg hover:bg-amber-500/30 transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            Configure API Keys
          </a>
        </div>
      )}
      {isConfigured && (
      <>
      {/* Analyze Single Image */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Analyze Image</h3>
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && analyzeImage()}
              placeholder="Enter image URL to analyze"
              className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-sm"
            />
          </div>
          <button
            onClick={analyzeImage}
            disabled={analyzing || !imageUrl.trim()}
            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-slate-800 to-blue-900 text-white text-sm font-medium rounded-lg hover:shadow-lg hover:shadow-blue-900/25 transition-all disabled:opacity-50"
          >
            {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
            Analyze
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {result && (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Analysis Result</h3>
          <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg p-4 text-sm text-[var(--text-primary)] whitespace-pre-wrap font-mono max-h-96 overflow-y-auto">
            {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
          </div>
        </div>
      )}

      {/* Image List */}
      {images.length > 0 && (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Project Images ({images.length})
            </h3>
            <a
              href={seoApi.exportImagesCsv()}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Export CSV
            </a>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {images.slice(0, 12).map((img: any, i: number) => (
              <div key={i} className="p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-xs">
                <p className="text-[var(--text-primary)] truncate font-medium">{img.name || img.path || img.src}</p>
                {img.alt && <p className="text-[var(--text-secondary)] truncate mt-0.5">Alt: {img.alt}</p>}
                {img.size && <p className="text-[var(--text-secondary)] mt-0.5">{(img.size / 1024).toFixed(1)} KB</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--text-secondary)]" />
        </div>
      )}
      </>
      )}
    </div>
  );
}

// ── Domain Intelligence Tab (Ahrefs) ──
function DomainTab({ integrations }: { integrations: IntegrationStatus[] }) {
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState<'overview' | 'backlinks' | 'keywords' | 'competitors'>('overview');

  const ahrefs = integrations.find((i) => i.integrationId === 'ahrefs');
  const isConfigured = ahrefs?.enabled && ahrefs?.hasKey;

  const loadReport = async () => {
    if (!domain.trim()) return;
    setLoading(true);
    setError('');
    setReport(null);
    try {
      const res = await seoApi.ahrefsFullReport(domain.trim());
      setReport(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load domain report');
    } finally {
      setLoading(false);
    }
  };

  const overview = report?.overview || report?.domainOverview;
  const backlinks = report?.backlinks || [];
  const keywords = report?.keywords || report?.organicKeywords || [];
  const competitors = report?.competitors || [];

  return (
    <div className="space-y-6">
      {!isConfigured && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-[var(--text-secondary)]">
          <BarChart3 className="w-12 h-12 opacity-20" />
          <p className="text-sm font-medium text-amber-300">Ahrefs API key required</p>
          <p className="text-xs text-center max-w-sm">
            Domain intelligence uses the Ahrefs API for backlinks, keywords, and competitor data.
            Configure your API key in Package Manager → API Integrations.
          </p>
          <a
            href="/packages"
            className="flex items-center gap-1.5 mt-2 px-4 py-2 bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-medium rounded-lg hover:bg-amber-500/30 transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            Configure API Keys
          </a>
        </div>
      )}
      {isConfigured && (
      <>
      {/* Domain Input */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Domain Intelligence</h3>
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadReport()}
              placeholder="Enter domain (e.g. example.com)"
              className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-sm"
            />
          </div>
          <button
            onClick={loadReport}
            disabled={loading || !domain.trim()}
            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-slate-800 to-blue-900 text-white text-sm font-medium rounded-lg hover:shadow-lg hover:shadow-blue-900/25 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4" />}
            Analyze Domain
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-sm text-[var(--text-secondary)]">Fetching domain data from Ahrefs...</p>
        </div>
      )}

      {report && !loading && (
        <div className="space-y-4">
          {/* Section tabs */}
          <div className="flex gap-1 p-1 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl w-fit">
            {[
              { id: 'overview' as const, label: 'Overview', icon: BarChart3 },
              { id: 'backlinks' as const, label: 'Backlinks', icon: Link },
              { id: 'keywords' as const, label: 'Keywords', icon: Search },
              { id: 'competitors' as const, label: 'Competitors', icon: TrendingUp },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  activeSection === s.id
                    ? 'bg-gradient-to-r from-slate-800 to-blue-900 text-white shadow-md'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <s.icon className="w-3.5 h-3.5" />
                {s.label}
              </button>
            ))}
          </div>

          {/* Overview */}
          {activeSection === 'overview' && overview && (
            <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Domain Overview</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(overview).map(([key, val]) => (
                  <div key={key} className="p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg">
                    <p className="text-xs text-[var(--text-secondary)] capitalize">{key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}</p>
                    <p className="text-lg font-semibold text-[var(--text-primary)] mt-1">
                      {typeof val === 'number' ? val.toLocaleString() : String(val)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Backlinks */}
          {activeSection === 'backlinks' && (
            <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
                Backlinks {Array.isArray(backlinks) && `(${backlinks.length})`}
              </h3>
              {Array.isArray(backlinks) && backlinks.length > 0 ? (
                <div className="space-y-2">
                  {backlinks.slice(0, 20).map((bl: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-sm">
                      <div className="truncate flex-1">
                        <p className="text-[var(--text-primary)] truncate">{bl.urlFrom || bl.source || bl.url}</p>
                        <p className="text-xs text-[var(--text-secondary)]">{bl.anchor || ''}</p>
                      </div>
                      {(bl.domainRating || bl.dr) && (
                        <span className="text-xs font-medium text-blue-400 flex-shrink-0 ml-2">
                          DR: {bl.domainRating || bl.dr}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--text-secondary)]">No backlink data available</p>
              )}
            </div>
          )}

          {/* Keywords */}
          {activeSection === 'keywords' && (
            <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
                Organic Keywords {Array.isArray(keywords) && `(${keywords.length})`}
              </h3>
              {Array.isArray(keywords) && keywords.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[var(--text-secondary)] text-xs border-b border-[var(--border)]">
                        <th className="pb-2 pr-4">Keyword</th>
                        <th className="pb-2 pr-4">Position</th>
                        <th className="pb-2 pr-4">Volume</th>
                        <th className="pb-2">Traffic</th>
                      </tr>
                    </thead>
                    <tbody>
                      {keywords.slice(0, 20).map((kw: any, i: number) => (
                        <tr key={i} className="border-b border-[var(--border)] last:border-0">
                          <td className="py-2 pr-4 text-[var(--text-primary)]">{kw.keyword}</td>
                          <td className="py-2 pr-4 text-[var(--text-secondary)]">{kw.position}</td>
                          <td className="py-2 pr-4 text-[var(--text-secondary)]">{kw.volume?.toLocaleString()}</td>
                          <td className="py-2 text-[var(--text-secondary)]">{kw.traffic?.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-[var(--text-secondary)]">No keyword data available</p>
              )}
            </div>
          )}

          {/* Competitors */}
          {activeSection === 'competitors' && (
            <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
                Competitors {Array.isArray(competitors) && `(${competitors.length})`}
              </h3>
              {Array.isArray(competitors) && competitors.length > 0 ? (
                <div className="space-y-2">
                  {competitors.map((c: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-sm">
                      <span className="text-[var(--text-primary)]">{c.domain}</span>
                      <div className="flex gap-4 text-xs text-[var(--text-secondary)]">
                        {c.commonKeywords && <span>Common: {c.commonKeywords}</span>}
                        {c.organicTraffic && <span>Traffic: {c.organicTraffic.toLocaleString()}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--text-secondary)]">No competitor data available</p>
              )}
            </div>
          )}
        </div>
      )}
      </>
      )}
    </div>
  );
}

// ── Main SEO Page ──
export function SeoPage() {
  const [activeTab, setActiveTab] = useState<Tab>('analyze');
  const [installed, setInstalled] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);

  useEffect(() => {
    checkInstallation();
    loadIntegrations();
  }, []);

  const checkInstallation = async () => {
    try {
      const res = await packageApi.installations();
      const seoInstalled = res.data?.some(
        (inst: any) => inst.packageId === 'seo-optimizer' && inst.status === 'active'
      );
      setInstalled(seoInstalled);
    } catch {
      setInstalled(false);
    }
    setChecking(false);
  };

  const loadIntegrations = async () => {
    try {
      const res = await integrationApi.list();
      const mapped: IntegrationStatus[] = (res.data || []).map((i: any) => ({
        integrationId: i.integrationId,
        name: i.name,
        enabled: !!i.enabled,
        hasKey: !!i.config?.apiKey,
      }));
      setIntegrations(mapped);
    } catch { /* will show unconfigured state */ }
  };

  const tabs = [
    { id: 'analyze' as Tab, label: 'Page Analysis', icon: Search },
    { id: 'ai' as Tab, label: 'AI Assistant', icon: MessageSquare },
    { id: 'content' as Tab, label: 'Content', icon: FileText },
    { id: 'images' as Tab, label: 'Images', icon: ImageIcon },
    { id: 'domain' as Tab, label: 'Domain Intel', icon: BarChart3 },
  ];

  if (checking) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--text-secondary)]" />
      </div>
    );
  }

  if (!installed) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4 animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/30 flex items-center justify-center">
          <Search className="w-8 h-8 text-blue-400" />
        </div>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">SEO Optimizer Not Installed</h2>
        <p className="text-sm text-[var(--text-secondary)] text-center max-w-md">
          The SEO Optimizer package needs to be installed and activated before you can use it.
          Go to the Package Manager to install it.
        </p>
        <a
          href="/packages"
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-slate-800 to-blue-900 text-white text-sm font-medium rounded-lg hover:shadow-lg hover:shadow-blue-900/25 transition-all"
        >
          Go to Package Manager
          <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">SEO Optimizer</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Analyze pages, generate content, chat with AI, and research domains.
        </p>
      </div>

      {/* Integration Overview */}
      <IntegrationOverview integrations={integrations} />

      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl w-fit">
        {tabs.map((tab) => {
          const required = TAB_INTEGRATION_REQUIREMENTS[tab.id];
          const allConfigured = required.every((r) => {
            const integration = integrations.find((i) => i.integrationId === r.integrationId);
            return integration?.enabled && integration?.hasKey;
          });
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-slate-800 to-blue-900 text-white shadow-md shadow-slate-900/25'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {!allConfigured && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="API key not configured" />
              )}
            </button>
          );
        })}
      </div>

      {/* Setup Banner for Active Tab */}
      <SetupBanner integrations={integrations} activeTab={activeTab} />

      {/* Tab Content */}
      {activeTab === 'analyze' && <AnalyzeTab integrations={integrations} />}
      {activeTab === 'ai' && <AiTab integrations={integrations} />}
      {activeTab === 'content' && <ContentTab integrations={integrations} />}
      {activeTab === 'images' && <ImagesTab integrations={integrations} />}
      {activeTab === 'domain' && <DomainTab integrations={integrations} />}
    </div>
  );
}
