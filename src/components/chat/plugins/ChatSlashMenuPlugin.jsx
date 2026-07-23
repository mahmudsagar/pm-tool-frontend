import { useCallback, useMemo, useState } from 'react';
import { $createCodeNode } from '@lexical/code';
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
} from '@lexical/list';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  LexicalTypeaheadMenuPlugin,
  MenuOption,
  useBasicTypeaheadTriggerMatch,
} from '@lexical/react/LexicalTypeaheadMenuPlugin';
import { $createHeadingNode, $createQuoteNode } from '@lexical/rich-text';
import { $setBlocksType } from '@lexical/selection';
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
} from 'lexical';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Quote,
  Text,
  Underline,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ChatTypeaheadPortal from './ChatTypeaheadPortal';

class SlashOption extends MenuOption {
  constructor(title, options) {
    super(title);
    this.title = title;
    this.icon = options.icon;
    this.keywords = options.keywords || [];
    this.onSelect = options.onSelect;
  }
}

function SlashMenuItem({ index, isSelected, onClick, onMouseEnter, option }) {
  const Icon = option.icon;
  return (
    <li
      key={option.key}
      tabIndex={-1}
      className={cn(
        'flex items-center gap-2.5 px-3 py-2 cursor-pointer text-sm',
        isSelected ? 'bg-muted' : 'hover:bg-muted/70'
      )}
      ref={option.setRefElement}
      role="option"
      aria-selected={isSelected}
      id={`chat-slash-item-${index}`}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
    >
      <span className="w-7 h-7 rounded-md border bg-background flex items-center justify-center shrink-0 text-muted-foreground">
        <Icon size={14} />
      </span>
      <span className="font-medium">{option.title}</span>
    </li>
  );
}

function getSlashOptions(editor) {
  const setBlock = (factory) => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, factory);
      }
    });
  };

  return [
    new SlashOption('Text', {
      icon: Text,
      keywords: ['normal', 'paragraph', 'p', 'text'],
      onSelect: () => setBlock(() => $createParagraphNode()),
    }),
    new SlashOption('Heading 1', {
      icon: Heading1,
      keywords: ['heading', 'header', 'h1'],
      onSelect: () => setBlock(() => $createHeadingNode('h1')),
    }),
    new SlashOption('Heading 2', {
      icon: Heading2,
      keywords: ['heading', 'header', 'h2'],
      onSelect: () => setBlock(() => $createHeadingNode('h2')),
    }),
    new SlashOption('Heading 3', {
      icon: Heading3,
      keywords: ['heading', 'header', 'h3'],
      onSelect: () => setBlock(() => $createHeadingNode('h3')),
    }),
    new SlashOption('Bulleted List', {
      icon: List,
      keywords: ['bulleted', 'unordered', 'ul', 'list'],
      onSelect: () => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined),
    }),
    new SlashOption('Numbered List', {
      icon: ListOrdered,
      keywords: ['numbered', 'ordered', 'ol', 'list'],
      onSelect: () => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined),
    }),
    new SlashOption('Quote', {
      icon: Quote,
      keywords: ['block quote', 'quote'],
      onSelect: () => setBlock(() => $createQuoteNode()),
    }),
    new SlashOption('Code Block', {
      icon: Code2,
      keywords: ['code', 'codeblock', 'javascript'],
      onSelect: () => setBlock(() => $createCodeNode()),
    }),
    new SlashOption('Bold', {
      icon: Bold,
      keywords: ['bold', 'strong'],
      onSelect: () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold'),
    }),
    new SlashOption('Italic', {
      icon: Italic,
      keywords: ['italic', 'emphasis'],
      onSelect: () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic'),
    }),
    new SlashOption('Underline', {
      icon: Underline,
      keywords: ['underline'],
      onSelect: () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline'),
    }),
    new SlashOption('Align Left', {
      icon: AlignLeft,
      keywords: ['align', 'left'],
      onSelect: () => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'left'),
    }),
    new SlashOption('Align Center', {
      icon: AlignCenter,
      keywords: ['align', 'center'],
      onSelect: () => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'center'),
    }),
    new SlashOption('Align Right', {
      icon: AlignRight,
      keywords: ['align', 'right'],
      onSelect: () => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'right'),
    }),
  ];
}

/**
 * Lexical `/` slash command menu for chat (like the document editor).
 */
export default function ChatSlashMenuPlugin() {
  const [editor] = useLexicalComposerContext();
  const [queryString, setQueryString] = useState(null);
  const checkTrigger = useBasicTypeaheadTriggerMatch('/', { minLength: 0 });

  const options = useMemo(() => {
    const base = getSlashOptions(editor);
    if (!queryString) return base;
    const regex = new RegExp(queryString, 'i');
    return base.filter(
      (option) =>
        regex.test(option.title) ||
        option.keywords.some((keyword) => regex.test(keyword))
    );
  }, [editor, queryString]);

  const onSelectOption = useCallback(
    (selectedOption, nodeToRemove, closeMenu) => {
      editor.update(() => {
        nodeToRemove?.remove();
        selectedOption.onSelect();
        closeMenu();
      });
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
          <ChatTypeaheadPortal anchorRef={anchorElementRef} width={240}>
            <div className="px-3 py-1.5 text-[10px] uppercase tracking-wide text-muted-foreground border-b">
              Formatting
            </div>
            <ul className="py-1">
              {options.map((option, i) => (
                <SlashMenuItem
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
