import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import {
  Activity,
  ChevronDown,
  Clock,
  Copy,
  ExternalLink,
  Eye,
  FileText,
  Globe,
  History,
  ImagePlus,
  ListTree,
  Lock,
  LockOpen,
  MessageSquare,
  MoveVertical,
  SmilePlus,
  Trash2,
  Type,
  UserRound,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/components/ui/use-toast';
import PlaygroundNodes from '@/components/elements/editor/nodes/PlaygroundNodes';
import PlaygroundEditorTheme from '@/components/elements/editor/themes/PlaygroundEditorTheme';
import Editor from '@/components/elements/editor/editor';
import DynamicInput from '@/components/elements/editor/dynamicInput';
import SubtaskPanel from '@/components/elements/SubtaskPanel';
import CommentSection from '@/components/elements/comment';
import ImageUpload from '@/components/elements/editor/upload/image';
import { useDeleteMedia, useUploadMedia } from '@/hooks/mutations/useCommentsMutations';
import { buildDependencyOptionsFromDocuments, resolveDependencySprintScope } from '@/components/elements/dataView/scrum/dependencyOptionsUtils';
import useAuthStore from '@/stores/useAuthStore';
import { usePresence, useActivityFlag } from '@/lib/realtime/presence';
import { useMemberDirectory, shortName } from '@/features/members/useMemberDirectory';
import { useIsWorkspaceAdmin } from '@/features/settings/queries';
import { formatDate } from '@/features/files/formatDate';
import { PresenceStack, SaveIndicator, ShareButton, type SaveState } from '@/features/studio/StudioChrome';
import { DOC_STATUS, usePageStats, usePatchPage, type DocStatus } from '@/features/studio/pageMeta';
import { analyzeDoc, scrollToHeading } from './docOutline';
import '@/features/studio/editor-theme.css';

const editorConfig = {
  namespace: 'BetterNotionDocument',
  nodes: [...PlaygroundNodes] as never[],
  onError(error: Error) {
    throw error;
  },
  theme: PlaygroundEditorTheme,
};

const EMOJIS = '📄 📝 📌 📎 📊 📈 🗂️ 🧭 🧪 🧠 💡 🚀 🎯 ✅ ⚠️ 🔒 🔑 🛠️ ⚙️ 🧩 🗺️ 🏗️ 📦 🔍 🧾 📅 ⏱️ 💬 📣 🎨 🖼️ 🧱 🌐 🔗 💼 📚 🏁 ⭐ 🔥 🌱'.split(' ');

interface MediaAttachment {
  _id?: string;
  url?: string;
  media_type?: string;
}

interface TopMenuSetter {
  (menu: { inlineContent?: React.ReactNode; dropdownContent?: React.ReactNode }): void;
}

interface DocumentPageProps {
  _id: string;
  title?: string;
  icon?: string;
  subtitle?: string;
  doc_status?: DocStatus;
  cover_position?: number;
  locked?: boolean;
  locked_by?: string;
  user_id?: string;
  updatedAt?: string;
  createdAt?: string;
  last_updated_by?: string;
  is_private?: boolean;
  shared_members?: string[];
  shared_teams?: string[];
  space_id?: string;
  folder_id?: string;
  group_id?: string;
  board_id?: string;
  parent_id?: string;
  custom_meta?: { fields?: unknown[]; values?: Record<string, unknown> } & Record<string, unknown>;
  comments?: unknown[];
  mediaAttachments?: MediaAttachment[];
  attachments?: MediaAttachment[];
  pageContent?: { content?: string };
  subtasks?: unknown[];
  board?: { custom_meta?: { fields?: unknown[] }; documents?: unknown[] } & Record<string, unknown>;
  assigneeOptions?: unknown[];
  dependencyOptions?: unknown[];
  labelRegistry?: Record<string, unknown>;
  onLabelRegistryChange?: (v: unknown) => void;
  epicRegistry?: Record<string, unknown>;
  onEpicRegistryChange?: (v: unknown) => void;
  handleSubmit: (value: Record<string, unknown>) => void;
  saveState?: SaveState;
  setTopMenu: TopMenuSetter;
  setOpenDeleteDialog?: () => void;
  onOpenHistory?: () => void;
  peek?: boolean;
  peekPath?: string;
}

function containerPath(doc: DocumentPageProps) {
  if (doc.board_id) return `/board/${doc.board_id}`;
  if (doc.folder_id) return `/folder/${doc.folder_id}`;
  if (doc.group_id) return `/group/${doc.group_id}`;
  if (doc.space_id) return `/space/${doc.space_id}`;
  return '/';
}

/** Cover image state plus upload/remove, shared by the cover and the "Add cover" button. */
function useCover(pageId: string, media?: MediaAttachment) {
  const upload = useUploadMedia();
  const remove = useDeleteMedia();
  const [cover, setCover] = useState(media);
  useEffect(() => setCover(media), [media]);

  const uploadCover = async (files: File[]) => {
    const file = (files[0] as File & { File?: File })?.File ?? files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('media_type', 'cover_photo');
    fd.append('reference_id', pageId);
    fd.append('caption', ' ');
    fd.append('reference_for', 'page');
    fd.append('file', file);
    const result = (await (upload.mutateAsync as unknown as (f: FormData) => Promise<MediaAttachment>)(fd)) as MediaAttachment;
    if (result?.url) setCover(result);
  };

  const removeCover = async () => {
    if (!cover?._id) return;
    await (remove.mutateAsync as unknown as (v: Record<string, unknown>) => Promise<unknown>)({ mediaId: cover._id, referenceFor: 'page' });
    setCover(undefined);
  };

  return { cover, uploadCover, removeCover, busy: upload.isPending || remove.isPending, removing: remove.isPending };
}

type CoverState = ReturnType<typeof useCover>;

function Cover({ pageId, state, position, editable }: { pageId: string; state: CoverState; position: number; editable: boolean }) {
  const { cover, uploadCover, removeCover, busy, removing } = state;
  const patch = usePatchPage(pageId);
  const [repositioning, setRepositioning] = useState(false);
  const [draftPos, setDraftPos] = useState(position);
  const drag = useRef<{ startY: number; startPos: number } | null>(null);

  useEffect(() => setDraftPos(position), [position]);

  if (!cover?.url) return null;

  const onPointerDown = (e: ReactPointerEvent) => {
    if (!repositioning) return;
    drag.current = { startY: e.clientY, startPos: draftPos };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: ReactPointerEvent) => {
    if (!drag.current) return;
    const delta = ((drag.current.startY - e.clientY) / 200) * 100;
    setDraftPos(Math.round(Math.min(100, Math.max(0, drag.current.startPos + delta))));
  };

  return (
    <div
      className={cn('group/cover relative h-44 w-full overflow-hidden bg-muted sm:h-52', repositioning && 'cursor-ns-resize')}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={() => (drag.current = null)}
    >
      <img src={cover.url} alt="" className="size-full select-none object-cover" style={{ objectPosition: `center ${draftPos}%` }} draggable={false} />
      {editable && (
        <div className={cn('absolute bottom-3 right-3 flex gap-1.5 transition-opacity', repositioning ? 'opacity-100' : 'opacity-0 group-hover/cover:opacity-100 [@media(hover:none)]:opacity-100')}>
          {repositioning ? (
            <>
              <span className="rounded-md bg-black/60 px-2 py-1 text-2xs text-white">Drag to reposition</span>
              <Button size="xs" variant="secondary" onClick={() => { setDraftPos(position); setRepositioning(false); }}>
                Cancel
              </Button>
              <Button size="xs" onClick={() => { patch.mutate({ cover_position: draftPos }); setRepositioning(false); }}>
                Save position
              </Button>
            </>
          ) : (
            <>
              <ImageUpload onChange={uploadCover}>
                <Button size="xs" variant="secondary">Change cover</Button>
              </ImageUpload>
              <Button size="xs" variant="secondary" onClick={() => setRepositioning(true)}>
                <MoveVertical /> Reposition
              </Button>
              <Button size="xs" variant="secondary" disabled={removing} onClick={() => void removeCover()}>
                Remove
              </Button>
            </>
          )}
        </div>
      )}
      {busy && <div className="absolute inset-0 animate-pulse bg-background/40" />}
    </div>
  );
}

function IconPicker({ value, onChange, disabled }: { value?: string; onChange: (icon: string) => void; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={value ? 'Change page icon' : 'Add page icon'}
          className={cn(
            'flex items-center justify-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            value ? 'size-14 border border-border bg-card text-3xl hover:bg-accent' : 'h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground',
          )}
        >
          {value || (
            <>
              <SmilePlus className="size-3.5" /> Add icon
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-2">
        <div className="grid grid-cols-8 gap-1">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                onChange(emoji);
                setOpen(false);
              }}
              className="flex size-8 items-center justify-center rounded-md text-lg hover:bg-accent"
            >
              {emoji}
            </button>
          ))}
        </div>
        {value && (
          <Button variant="ghost" size="xs" className="mt-2 w-full" onClick={() => { onChange(''); setOpen(false); }}>
            Remove icon
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}

function AutoTextarea({ value, onChange, className, placeholder, disabled, ariaLabel, maxLength }: { value: string; onChange: (v: string) => void; className?: string; placeholder?: string; disabled?: boolean; ariaLabel: string; maxLength?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      disabled={disabled}
      maxLength={maxLength}
      aria-label={ariaLabel}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value.replace(/\n/g, ' '))}
      onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
      className={cn('w-full resize-none overflow-hidden bg-transparent outline-none placeholder:text-subtle disabled:cursor-default', className)}
    />
  );
}

