import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Kbd } from '@/components/ui/kbd';
import { useShortcutsDialog } from './shortcuts';

const SECTIONS: { title: string; items: [string, string][] }[] = [
  {
    title: 'General',
    items: [
      ['⌘ K  or  /', 'Search and run commands'],
      ['?', 'Show keyboard shortcuts'],
    ],
  },
  {
    title: 'Create',
    items: [
      ['C  D', 'New document'],
      ['C  S', 'New sheet'],
      ['C  W', 'New whiteboard'],
      ['C  P', 'New sprint board'],
      ['C  B', 'New databoard'],
      ['C  F', 'New folder'],
      ['⌘ ↵', 'Submit dialogs'],
    ],
  },
  {
    title: 'Go to',
    items: [
      ['G  H', 'All files'],
      ['G  I', 'Inbox'],
      ['G  M', 'Direct & channels'],
      ['G  S', 'Settings'],
    ],
  },
];

export function ShortcutsDialog() {
  const { open, setOpen } = useShortcutsDialog();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>Press the keys in sequence, outside of text fields.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {SECTIONS.map((section) => (
            <section key={section.title} className="space-y-1.5">
              <h3 className="text-2xs font-medium uppercase tracking-wider text-subtle">{section.title}</h3>
              <ul className="divide-y divide-border rounded-lg border border-border">
                {section.items.map(([keys, label]) => (
                  <li key={label} className="flex items-center justify-between px-3 py-2 text-xs">
                    <span className="text-foreground">{label}</span>
                    <span className="flex gap-1">
                      {keys.split('  ').map((k) => (
                        <Kbd key={k}>{k}</Kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
