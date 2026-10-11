import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { exportToCanvas } from '@betternotion/excalidraw';
import '@betternotion/excalidraw/index.css';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Circle,
  Copy,
  Diamond,
  Eraser,
  ExternalLink,
  Frame,
  Hand,
  History,
  Map as MapIcon,
  Minus,
  MousePointer2,
  Pencil,
  PenTool,
  Play,
  Plus,
  Redo2,
  Square,
  StickyNote,
  Trash2,
  Type,
  Undo2,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import ExcalidrawRenderComponent from '@/components/elements/whiteboard';
import PageEmbedComponent from '@/components/elements/whiteboard/PageEmbed';
import { usePresence, useActivityFlag } from '@/lib/realtime/presence';
import { PresenceStack, SaveIndicator, ShareButton, StudioBar, type SaveState } from '@/features/studio/StudioChrome';
import './whiteboard-studio.css';

/* Minimal shapes of the Excalidraw API we use (the fork ships loose types). */
interface SceneElement {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isDeleted?: boolean;
  name?: string | null;
}
interface SceneState {
  zoom: { value: number };
  scrollX: number;
  scrollY: number;
  width: number;
  height: number;
  activeTool: { type: string };
}
interface ExcalidrawApi {
  getSceneElements: () => SceneElement[];
  getAppState: () => SceneState;
  getFiles: () => Record<string, unknown>;
  updateScene: (scene: { appState?: Partial<Record<string, unknown>> }) => void;
  scrollToContent: (target?: SceneElement | SceneElement[], opts?: { fitToContent?: boolean; animate?: boolean; duration?: number }) => void;
  setActiveTool: (tool: { type: string }) => void;
}

const ExcalidrawRender = ExcalidrawRenderComponent as unknown as React.ComponentType<{
  content?: unknown;
  onChange: (value: Record<string, unknown>) => void;
  spaceId: string;
  viewModeEnabled?: boolean;
  onApiReady?: (api: ExcalidrawApi, extras: { createStickyNote: () => void; createPageEmbed: (id: string) => void }) => void;
  onSceneChange?: (elements: SceneElement[], state: SceneState) => void;
}>;

const PageEmbed = PageEmbedComponent as unknown as React.ComponentType<{ spaceId: string; onSelect: (id: string) => void }>;

const TOOLS: { type: string; label: string; key: string; icon: typeof Square }[] = [
  { type: 'selection', label: 'Select', key: 'V', icon: MousePointer2 },
  { type: 'hand', label: 'Pan', key: 'H', icon: Hand },
  { type: 'frame', label: 'Frame', key: 'F', icon: Frame },
  { type: 'rectangle', label: 'Rectangle', key: 'R', icon: Square },
  { type: 'diamond', label: 'Diamond', key: 'D', icon: Diamond },
  { type: 'ellipse', label: 'Ellipse', key: 'O', icon: Circle },
  { type: 'arrow', label: 'Arrow', key: 'A', icon: ArrowRight },
  { type: 'text', label: 'Text', key: 'T', icon: Type },
  { type: 'freedraw', label: 'Draw', key: 'P', icon: Pencil },
  { type: 'eraser', label: 'Eraser', key: 'E', icon: Eraser },
];

interface WhiteboardPageProps {
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

function sendShortcut(key: string, shift = false) {
  // Excalidraw listens for its own undo/redo shortcuts on the document.
  document.dispatchEvent(new KeyboardEvent('keydown', { key, ctrlKey: true, metaKey: navigator.platform.includes('Mac'), shiftKey: shift, bubbles: true }));
}

function sceneBounds(elements: SceneElement[]) {
  if (!elements.length) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const el of elements) {
    minX = Math.min(minX, el.x, el.x + el.width);
    minY = Math.min(minY, el.y, el.y + el.height);
    maxX = Math.max(maxX, el.x, el.x + el.width);
    maxY = Math.max(maxY, el.y, el.y + el.height);
  }
  return { minX, minY, maxX, maxY };
}