function Outline({ headings, onJump }: { headings: { level: number; text: string; index: number }[]; onJump: (index: number) => void }) {
  if (!headings.length) return <p className="text-2xs text-subtle">Add headings to build an outline.</p>;
  return (
    <ol className="space-y-0.5">
      {headings.map((h) => (
        <li key={`${h.index}-${h.text}`}>
          <button
            type="button"
            onClick={() => onJump(h.index)}
            className="block w-full truncate rounded px-2 py-1 text-left text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
            style={{ paddingLeft: 8 + (h.level - 1) * 12 }}
          >
            {h.text}
          </button>
        </li>
      ))}
    </ol>
  );
}

export default function DocumentPage(props: DocumentPageProps) {
  const {
    _id,
    pageContent,
    custom_meta,
    board,
    board_id,
    parent_id,
    subtasks = [],
    handleSubmit,
    saveState = 'idle',
    setTopMenu,
    setOpenDeleteDialog,
    onOpenHistory,
    peek = false,
    peekPath,
  } = props;
  const navigate = useNavigate();
  const { toast } = useToast();
  const me = useAuthStore((s) => s.user?._id);
  const isAdmin = useIsWorkspaceAdmin();
  const { byId } = useMemberDirectory();
  const patch = usePatchPage(_id);
  const { data: stats } = usePageStats(_id);
  const [active, ping] = useActivityFlag();
  const presence = usePresence('page', _id, active);
  const [showComments, setShowComments] = useState(false);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [title, setTitle] = useState(props.title ?? '');
  const [subtitle, setSubtitle] = useState(props.subtitle ?? '');
  const [liveContent, setLiveContent] = useState(pageContent?.content ?? '');
  const bodyRef = useRef<HTMLDivElement>(null);

  const facts = useMemo(() => analyzeDoc(liveContent), [liveContent]);
  const locked = !!props.locked;
  const canToggleLock = isAdmin || props.user_id === me || props.locked_by === me;
  const canEdit = !locked || canToggleLock;
  const author = props.user_id ? byId.get(props.user_id) : undefined;
  const editor = props.last_updated_by ? byId.get(props.last_updated_by) : undefined;
  const coverState = useCover(_id, (props.mediaAttachments ?? props.attachments ?? []).find((m) => m.media_type === 'cover_photo'));
  const cover = coverState.cover;
  const path = peekPath ?? `/document/${_id}`;
  const status = props.doc_status ?? 'draft';

  const boardFields = board?.custom_meta?.fields ?? [];
  const mergedCustomMeta = custom_meta ? { ...custom_meta, fields: custom_meta.fields?.length ? custom_meta.fields : boardFields } : undefined;
  const dependencyOptions = useMemo(() => {
    if (Array.isArray(props.dependencyOptions) && props.dependencyOptions.length) return props.dependencyOptions;
    const sprintScope = resolveDependencySprintScope(board, { _id, custom_meta });
    return buildDependencyOptionsFromDocuments(((board?.documents as unknown[]) ?? []) as never, { excludeTaskId: _id, sprintScope });
  }, [board, _id, custom_meta, props.dependencyOptions]);

  // Title and subtitle are kept locally while typing; saves are debounced upstream.
  useEffect(() => setTitle(props.title ?? ''), [props.title]);
  useEffect(() => setSubtitle(props.subtitle ?? ''), [props.subtitle]);

  const submitRef = useRef(handleSubmit);
  submitRef.current = handleSubmit;
  const onEditorChange = (change: Record<string, unknown>) => {
    ping();
    submitRef.current(change);
  };

  const togglePeek = (mode: 'peek' | 'full') => {
    if (mode === 'full' && peek) navigate(path);
    if (mode === 'peek' && !peek) navigate({ pathname: containerPath(props), search: `?${new URLSearchParams({ [path]: '_sidebar' })}` });
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      toast({ variant: 'success', title: 'Link copied' });
    } catch {
      toast({ variant: 'destructive', title: 'Could not copy link' });
    }
  };

  // Top bar (or side-panel header) actions.
  const historyRef = useRef(onOpenHistory);
  historyRef.current = onOpenHistory;
  const deleteRef = useRef(setOpenDeleteDialog);
  deleteRef.current = setOpenDeleteDialog;
  useEffect(() => {
    setTopMenu({
      inlineContent: (
        <>
          <PresenceStack users={presence} />
          <SaveIndicator state={saveState} />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Version history" onClick={() => historyRef.current?.()}>
                <History />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Version history</TooltipContent>
          </Tooltip>
        </>
      ),
      dropdownContent: (
        <>
          <DropdownMenuItem onSelect={() => void copyLink()}>
            <Copy /> Copy link
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => window.open(path, '_blank', 'noopener')}>
            <ExternalLink /> Open in new tab
          </DropdownMenuItem>
          <DropdownMenuItem className="text-danger-foreground focus:text-danger-foreground" onSelect={() => setTimeout(() => deleteRef.current?.(), 150)}>
            <Trash2 /> Delete page
          </DropdownMenuItem>
        </>
      ),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- copyLink only depends on path
  }, [setTopMenu, presence, saveState, path]);

  return (
    <div className={cn('qp-doc min-h-full', peek && 'qp-doc--peek')}>
      <Cover pageId={_id} state={coverState} position={props.cover_position ?? 50} editable={canEdit} />

      <div className={cn('mx-auto flex w-full gap-10 px-4 sm:px-8', peek ? 'max-w-none' : 'max-w-[1120px]')}>
        <article className={cn('min-w-0 flex-1', !peek && 'max-w-[760px] xl:mx-0', !peek && 'mx-auto')}>
          <div className={cn('flex flex-wrap items-center justify-between gap-2', cover?.url ? 'pt-4' : 'pt-8')}>
            <div className="flex items-center gap-1">
              {!props.icon && <IconPicker value={props.icon} onChange={(icon) => patch.mutate({ icon })} disabled={!canEdit} />}
              {!cover?.url && canEdit && (
                <ImageUpload onChange={coverState.uploadCover}>
                  <Button variant="ghost" size="xs" className="text-muted-foreground">
                    <ImagePlus /> Add cover
                  </Button>
                </ImageUpload>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <SegmentedControl
                size="sm"
                aria-label="View mode"
                value={peek ? 'peek' : 'full'}
                onValueChange={togglePeek}
                options={[
                  { value: 'peek', label: 'Side peek' },
                  { value: 'full', label: 'Full page' },
                ]}
              />
              {canToggleLock ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon-sm" aria-pressed={locked} aria-label={locked ? 'Unlock page' : 'Lock page'} onClick={() => patch.mutate({ locked: !locked })}>
                      {locked ? <Lock className="text-warning-foreground" /> : <LockOpen />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{locked ? 'Unlock editing' : 'Lock editing'}</TooltipContent>
                </Tooltip>
              ) : (
                locked && <Lock className="size-4 text-warning-foreground" aria-label="Locked" />
              )}
              <ShareButton
                pageId={_id}
                path={`/document/${_id}`}
                title={title || 'Untitled'}
                isPrivate={props.is_private}
                sharedMembers={props.shared_members}
                sharedTeams={props.shared_teams}
              />
            </div>
          </div>

          {props.icon && (
            <div className="mt-4">
              <IconPicker value={props.icon} onChange={(icon) => patch.mutate({ icon })} disabled={!canEdit} />
            </div>
          )}

          <AutoTextarea
            ariaLabel="Title"
            value={title}
            disabled={!canEdit}
            maxLength={200}
            placeholder="Untitled"
            onChange={(v) => {
              setTitle(v);
              handleSubmit({ title: v });
            }}
            className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl"
          />
          <AutoTextarea
            ariaLabel="Description"
            value={subtitle}
            disabled={!canEdit}
            maxLength={300}
            placeholder={canEdit ? 'Add a short description…' : ''}
            onChange={(v) => {
              setSubtitle(v);
              patchSubtitleDebounced(patch, v);
            }}
            className="mt-2 text-sm text-muted-foreground"
          />

          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild disabled={!canEdit}>
                <button type="button" className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Document status">
                  <Badge variant={DOC_STATUS[status].variant} dot>
                    {DOC_STATUS[status].label}
                    {canEdit && <ChevronDown />}
                  </Badge>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {(Object.keys(DOC_STATUS) as DocStatus[]).map((s) => (
                  <DropdownMenuItem key={s} onSelect={() => patch.mutate({ doc_status: s })}>
                    {DOC_STATUS[s].label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {author && (
              <Badge variant="outline">
                <UserRound /> {author.name || author.email}
              </Badge>
            )}
            <Badge variant="outline">
              <Clock /> Edited {formatDate(props.updatedAt ?? null).toLowerCase()}
              {editor && editor._id !== props.user_id && ` by ${shortName(editor)}`}
            </Badge>
            <Badge variant="outline">
              <Type /> {facts.words.toLocaleString()} words
            </Badge>
            <Badge variant="outline">
              {props.is_private ? <Lock /> : <Globe />} {props.is_private ? 'Private' : 'Team'}
            </Badge>
            {locked && (
              <Badge variant="warning">
                <Lock /> Locked{props.locked_by && byId.get(props.locked_by) ? ` by ${shortName(byId.get(props.locked_by))}` : ''}
              </Badge>
            )}
          </div>

          {mergedCustomMeta && (board_id || (mergedCustomMeta.fields?.length ?? 0) > 0) && (
            <div className="mt-6 rounded-xl border border-border bg-card/50 p-3">
              <DynamicInput
                initialData={mergedCustomMeta}
                assigneeOptions={(props.assigneeOptions ?? []) as never}
                dependencyOptions={dependencyOptions as never}
                labelRegistry={props.labelRegistry ?? {}}
                onLabelRegistryChange={props.onLabelRegistryChange}
                epicRegistry={props.epicRegistry ?? {}}
                onEpicRegistryChange={props.onEpicRegistryChange}
                onChange={(next: unknown) => handleSubmit({ custom_meta: next })}
              />
            </div>
          )}
          {board_id && !parent_id && (
            <div className="mt-4">
              <SubtaskPanel parentTaskId={_id} boardId={board_id} subtasks={subtasks as never} boardFields={boardFields as never} onCreated={undefined} />
            </div>
          )}

          {peek && facts.headings.length > 0 && (
            <div className="mt-6 rounded-xl border border-border bg-card/50">
              <button
                type="button"
                onClick={() => setOutlineOpen((o) => !o)}
                aria-expanded={outlineOpen}
                className="flex w-full items-center justify-between px-3 py-2 text-2xs font-medium uppercase tracking-wider text-subtle"
              >
                <span className="flex items-center gap-1.5">
                  <ListTree className="size-3.5" /> Outline · {facts.headings.length}
                </span>
                <ChevronDown className={cn('size-3.5 transition-transform', outlineOpen && 'rotate-180')} />
              </button>
              {outlineOpen && (
                <div className="px-1 pb-2">
                  <Outline headings={facts.headings} onJump={(i) => scrollToHeading(bodyRef.current, i)} />
                </div>
              )}
            </div>
          )}

          <div ref={bodyRef} className="lexical-editor mt-6">
            <LexicalComposer initialConfig={{ ...editorConfig, editable: canEdit }}>
              {pageContent && (
                <Editor
                  page_id={_id}
                  content={pageContent.content}
                  onChange={onEditorChange}
                  onTextChange={setLiveContent}
                  showComments={showComments}
                  setShowComments={setShowComments}
                  editable={canEdit}
                />
              )}
            </LexicalComposer>
          </div>

          <section className="mb-16 mt-10 border-t border-border pt-6" aria-label="Comments">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
              <MessageSquare className="size-4 text-muted-foreground" /> Comments
            </h2>
            <CommentSection page_id={_id} comments={props.comments} />
          </section>
        </article>

        {!peek && (
          <aside className="hidden w-56 shrink-0 xl:block">
            <div className="sticky top-6 space-y-6 pt-8">
              <section>
                <h2 className="mb-2 flex items-center justify-between px-2 text-2xs font-medium uppercase tracking-wider text-subtle">
                  Contents <span className="font-mono">{facts.headings.length}</span>
                </h2>
                <Outline headings={facts.headings} onJump={(i) => scrollToHeading(bodyRef.current, i)} />
              </section>
              <section className="space-y-3 rounded-xl border border-border bg-card p-3">
                <h2 className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                  <Activity className="size-3.5 text-muted-foreground" /> Document health
                </h2>
                {facts.checklist.total > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-2xs text-muted-foreground">
                      <span>Checklist</span>
                      <span className="font-mono text-foreground">
                        {facts.checklist.done}/{facts.checklist.total}
                      </span>
                    </div>
                    <Progress value={(facts.checklist.done / facts.checklist.total) * 100} tone="brand" />
                  </div>
                )}
                <dl className="space-y-1.5 text-2xs">
                  <div className="flex justify-between text-muted-foreground">
                    <dt className="flex items-center gap-1">
                      <Eye className="size-3" /> Readers
                    </dt>
                    <dd className="font-mono text-foreground">{stats?.views ?? '—'}</dd>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <dt className="flex items-center gap-1">
                      <FileText className="size-3" /> Words
                    </dt>
                    <dd className="font-mono text-foreground">{facts.words.toLocaleString()}</dd>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <dt className="flex items-center gap-1">
                      <MessageSquare className="size-3" /> Comments
                    </dt>
                    <dd className="font-mono text-foreground">{stats?.comment_count ?? '—'}</dd>
                  </div>
                </dl>
              </section>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

let subtitleTimer: ReturnType<typeof setTimeout> | undefined;
/** Subtitle is a page field (not editor content); save it shortly after typing stops. */
function patchSubtitleDebounced(patch: ReturnType<typeof usePatchPage>, value: string) {
  clearTimeout(subtitleTimer);
  subtitleTimer = setTimeout(() => patch.mutate({ subtitle: value }), 600);
}
