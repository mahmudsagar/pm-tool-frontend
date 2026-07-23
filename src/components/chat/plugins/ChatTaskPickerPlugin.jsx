import { useCallback, useMemo, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  LexicalTypeaheadMenuPlugin,
  MenuOption,
  useBasicTypeaheadTriggerMatch,
} from '@lexical/react/LexicalTypeaheadMenuPlugin';
import { $createLinkNode } from '@lexical/link';
import { $createTextNode } from 'lexical';
import { BookOpen, GitBranch, ListTodo } from 'lucide-react';
import { useSpaceItemSearch } from '@/hooks/queries/useSpaceItemSearch';
import { cn } from '@/lib/utils';
import ChatTypeaheadPortal from './ChatTypeaheadPortal';

const KIND_ICON = {
  task: ListTodo,
  story: BookOpen,
  subtask: GitBranch,
};

class TaskOption extends MenuOption {
  constructor(item) {
    super(item.title || item._id);
    this.item = item;
  }
}

function TaskMenuItem({ index, isSelected, onClick, onMouseEnter, option }) {
  const item = option.item;
  const Icon = KIND_ICON[item.kind] || ListTodo;
  return (
    <li
      key={option.key}
      tabIndex={-1}
      className={cn(
        'flex items-start gap-2 px-3 py-2 cursor-pointer text-sm',
        isSelected ? 'bg-muted' : 'hover:bg-muted/70'
      )}
      ref={option.setRefElement}
      role="option"
      aria-selected={isSelected}
      id={`chat-task-item-${index}`}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
    >
      <Icon size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1">
        <span className="block font-medium truncate">{item.title}</span>
        <span className="block text-[11px] text-muted-foreground truncate capitalize">
          {item.kind}
          {item.status ? ` · ${item.status}` : ''}
          {item.board_name ? ` · ${item.board_name}` : ''}
        </span>
      </span>
    </li>
  );
}

/**
 * #task typeahead — search and attach space tasks/stories while typing
 */
export default function ChatTaskPickerPlugin({ spaceId, onSelectTask }) {
  const [editor] = useLexicalComposerContext();
  const [queryString, setQueryString] = useState(null);
  const checkTrigger = useBasicTypeaheadTriggerMatch('#', { minLength: 0 });

  const active = queryString !== null && !!spaceId;
  const { data: items = [], isFetching } = useSpaceItemSearch(
    spaceId,
    queryString || '',
    active
  );

  const options = useMemo(
    () => items.slice(0, 8).map((item) => new TaskOption(item)),
    [items]
  );

  const onSelectOption = useCallback(
    (selected, nodeToReplace, closeMenu) => {
      const item = selected.item;
      editor.update(() => {
        const linkNode = $createLinkNode(item.url || `/document/${item._id}`);
        linkNode.append($createTextNode(item.title));
        if (nodeToReplace) {
          nodeToReplace.replace(linkNode);
        }
        const space = $createTextNode(' ');
        linkNode.insertAfter(space);
        space.select();
      });

      onSelectTask?.({
        type: item.kind,
        id: item._id,
        title: item.title,
        url: item.url,
        board_id: item.board_id,
        board_name: item.board_name,
        status: item.status,
      });

      closeMenu();
    },
    [editor, onSelectTask]
  );

  if (!spaceId) return null;

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
        anchorElementRef.current && queryString !== null ? (
          <ChatTypeaheadPortal anchorRef={anchorElementRef} width={300}>
            <div className="px-3 py-1.5 text-[10px] uppercase tracking-wide text-muted-foreground border-b">
              Tasks & stories
            </div>
            {options.length === 0 ? (
              <p className="px-3 py-3 text-sm text-muted-foreground">
                {isFetching ? 'Searching…' : queryString ? 'No matches' : 'Type to search'}
              </p>
            ) : (
              <ul className="py-1">
                {options.map((option, i) => (
                  <TaskMenuItem
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
            )}
          </ChatTypeaheadPortal>
        ) : null
      }
    />
  );
}
