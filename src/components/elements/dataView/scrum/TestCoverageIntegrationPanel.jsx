import { useMemo, useState } from 'react';
import { Check, Copy, Loader2, Plug, RefreshCw, Unplug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { baseUrl } from '@/utils/constants';
import {
  useTestCoverageIntegration,
  useTestCoverageIntegrationMutation,
} from '@/hooks/queries/useTestCoverageIntegrationQuery';

function CopyField({ label, value }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-1">
      <p className="m-0 text-[11px] text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2 rounded border bg-muted/20 px-2 py-1.5">
        <code className="flex-1 overflow-x-auto whitespace-nowrap text-[11px]">{value}</code>
        <Button type="button" size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={handleCopy}>
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </div>
  );
}

function buildCiSnippet({ webhookUrl, boardId, tokenPlaceholder = '$COVERAGE_TOKEN' }) {
  return `curl -X POST "${webhookUrl}" \\
  -H "Content-Type: application/json" \\
  -H "X-Test-Coverage-Token: ${tokenPlaceholder}" \\
  -d '{
    "board_id": "${boardId}",
    "branch": "\${{ github.head_ref || github.ref_name }}",
    "commit_sha": "\${{ github.sha }}",
    "coverage_percent": 82.5,
    "lines_covered": 1200,
    "lines_total": 1455
  }'`;
}

export default function TestCoverageIntegrationPanel({ boardId }) {
  const { data: integration, isLoading } = useTestCoverageIntegration(boardId, { enabled: Boolean(boardId) });
  const mutation = useTestCoverageIntegrationMutation();
  const [revealedToken, setRevealedToken] = useState('');

  const webhookUrl = integration?.webhook_url || `${baseUrl}/v1/webhook/test-coverage`;
  const enabled = Boolean(integration?.enabled);
  const pending = mutation.isPending;

  const ciSnippet = useMemo(
    () => buildCiSnippet({
      webhookUrl,
      boardId,
      tokenPlaceholder: revealedToken || '$COVERAGE_TOKEN',
    }),
    [boardId, revealedToken, webhookUrl]
  );

  const handleEnable = async () => {
    const result = await mutation.mutateAsync({ boardId, action: 'enable' });
    if (result?.token) setRevealedToken(result.token);
  };

  const handleRotate = async () => {
    const result = await mutation.mutateAsync({ boardId, action: 'rotate' });
    if (result?.token) setRevealedToken(result.token);
  };

  const handleDisable = async () => {
    await mutation.mutateAsync({ boardId, action: 'disable' });
    setRevealedToken('');
  };

  if (!boardId) return null;

  if (isLoading) {
    return <p className="m-0 text-xs text-muted-foreground">Loading CI integration…</p>;
  }

  return (
    <div className="space-y-3 rounded-lg border bg-muted/10 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="m-0 text-sm font-medium">CI integration</p>
          <p className="m-0 mt-0.5 text-xs text-muted-foreground">
            We generate the webhook and token for this board. Paste them into your CI secrets.
          </p>
        </div>
        <Badge variant={enabled ? 'default' : 'outline'}>
          {enabled ? 'Connected' : 'Not connected'}
        </Badge>
      </div>

      {!enabled ? (
        <Button type="button" size="sm" className="h-8" onClick={handleEnable} disabled={pending}>
          {pending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Plug className="mr-1.5 h-3.5 w-3.5" />}
          Connect CI
        </Button>
      ) : (
        <div className="space-y-3">
          <CopyField label="Webhook URL" value={webhookUrl} />
          <CopyField label="Board ID" value={boardId} />

          {revealedToken ? (
            <div className="space-y-1 rounded border border-amber-500/40 bg-amber-500/5 p-2">
              <p className="m-0 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                Copy this token now — it won&apos;t be shown again
              </p>
              <CopyField label="Coverage token" value={revealedToken} />
            </div>
          ) : (
            <div className="space-y-1">
              <p className="m-0 text-[11px] text-muted-foreground">Token</p>
              <div className="flex items-center justify-between rounded border px-2 py-1.5 text-xs">
                <span>{integration?.token_preview || 'Hidden'}</span>
                <Button type="button" size="sm" variant="outline" className="h-7" onClick={handleRotate} disabled={pending}>
                  {pending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-1 h-3 w-3" />}
                  Rotate token
                </Button>
              </div>
            </div>
          )}

          <CopyField label="Example CI step" value={ciSnippet} />

          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            {integration?.last_received_at ? (
              <span>Last report: {new Date(integration.last_received_at).toLocaleString()}</span>
            ) : (
              <span>Waiting for the first CI report…</span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {!revealedToken && (
              <Button type="button" size="sm" variant="outline" className="h-8" onClick={handleRotate} disabled={pending}>
                {pending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />}
                Rotate token
              </Button>
            )}
            <Button type="button" size="sm" variant="ghost" className="h-8 text-destructive" onClick={handleDisable} disabled={pending}>
              <Unplug className="mr-1.5 h-3.5 w-3.5" />
              Disconnect
            </Button>
          </div>

          <p className="m-0 text-[11px] text-muted-foreground">
            On each story, set <code>test_coverage_ref</code> to the branch or PR (e.g. <code>feature/auth</code> or <code>pr:42</code>).
          </p>
        </div>
      )}
    </div>
  );
}