/** Thumbnail of the board with the visible viewport outlined; click to fit everything. */
function Minimap({ api, version, state }: { api: ExcalidrawApi | null; version: number; state: SceneState | null }) {
  const [thumb, setThumb] = useState<{ url: string; bounds: NonNullable<ReturnType<typeof sceneBounds>>; w: number; h: number } | null>(null);

  useEffect(() => {
    if (!api) return;
    const timer = setTimeout(async () => {
      const elements = api.getSceneElements().filter((e) => !e.isDeleted);
      const bounds = sceneBounds(elements);
      if (!bounds) return setThumb(null);
      try {
        const canvas = await exportToCanvas({
          elements: elements as never,
          appState: { exportBackground: false, viewBackgroundColor: 'transparent' } as never,
          files: api.getFiles() as never,
          maxWidthOrHeight: 220,
        } as never);
        setThumb({ url: canvas.toDataURL(), bounds, w: canvas.width, h: canvas.height });
      } catch {
        setThumb(null);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [api, version]);

  let viewport: React.CSSProperties | null = null;
  if (thumb && state) {
    const sceneW = thumb.bounds.maxX - thumb.bounds.minX || 1;
    const sceneH = thumb.bounds.maxY - thumb.bounds.minY || 1;
    const scale = Math.min(thumb.w / sceneW, thumb.h / sceneH);
    const z = state.zoom.value || 1;
    viewport = {
      left: (-state.scrollX - thumb.bounds.minX) * scale,
      top: (-state.scrollY - thumb.bounds.minY) * scale,
      width: (state.width / z) * scale,
      height: (state.height / z) * scale,
    };
  }

  return (
    <div className="absolute bottom-4 right-4 z-10 hidden w-[240px] rounded-xl border border-border bg-elevated/95 p-2 shadow-overlay backdrop-blur md:block">
      <div className="mb-1.5 flex items-center justify-between px-1">
        <span className="font-mono text-2xs uppercase tracking-wider text-subtle">Canvas map</span>
        <span className="flex items-center gap-1 text-2xs text-muted-foreground">
          <span className="size-1.5 rounded-full bg-brand" /> Live
        </span>
      </div>
      <button
        type="button"
        onClick={() => api?.scrollToContent(undefined, { fitToContent: true, animate: true })}
        className="relative flex h-[130px] w-full items-center justify-center overflow-hidden rounded-lg bg-background/60"
        aria-label="Fit board to screen"
      >
        {thumb ? (
          <div className="relative" style={{ width: thumb.w, height: thumb.h, maxWidth: '100%', maxHeight: '100%' }}>
            <img src={thumb.url} alt="" className="size-full object-contain opacity-80" />
            {viewport && <span className="pointer-events-none absolute rounded-sm border border-brand bg-brand/10" style={viewport} />}
          </div>
        ) : (
          <span className="text-2xs text-subtle">Empty board</span>
        )}
      </button>
    </div>
  );
}

export default function WhiteboardPage(props: WhiteboardPageProps) {
  const { _id, pageContent, handleSubmit, saveState = 'idle', setTopMenu, peek = false, peekPath } = props;
  const navigate = useNavigate();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<ExcalidrawApi | null>(null);
  const stickyRef = useRef<() => void>(() => undefined);
  const embedRef = useRef<(id: string) => void>(() => undefined);
  const [api, setApi] = useState<ExcalidrawApi | null>(null);
  const [sceneState, setSceneState] = useState<SceneState | null>(null);
  const [sceneVersion, setSceneVersion] = useState(0);
  const [showMinimap, setShowMinimap] = useState(true);
  const [presenting, setPresenting] = useState(false);
  const [slide, setSlide] = useState(0);
  const [active, ping] = useActivityFlag();
  const presence = usePresence('page', _id, active);
  const path = peekPath ?? `/document/${_id}`;
  const title = props.title || 'Untitled whiteboard';
  const zoom = Math.round((sceneState?.zoom.value ?? 1) * 100);

  const onApiReady = useCallback((instance: ExcalidrawApi, extras: { createStickyNote: () => void; createPageEmbed: (id: string) => void }) => {
    apiRef.current = instance;
    stickyRef.current = extras.createStickyNote;
    embedRef.current = extras.createPageEmbed;
    setApi(instance);
  }, []);

  // Track zoom, tool and a change counter (for the minimap) without re-rendering on every pointer move.
  const lastSig = useRef('');
  const onSceneChange = useCallback((elements: SceneElement[], state: SceneState) => {
    const sig = `${state.zoom.value}|${state.scrollX}|${state.scrollY}|${state.activeTool.type}|${state.width}|${state.height}`;
    if (sig !== lastSig.current) {
      lastSig.current = sig;
      setSceneState({ zoom: state.zoom, scrollX: state.scrollX, scrollY: state.scrollY, width: state.width, height: state.height, activeTool: state.activeTool });
    }
    setSceneVersion(elements.reduce((sum, e) => sum + ((e as unknown as { version?: number }).version ?? 0), elements.length));
  }, []);

  const save = (value: Record<string, unknown>) => {
    ping();
    handleSubmit(value);
  };

  const setZoom = (next: number) => apiRef.current?.updateScene({ appState: { zoom: { value: Math.min(30, Math.max(0.1, next)) } } });

  const frames = () =>
    (apiRef.current?.getSceneElements() ?? [])
      .filter((e) => e.type === 'frame' && !e.isDeleted)
      .sort((a, b) => a.y - b.y || a.x - b.x);

  const goToSlide = (index: number) => {
    const list = frames();
    if (!list.length) return apiRef.current?.scrollToContent(undefined, { fitToContent: true, animate: true });
    const clamped = Math.max(0, Math.min(list.length - 1, index));
    setSlide(clamped);
    apiRef.current?.scrollToContent(list[clamped], { fitToContent: true, animate: true, duration: 300 });
  };

  const startPresenting = async () => {
    setPresenting(true);
    setSlide(0);
    try {
      await wrapperRef.current?.requestFullscreen?.();
    } catch {
      // Fullscreen may be blocked; presenting still works in-page.
    }
    setTimeout(() => goToSlide(0), 50);
  };

  const stopPresenting = useCallback(() => {
    setPresenting(false);
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => null);
  }, []);

  useEffect(() => {
    if (!presenting) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') goToSlide(slide + 1);
      if (e.key === 'ArrowLeft') goToSlide(slide - 1);
      if (e.key === 'Escape') stopPresenting();
    };
    const onFsChange = () => !document.fullscreenElement && setPresenting(false);
    window.addEventListener('keydown', onKey);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('fullscreenchange', onFsChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- goToSlide reads refs
  }, [presenting, slide, stopPresenting]);

  const containerPath = props.folder_id ? `/folder/${props.folder_id}` : props.group_id ? `/group/${props.group_id}` : props.space_id ? `/space/${props.space_id}` : '/';
  const openPeek = () => navigate({ pathname: containerPath, search: `?${new URLSearchParams({ [path]: '_sidebar' })}` });

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
            <Trash2 /> Delete whiteboard
          </DropdownMenuItem>
        </>
      ),
    });
  }, [setTopMenu, presence, path]);

  const activeTool = sceneState?.activeTool.type ?? 'selection';
  const frameCount = presenting ? frames().length : 0;

  return (
    <div ref={wrapperRef} className={cn('qp-whiteboard flex flex-col bg-background', peek ? 'h-full min-h-[70vh]' : 'h-[calc(100dvh-3.5rem)]', presenting && 'qp-whiteboard--presenting')}>
      {!presenting && (
        <StudioBar
          icon={PenTool}
          iconClassName="text-warning-foreground"
          title={title}
          onTitleChange={(next) => handleSubmit({ title: next })}
          badges={
            <span className="hidden sm:flex">
              <SaveIndicator state={saveState} />
            </span>
          }
        >
          <div className="hidden items-center rounded-lg border border-border lg:flex">
            <Button variant="ghost" size="icon-sm" aria-label="Zoom out" onClick={() => setZoom((sceneState?.zoom.value ?? 1) / 1.2)}>
              <Minus />
            </Button>
            <button type="button" className="w-12 font-mono text-2xs text-muted-foreground hover:text-foreground" onClick={() => setZoom(1)} aria-label="Reset zoom to 100%">
              {zoom}%
            </button>
            <Button variant="ghost" size="icon-sm" aria-label="Zoom in" onClick={() => setZoom((sceneState?.zoom.value ?? 1) * 1.2)}>
              <Plus />
            </Button>
          </div>
          <div className="hidden items-center lg:flex">
            <Button variant="ghost" size="icon-sm" aria-label="Undo" onClick={() => sendShortcut('z')}>
              <Undo2 />
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label="Redo" onClick={() => sendShortcut('z', true)}>
              <Redo2 />
            </Button>
          </div>
          <PresenceStack users={presence} />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Version history" onClick={() => refs.current.onOpenHistory?.()}>
                <History />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Version history</TooltipContent>
          </Tooltip>
          <Button variant={showMinimap ? 'secondary' : 'ghost'} size="sm" className="hidden md:inline-flex" aria-pressed={showMinimap} onClick={() => setShowMinimap((v) => !v)}>
            <MapIcon /> Minimap
          </Button>
          {!peek && (
            <Button variant="ghost" size="sm" className="hidden md:inline-flex" onClick={openPeek}>
              Side peek
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => void startPresenting()}>
            <Play /> <span className="hidden sm:inline">Present</span>
          </Button>
          <ShareButton pageId={_id} path={`/document/${_id}`} title={title} isPrivate={props.is_private} sharedMembers={props.shared_members} sharedTeams={props.shared_teams} />
        </StudioBar>
      )}

      <div className="relative min-h-0 flex-1">
        {pageContent && (
          <ExcalidrawRender
            content={pageContent.content}
            onChange={save}
            spaceId={_id}
            viewModeEnabled={presenting}
            onApiReady={onApiReady}
            onSceneChange={onSceneChange}
          />
        )}

        {!presenting && (
          <div className="absolute bottom-4 left-1/2 z-10 hidden -translate-x-1/2 items-center gap-0.5 rounded-xl border border-border bg-elevated/95 p-1 shadow-overlay backdrop-blur md:flex" role="toolbar" aria-label="Canvas tools">
            {TOOLS.map(({ type, label, key, icon: Icon }, i) => (
              <span key={type} className="flex items-center">
                {(i === 3 || i === 7) && <Separator orientation="vertical" className="mx-1 h-5" />}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={label}
                      aria-pressed={activeTool === type}
                      className={cn(activeTool === type && 'bg-brand/15 text-foreground')}
                      onClick={() => api?.setActiveTool({ type })}
                    >
                      <Icon />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {label} <span className="ml-1 font-mono text-subtle">{key}</span>
                  </TooltipContent>
                </Tooltip>
              </span>
            ))}
            <Separator orientation="vertical" className="mx-1 h-5" />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="Sticky note" onClick={() => stickyRef.current()}>
                  <StickyNote />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Sticky note</TooltipContent>
            </Tooltip>
            <Separator orientation="vertical" className="mx-1 h-5" />
            <div className="qp-embed">
              <PageEmbed spaceId={_id} onSelect={(id) => embedRef.current(id)} />
            </div>
          </div>
        )}

        {showMinimap && !presenting && <Minimap api={api} version={sceneVersion} state={sceneState} />}

        {presenting && (
          <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-xl border border-border bg-elevated/95 p-1 shadow-overlay">
            <Button variant="ghost" size="icon-sm" aria-label="Previous frame" disabled={slide === 0} onClick={() => goToSlide(slide - 1)}>
              <ChevronLeft />
            </Button>
            <span className="px-2 font-mono text-2xs text-muted-foreground">{frameCount ? `${slide + 1} / ${frameCount}` : 'Whole board'}</span>
            <Button variant="ghost" size="icon-sm" aria-label="Next frame" disabled={!frameCount || slide >= frameCount - 1} onClick={() => goToSlide(slide + 1)}>
              <ChevronRight />
            </Button>
            <Separator orientation="vertical" className="mx-1 h-5" />
            <Button variant="ghost" size="sm" onClick={stopPresenting}>
              <X /> Exit
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
