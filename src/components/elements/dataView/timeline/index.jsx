// Static timeline skeleton modeled after pm_tool_full_four_views
// Uses demo data and layout that closely matches the sample image.

export default function TimelineView() {
  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="flex h-6 w-6 items-center justify-center rounded-md border text-xs text-muted-foreground"
            >
              ←
            </button>
            <button
              type="button"
              className="flex h-6 w-6 items-center justify-center rounded-md border text-xs text-muted-foreground"
            >
              →
            </button>
          </div>
          <span className="font-medium text-foreground">Apr – Aug 2026</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="inline-flex overflow-hidden rounded-md border">
            <button className="px-3 py-1 text-muted-foreground">Week</button>
            <button className="bg-muted px-3 py-1 font-medium text-foreground">Month</button>
            <button className="px-3 py-1 text-muted-foreground">Quarter</button>
          </div>
          <button
            type="button"
            className="rounded-md border px-3 py-1.5 font-medium text-xs text-foreground"
          >
            + Add task
          </button>
        </div>
      </div>

      {/* Timeline grid */}
      <div className="overflow-x-auto">
        <div className="grid min-w-[720px] grid-cols-[180px_minmax(0,1fr)] text-xs">
          {/* Left header */}
          <div className="border-b border-r bg-muted px-3 py-2 font-medium text-muted-foreground">
            Task / Assignee
          </div>

          {/* Month header */}
          <div className="border-b bg-muted">
            <div className="grid grid-cols-5 border-l">
              <div className="border-r px-3 py-2 text-muted-foreground">Apr</div>
              <div className="border-r px-3 py-2 font-medium text-foreground">
                May <span className="text-xs text-muted-foreground">▸</span>
              </div>
              <div className="border-r px-3 py-2 text-muted-foreground">Jun</div>
              <div className="border-r px-3 py-2 text-muted-foreground">Jul</div>
              <div className="px-3 py-2 text-muted-foreground">Aug</div>
            </div>
          </div>

          {/* Discovery parent row */}
          <div className="flex items-center gap-2 border-b border-r px-3 py-2">
            <button className="text-[10px] text-muted-foreground">▼</button>
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-[10px] font-medium text-blue-800">
              SR
            </div>
            <div>
              <div className="text-[13px] font-medium text-foreground">Discovery</div>
              <div className="text-[11px] text-muted-foreground">Sara R.</div>
            </div>
          </div>
          <div className="relative border-b">
            <div className="grid h-12 grid-cols-5">
              <div className="border-r" />
              <div className="border-r bg-blue-50/40" />
              <div className="border-r" />
              <div className="border-r" />
              <div />
            </div>
            {/* Discovery & research bar */}
            <div className="absolute left-[2%] top-3 inline-flex h-5 items-center rounded bg-lime-200 px-2 text-[11px] font-medium text-lime-900">
              Discovery &amp; research
            </div>
            {/* Today line */}
            <div className="absolute left-[38%] top-0 bottom-0 w-[2px] bg-sky-500">
              <div className="absolute left-[-3px] top-0 h-2 w-2 rounded-full bg-sky-500" />
            </div>
          </div>

          {/* Discovery child row: Stakeholder interviews */}
          <div className="flex items-center gap-2 border-b border-r bg-muted/40 px-6 py-2">
            <span className="text-[11px] text-muted-foreground">Stakeholder interviews</span>
          </div>
          <div className="relative border-b bg-muted/40">
            <div className="grid h-9 grid-cols-5">
              <div className="border-r" />
              <div className="border-r bg-blue-50/40" />
              <div className="border-r" />
              <div className="border-r" />
              <div />
            </div>
            <div className="absolute left-[2%] top-2 inline-flex h-4 items-center rounded bg-lime-200 px-2 text-[10px] font-medium text-lime-900">
              Interviews
            </div>
            <div className="absolute left-[38%] top-0 bottom-0 w-[2px] bg-sky-500">
              <div className="absolute left-[-3px] top-0 h-2 w-2 rounded-full bg-sky-500" />
            </div>
          </div>

          {/* Discovery child row: Competitor analysis */}
          <div className="flex items-center gap-2 border-b border-r bg-muted/40 px-6 py-2">
            <span className="text-[11px] text-muted-foreground">Competitor analysis</span>
          </div>
          <div className="relative border-b bg-muted/40">
            <div className="grid h-9 grid-cols-5">
              <div className="border-r" />
              <div className="border-r bg-blue-50/40" />
              <div className="border-r" />
              <div className="border-r" />
              <div />
            </div>
            <div className="absolute left-[12%] top-2 inline-flex h-4 items-center rounded bg-lime-200 px-2 text-[10px] font-medium text-lime-900">
              Analysis
            </div>
            <div className="absolute left-[38%] top-0 bottom-0 w-[2px] bg-sky-500">
              <div className="absolute left-[-3px] top-0 h-2 w-2 rounded-full bg-sky-500" />
            </div>
          </div>

          {/* UI Design parent row */}
          <div className="flex items-center gap-2 border-b border-r px-3 py-2">
            <button className="text-[10px] text-muted-foreground">▼</button>
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-medium text-emerald-800">
              MK
            </div>
            <div>
              <div className="text-[13px] font-medium text-foreground">UI Design</div>
              <div className="text-[11px] text-muted-foreground">Mia K.</div>
            </div>
          </div>
          <div className="relative border-b">
            <div className="grid h-12 grid-cols-5">
              <div className="border-r" />
              <div className="border-r bg-blue-50/40" />
              <div className="border-r" />
              <div className="border-r" />
              <div />
            </div>
            <div className="absolute left-[26%] top-3 inline-flex h-5 items-center rounded bg-sky-200 px-2 text-[11px] font-medium text-sky-900">
              UI Design
            </div>
            <div className="absolute left-[57%] top-2 h-3.5 w-3.5 rotate-45 rounded-sm bg-sky-500" />
            <div className="absolute left-[38%] top-0 bottom-0 w-[2px] bg-sky-500">
              <div className="absolute left-[-3px] top-0 h-2 w-2 rounded-full bg-sky-500" />
            </div>
          </div>

          {/* Frontend build parent row */}
          <div className="flex items-center gap-2 border-b border-r px-3 py-2">
            <button className="text-[10px] text-muted-foreground">▶</button>
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-[10px] font-medium text-amber-800">
              JL
            </div>
            <div>
              <div className="text-[13px] font-medium text-foreground">Frontend build</div>
              <div className="text-[11px] text-muted-foreground">James L.</div>
            </div>
          </div>
          <div className="relative border-b">
            <div className="grid h-12 grid-cols-5">
              <div className="border-r" />
              <div className="border-r bg-blue-50/40" />
              <div className="border-r" />
              <div className="border-r" />
              <div />
            </div>
            <div className="absolute left-[56%] top-3 inline-flex h-5 items-center rounded bg-amber-200 px-2 text-[11px] font-medium text-amber-900">
              Frontend build
            </div>
            <div className="absolute left-[38%] top-0 bottom-0 w-[2px] bg-sky-500">
              <div className="absolute left-[-3px] top-0 h-2 w-2 rounded-full bg-sky-500" />
            </div>
          </div>

          {/* QA parent row */}
          <div className="flex items-center gap-2 border-b border-r px-3 py-2">
            <button className="text-[10px] text-muted-foreground">—</button>
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-medium text-indigo-800">
              NT
            </div>
            <div>
              <div className="text-[13px] font-medium text-foreground">QA &amp; testing</div>
              <div className="text-[11px] text-muted-foreground">Nina T.</div>
            </div>
          </div>
          <div className="relative border-b">
            <div className="grid h-12 grid-cols-5">
              <div className="border-r" />
              <div className="border-r bg-blue-50/40" />
              <div className="border-r" />
              <div className="border-r" />
              <div />
            </div>
            <div className="absolute left-[78%] top-3 inline-flex h-5 items-center rounded bg-indigo-200 px-2 text-[11px] font-medium text-indigo-900">
              QA
            </div>
            <div className="absolute left-[97%] top-2 h-3.5 w-3.5 rotate-45 rounded-sm bg-amber-400" />
            <div className="absolute left-[38%] top-0 bottom-0 w-[2px] bg-sky-500">
              <div className="absolute left-[-3px] top-0 h-2 w-2 rounded-full bg-sky-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-lime-400" /> Done
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-sky-300" /> In progress
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-amber-300" /> Backlog
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-indigo-300" /> Blocked
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rotate-45 rounded-sm bg-sky-500" /> Milestone
        </div>
        <div className="flex items-center gap-1">
          <span className="h-[2px] w-4 bg-sky-500" /> Today
        </div>
      </div>
    </div>
  );
}