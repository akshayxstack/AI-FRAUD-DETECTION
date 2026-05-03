import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Bot, FileUp, Send, Sparkles, UploadCloud } from 'lucide-react';
import { useData } from '../DataContext';
import { sendChatMessage, uploadDocument, parseTextDocument } from '../api';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Textarea } from './ui/textarea';

type ChatEntry = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  highlights?: string[];
  nextSteps?: string[];
};

export function ChatPanel() {
  const { analysis, refresh } = useData();
  const [messages, setMessages] = useState<ChatEntry[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Upload a file or ask a question. I will summarize risk, suspicious patterns, and next steps.',
    },
  ]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const quickStats = useMemo(() => {
    if (!analysis) {
      return [];
    }

    return [
      `Risk score ${analysis.riskScore}`,
      `${analysis.suspiciousTransactions.length} suspicious items`,
      `${analysis.patterns.length} detected patterns`,
    ];
  }, [analysis]);

  const pushMessage = (entry: ChatEntry) => {
    setMessages((current) => [...current, entry]);
  };

  const handleSubmit = async () => {
    const trimmed = message.trim();

    if (!trimmed || busy) {
      return;
    }

    // Detect if the user pasted a CSV-like transaction (headers + row) or single-line transaction data
    // Match: newlines, common field names, comma-separated with >3 fields, or tab/space-separated with >10 fields
    const hasNewlines = /\n/.test(trimmed);
    const hasFieldNames = /Transaction_ID|Transaction_Type|Transaction Amount|Transaction_Amount|Merchant|Customer_ID|Date|amount|fraud/i.test(trimmed);
    const isCommaSeparated = trimmed.split(',').length > 3 && /\d/.test(trimmed);
    const tabCount = (trimmed.match(/\t/g) || []).length;
    const isTabOrSpaceSeparated = (tabCount > 5 || (trimmed.split(/\s+/).length > 15 && /T\d+|\d{2}-\d{2}-\d{4}/.test(trimmed)));
    const looksLikeTable = hasNewlines || hasFieldNames || isCommaSeparated || isTabOrSpaceSeparated;

    if (looksLikeTable) {
      pushMessage({ id: crypto.randomUUID(), role: 'user', content: trimmed });
      setMessage('');
      setBusy(true);

      try {
        const uploadResp = await parseTextDocument(trimmed);

        if (!uploadResp.success) {
          pushMessage({ id: crypto.randomUUID(), role: 'assistant', content: uploadResp.message || 'Failed to parse transaction text.' });
          return;
        }

        await refresh();

        const single = uploadResp.analysis?.singleTransaction;
        const summary = uploadResp.analysis?.summary || 'Transaction parsed successfully.';
        const reasons = single?.reasons?.length
          ? single.reasons
          : uploadResp.analysis?.suspiciousTransactions?.[0]?.reason
            ? [uploadResp.analysis.suspiciousTransactions[0].reason]
            : uploadResp.analysis?.patterns?.slice(0, 3) || [];

        pushMessage({
          id: crypto.randomUUID(),
          role: 'assistant',
          content: single
            ? `Single transaction evaluated. Amount: ${single.amount}. Fraud probability: ${Math.round((single.fraudProbability ?? 0) * 100)}%. Risk level: ${single.riskLevel}.\n\n${summary}`
            : summary,
          highlights: reasons,
          nextSteps: uploadResp.analysis?.recommendation ? [uploadResp.analysis.recommendation] : undefined,
        });
      } catch (error) {
        pushMessage({ id: crypto.randomUUID(), role: 'assistant', content: error instanceof Error ? error.message : 'Parsing failed.' });
      } finally {
        setBusy(false);
      }

      return;
    }

    pushMessage({ id: crypto.randomUUID(), role: 'user', content: trimmed });
    setMessage('');
    setBusy(true);

    try {
      const response = await sendChatMessage(trimmed);

      if (!response.success || !response.reply) {
        pushMessage({
          id: crypto.randomUUID(),
          role: 'assistant',
          content: response.message || 'Chat response failed.',
        });
      } else {
        pushMessage({
          id: crypto.randomUUID(),
          role: 'assistant',
          content: response.reply.reply,
          highlights: response.reply.highlights,
          nextSteps: response.reply.nextSteps,
        });
      }
    } catch (error) {
      pushMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: error instanceof Error ? error.message : 'Chat request failed.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);

    pushMessage({
      id: crypto.randomUUID(),
      role: 'user',
      content: `Uploaded file: ${file.name}`,
    });

    try {
      const uploadResponse = await uploadDocument(file);

      if (!uploadResponse.success) {
        pushMessage({
          id: crypto.randomUUID(),
          role: 'assistant',
          content: uploadResponse.message || 'Upload failed.',
        });
        return;
      }

      await refresh();

      const latestResponse = await sendChatMessage('Summarize the latest uploaded file, explain the key fraud patterns, and list immediate next steps.');

      if (latestResponse.success && latestResponse.reply) {
        pushMessage({
          id: crypto.randomUUID(),
          role: 'assistant',
          content: latestResponse.reply.reply,
          highlights: latestResponse.reply.highlights,
          nextSteps: latestResponse.reply.nextSteps,
        });
      } else {
        pushMessage({
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'File uploaded and analysis refreshed successfully.',
        });
      }
    } catch (error) {
      pushMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: error instanceof Error ? error.message : 'Upload failed.',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await handleFileUpload(file);
    }
  };

  return (
    <Card className="border-white/10 bg-[#121821]/95 shadow-2xl shadow-sky-950/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg text-white">
          <Bot className="h-5 w-5 text-cyan-300" />
          AI Investigator
        </CardTitle>
        <CardDescription className="text-slate-400">
          Ask about risk, suspicious patterns, account behavior, or upload a new file directly in chat.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {quickStats.map((stat) => (
            <Badge key={stat} variant="outline" className="border-sky-500/20 bg-sky-500/10 text-sky-100">
              {stat}
            </Badge>
          ))}
        </div>

        <ScrollArea className="h-105 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
          <div className="space-y-4 pr-3">
            {messages.map((entry) => (
              <div
                key={entry.id}
                className={`rounded-2xl border px-4 py-3 transition ${
                  entry.role === 'user'
                    ? 'ml-auto max-w-[85%] border-sky-500/20 bg-sky-500/10 text-sky-50'
                    : 'max-w-[92%] border-white/10 bg-white/5 text-slate-100'
                }`}
              >
                <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-400">
                  {entry.role === 'user' ? 'User' : 'AI'}
                  {entry.role === 'assistant' ? <Sparkles className="h-3 w-3 text-cyan-300" /> : null}
                </div>
                <p className="whitespace-pre-line text-sm leading-6">{entry.content}</p>
                {entry.highlights?.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {entry.highlights.map((highlight) => (
                      <Badge key={highlight} variant="outline" className="border-cyan-400/20 bg-cyan-500/10 text-cyan-50">
                        {highlight}
                      </Badge>
                    ))}
                  </div>
                ) : null}
                {entry.nextSteps?.length ? (
                  <ul className="mt-3 space-y-1 text-xs text-slate-300">
                    {entry.nextSteps.map((step) => (
                      <li key={step}>• {step}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <FileUp className="h-4 w-4 text-cyan-300" />
            Upload directly in chat
          </div>
          <div className="flex flex-wrap gap-3">
            <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls,.pdf" onChange={onFileChange} className="hidden" />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || busy}
              className="border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
            >
              <UploadCloud className="mr-2 h-4 w-4" />
              {uploading ? 'Uploading...' : 'Upload file'}
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={busy || uploading || !message.trim()}
              className="bg-cyan-400 text-slate-950 hover:bg-cyan-300"
            >
              <Send className="mr-2 h-4 w-4" />
              {busy ? 'Analyzing...' : 'Send'}
            </Button>
            <Button
              type="button"
              onClick={() => setMessages([
                {
                  id: 'welcome',
                  role: 'assistant',
                  content:
                    'Upload a file or ask a question. I will summarize risk, suspicious patterns, and next steps.',
                },
              ])}
              variant="outline"
              className="border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
            >
              Clear chat
            </Button>
          </div>
          <Textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Ask about the suspicious transactions, top risks, or what action to take next..."
            className="min-h-27.5 border-white/10 bg-slate-950/70 text-slate-100 placeholder:text-slate-500"
          />
          {analysis ? (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-100">
              Latest summary: {analysis.summary}
            </div>
          ) : (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-100">
              Upload a file to activate the fraud analysis chat.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
