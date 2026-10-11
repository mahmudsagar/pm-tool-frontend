import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Download, ExternalLink, History, Sheet as SheetIcon, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/components/ui/use-toast';
import UniverSheetComponent from '@/components/elements/spreadsheet';
import { useTheme } from '@/components/theme-provider';
import { usePresence, useActivityFlag } from '@/lib/realtime/presence';
import { PresenceStack, SaveIndicator, ShareButton, StudioBar, type SaveState } from '@/features/studio/StudioChrome';
import { cn } from '@/lib/utils';

interface WorkbookCell {
  v?: string | number | boolean | null;
}
interface WorkbookData {
  sheetOrder?: string[];
  sheets?: Record<string, { id?: string; name?: string; cellData?: Record<string, Record<string, WorkbookCell>> }>;
}

// The spreadsheet wrapper is untyped JS; describe the props we use.
const UniverSheet = UniverSheetComponent as unknown as React.ForwardRefExoticComponent<
  {
    data: object;
    handleSubmit: (value: Record<string, unknown>) => void;
    darkMode?: boolean;
  } & React.RefAttributes<{ getData: () => WorkbookData }>
>;

interface SheetPageProps {
  _id: string;
  title?: string;
  pageContent?: { content?: unknown };
  is_private?: boolean;
  shared_members?: string[];
  shared_teams?: string[];
  space_id?: string;
  folder_id?: string;
  group_id?: string;
  handleSubmit: (value: Record<string, unknown>) => void;
  saveState?: SaveState;
  setTopMenu: (menu: { inlineContent?: React.ReactNode; dropdownContent?: React.ReactNode }) => void;
  setOpenDeleteDialog?: () => void;
  onOpenHistory?: () => void;
  peek?: boolean;
  peekPath?: string;
}

function csvEscape(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** CSV of the first sheet in the workbook. */
function workbookToCsv(data: WorkbookData) {
  const sheetId = data.sheetOrder?.[0] ?? Object.keys(data.sheets ?? {})[0];
  const sheet = sheetId ? data.sheets?.[sheetId] : undefined;
  const cells = sheet?.cellData ?? {};
  const rows = Object.keys(cells).map(Number).filter((n) => !Number.isNaN(n));
  if (!rows.length) return { csv: '', name: sheet?.name ?? 'Sheet1' };
  const maxRow = Math.max(...rows);
  const maxCol = Math.max(0, ...rows.flatMap((r) => Object.keys(cells[r] ?? {}).map(Number)));
  const lines: string[] = [];
  for (let r = 0; r <= maxRow; r += 1) {
    const line: string[] = [];
    for (let c = 0; c <= maxCol; c += 1) line.push(csvEscape(cells[r]?.[c]?.v));
    lines.push(line.join(','));
  }
  return { csv: lines.join('\n'), name: sheet?.name ?? 'Sheet1' };
}

export default function SheetPage(props: SheetPageProps) {
  const { _id, pageContent, handleSubmit, saveState = 'idle', setTopMenu, peek = false, peekPath } = props;
  const univerRef = useRef<{ getData: () => WorkbookData } | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { resolvedTheme } = useTheme();
  const [active, ping] = useActivityFlag();
  const presence = usePresence('page', _id, active);
  const path = peekPath ?? `/document/${_id}`;
  const title = props.title || 'Untitled sheet';

  const submit = (value: Record<string, unknown>) => {
    ping();
    handleSubmit(value);
  };

  const exportCsv = () => {
    try {
      const data = univerRef.current?.getData();
      if (!data) return;
      const { csv, name } = workbookToCsv(data);
      if (!csv) return toast({ title: 'Nothing to export yet' });
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      const a = Object.assign(document.createElement('a'), { href: url, download: `${title} - ${name}.csv` });
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Export failed', description: (error as Error).message });
    }
  };

  const containerPath = props.folder_id ? `/folder/${props.folder_id}` : props.group_id ? `/group/${props.group_id}` : props.space_id ? `/space/${props.space_id}` : '/';
  const togglePeek = (mode: 'peek' | 'full') => {
    if (mode === 'full' && peek) navigate(path);
    if (mode === 'peek' && !peek) navigate({ pathname: containerPath, search: `?${new URLSearchParams({ [path]: '_sidebar' })}` });
  };

  const refs = useRef({ onOpenHistory: props.onOpenHistory, setOpenDeleteDialog: props.setOpenDeleteDialog });
  refs.current = { onOpenHistory: props.onOpenHistory, setOpenDeleteDialog: props.setOpenDeleteDialog };
  useEffect(() => {
    setTopMenu({
      inlineContent: <PresenceStack users={presence} />,
      dropdownContent: (
        <>
          <DropdownMenuItem onSelect={() => void navigator.clipboard.writeText(`${window.location.origin}${path}`)}>
            <Copy /> Copy link
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => window.open(path, '_blank', 'noopener')}>
            <ExternalLink /> Open in new tab
          </DropdownMenuItem>
          <DropdownMenuItem className="text-danger-foreground focus:text-danger-foreground" onSelect={() => setTimeout(() => refs.current.setOpenDeleteDialog?.(), 150)}>
            <Trash2 /> Delete sheet
          </DropdownMenuItem>
        </>
      ),
    });
  }, [setTopMenu, presence, path]);

  return (
    <div className={cn('flex flex-col', peek ? 'h-full min-h-[70vh]' : 'h-[calc(100dvh-3.5rem)]')}>
      <StudioBar
        icon={SheetIcon}
        iconClassName="text-success-foreground"
        title={title}
        onTitleChange={(next) => handleSubmit({ title: next })}
        badges={
          <span className="hidden items-center gap-2 sm:flex">
            <Badge variant="mono">Sheet</Badge>
            <SaveIndicator state={saveState} />
          </span>
        }
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Version history" onClick={() => refs.current.onOpenHistory?.()}>
              <History />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Version history</TooltipContent>
        </Tooltip>
        <Button variant="outline" size="sm" onClick={exportCsv}>
          <Download /> <span className="hidden sm:inline">Export CSV</span>
        </Button>
        <SegmentedControl
          size="sm"
          aria-label="View mode"
          className="hidden md:inline-flex"
          value={peek ? 'peek' : 'full'}
          onValueChange={togglePeek}
          options={[
            { value: 'peek', label: 'Side peek' },
            { value: 'full', label: 'Full canvas' },
          ]}
        />
        <ShareButton pageId={_id} path={`/document/${_id}`} title={title} isPrivate={props.is_private} sharedMembers={props.shared_members} sharedTeams={props.shared_teams} />
      </StudioBar>

      <div className="relative min-h-0 flex-1">
        {pageContent ? (
          <UniverSheet
            key={_id}
            ref={univerRef}
            data={(pageContent.content as object) || {}}
            handleSubmit={submit}
            darkMode={resolvedTheme === 'dark'}
          />
        ) : null}
      </div>
    </div>
  );
}
