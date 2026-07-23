import { useCallback, useMemo, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  LexicalTypeaheadMenuPlugin,
  MenuOption,
  useBasicTypeaheadTriggerMatch,
} from '@lexical/react/LexicalTypeaheadMenuPlugin';
import { $createMentionNode } from '@/components/elements/editor/nodes/MentionNode';
import { $createTextNode } from 'lexical';
import { cn } from '@/lib/utils';
import ChatTypeaheadPortal from './ChatTypeaheadPortal';

class MentionOption extends MenuOption {
  constructor(member) {
    super(member.name || member.email || member._id);
    this.member = member;
  }
}

function MentionMenuItem({ index, isSelected, onClick, onMouseEnter, option }) {
  const member = option.member;
  return (
    <li
      key={option.key}
      tabIndex={-1}
      className={cn(
        'flex items-center gap-2 px-3 py-2 cursor-pointer text-sm',
        isSelected ? 'bg-muted' : 'hover:bg-muted/70'
      )}
      ref={option.setRefElement}
      role="option"
      aria-selected={isSelected}
      id={`chat-mention-item-${index}`}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
    >
      <span className="w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-200 flex items-center justify-center text-xs font-semibold shrink-0">
        {(member.name || member.email || '?')[0]?.toUpperCase()}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium truncate">{member.name || 'Unknown'}</span>
        {member.email && (
          <span className="block text-[11px] text-muted-foreground truncate">{member.email}</span>
        )}
      </span>
    </li>
  );
}

/**
 * @mention typeahead — only conversation members (passed in via `members`)
 */
export default function ChatMentionsPlugin({ members = [] }) {
  const [editor] = useLexicalComposerContext();
  const [queryString, setQueryString] = useState(null);
  const checkTrigger = useBasicTypeaheadTriggerMatch('@', { minLength: 0 });

  const options = useMemo(() => {
    const q = (queryString || '').toLowerCase();
    return members
      .filter((m) => {
        if (!q) return true;
        return (
          m.name?.toLowerCase().includes(q) ||
          m.email?.toLowerCase().includes(q)
        );
      })
      .slice(0, 8)
      .map((m) => new MentionOption(m));
  }, [members, queryString]);

  const onSelectOption = useCallback(
    (selected, nodeToReplace, closeMenu) => {
      editor.update(() => {
        const label = `@${selected.member.name || selected.member.email}`;
        const mentionNode = $createMentionNode(label, selected.member._id);
        if (nodeToReplace) {
          nodeToReplace.replace(mentionNode);
        }
        mentionNode.select();
        const space = $createTextNode(' ');
        mentionNode.insertAfter(space);
        space.select();
      });
      closeMenu();
    },
    [editor]
  );

  return (
    <LexicalTypeaheadMenuPlugin
      onQueryChange={setQueryString}
      onSelectOption={onSelectOption}
      triggerFn={checkTrigger}
      options={options}
      menuRenderFn={(
        anchorElementRef,
        { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex }
      ) =>
        anchorElementRef.current && options.length ? (
          <ChatTypeaheadPortal anchorRef={anchorElementRef} width={280}>
            <div className="px-3 py-1.5 text-[10px] uppercase tracking-wide text-muted-foreground border-b">
              Members
            </div>
            <ul className="py-1">
              {options.map((option, i) => (
                <MentionMenuItem
                  key={option.key}
                  index={i}
                  isSelected={selectedIndex === i}
                  onClick={() => {
                    setHighlightedIndex(i);
                    selectOptionAndCleanUp(option);
                  }}
                  onMouseEnter={() => setHighlightedIndex(i)}
                  option={option}
                />
              ))}
            </ul>
          </ChatTypeaheadPortal>
        ) : null
      }
    />
  );
}
