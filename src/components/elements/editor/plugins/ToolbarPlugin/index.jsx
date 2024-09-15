/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $createCodeNode,
  $isCodeNode,
  CODE_LANGUAGE_FRIENDLY_NAME_MAP,
  CODE_LANGUAGE_MAP,
  getLanguageFriendlyName,
} from '@lexical/code';
import { $isLinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link';
import {
  $isListNode,
  INSERT_CHECK_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  ListNode,
} from '@lexical/list';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $isDecoratorBlockNode } from '@lexical/react/LexicalDecoratorBlockNode';
import { INSERT_HORIZONTAL_RULE_COMMAND } from '@lexical/react/LexicalHorizontalRuleNode';
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
  $isQuoteNode,
} from '@lexical/rich-text';
import {
  $getSelectionStyleValueForProperty,
  $isParentElementRTL,
  $patchStyleText,
  $setBlocksType,
} from '@lexical/selection';
import { $isTableNode, $isTableSelection } from '@lexical/table';
import {
  $findMatchingParent,
  $getNearestBlockElementAncestorOrThrow,
  $getNearestNodeOfType,
  $isEditorIsNestedEditor,
  mergeRegister,
} from '@lexical/utils';
import {
  $createParagraphNode,
  $getNodeByKey,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isRootOrShadowRoot,
  $isTextNode,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
  COMMAND_PRIORITY_NORMAL,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  INDENT_CONTENT_COMMAND,
  KEY_MODIFIER_COMMAND,
  OUTDENT_CONTENT_COMMAND,
  REDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
  UNDO_COMMAND,
} from 'lexical';
import { useCallback, useEffect, useState } from 'react';

import { getSelectedNode } from '../../utils/getSelectedNode';
import { sanitizeUrl } from '../../utils/url';
import {
  INSERT_IMAGE_COMMAND,
  InsertImageDialog,
} from '../ImagesPlugin';
import { InsertInlineImageDialog } from '../InlineImagePlugin';
import { InsertTableDialog } from '../TablePlugin';
import FontSize from './fontSize';
import { isMacOs } from 'environment';
import { useModal } from '@/components/elements/modal/useModal';
import Modal from '@/components/elements/modal';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { AArrowDown, ALargeSmall, AlignCenter, AlignEndHorizontal, AlignJustify, AlignLeft, AlignRight, AlignStartHorizontal, Baseline, Bold, BookA, CheckSquare, ChevronDown, Code, FoldVertical, Heading1, Heading2, Heading3, Image, ImagePlay, Indent, Italic, Link, List, ListOrdered, NotepadText, Outdent, PaintBucket, Plus, Quote, Redo, Strikethrough, Subscript, Superscript, Table, Text, Trash2, Underline, Undo } from 'lucide-react';
import DropdownColorPicker from '../../ui/colorpicker/DropdownColorPicker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import ColorPicker from '../../ui/colorpicker/ColorPicker';
const commonToolbarItemProps = {
  variant: 'ghost',
  className: 'gap-1 px-1.5 truncate',

}
const blockTypeToBlockName = {
  bullet: 'Bulleted List',
  check: 'Check List',
  code: 'Code Block',
  h1: 'Heading 1',
  h2: 'Heading 2',
  h3: 'Heading 3',
  h4: 'Heading 4',
  h5: 'Heading 5',
  h6: 'Heading 6',
  number: 'Numbered List',
  paragraph: 'Normal',
  quote: 'Quote',
};

const blockTypeIcons = {
  bullet: List,
  check: CheckSquare,
  code: Code,
  h1: Heading1,
  h2: Heading2,
  h3: Heading3,
  h4: Heading1,
  h5: Heading2,
  h6: Heading3,
  number: ListOrdered,
  paragraph: Text,
  quote: Quote,
};


function getCodeLanguageOptions() {
  const options = [];

  for (const [lang, friendlyName] of Object.entries(
    CODE_LANGUAGE_FRIENDLY_NAME_MAP,
  )) {
    options.push([lang, friendlyName]);
  }

  return options;
}

const CODE_LANGUAGE_OPTIONS = getCodeLanguageOptions();

const FONT_FAMILY_OPTIONS = [
  ['Arial', 'Arial'],
  ['Courier New', 'Courier New'],
  ['Georgia', 'Georgia'],
  ['Times New Roman', 'Times New Roman'],
  ['Trebuchet MS', 'Trebuchet MS'],
  ['Verdana', 'Verdana'],
];

const FONT_SIZE_OPTIONS = [
  ['10px', '10px'],
  ['11px', '11px'],
  ['12px', '12px'],
  ['13px', '13px'],
  ['14px', '14px'],
  ['15px', '15px'],
  ['16px', '16px'],
  ['17px', '17px'],
  ['18px', '18px'],
  ['19px', '19px'],
  ['20px', '20px'],
];

const ELEMENT_FORMAT_OPTIONS = {
  center: {
    icon: AlignCenter,
    iconRTL: AlignCenter,
    name: 'Center Align',
  },
  end: {
    icon: AlignRight,
    iconRTL: AlignLeft,
    name: 'End Align',
  },
  justify: {
    icon: AlignJustify,
    iconRTL: AlignJustify,
    name: 'Justify Align',
  },
  left: {
    icon: AlignLeft,
    iconRTL: AlignLeft,
    name: 'Left Align',
  },
  right: {
    icon: AlignRight,
    iconRTL: AlignRight,
    name: 'Right Align',
  },
  start: {
    icon: AlignLeft,
    iconRTL: AlignRight,
    name: 'Start Align',
  },
};

function dropDownActiveClass(active) {
  if (active) {
    return 'bg-slate-200 gap-1 cursor-pointer';
  } else {
    return 'gap-1 cursor-pointer';
  }
}

function BlockFormatDropDown({
  editor,
  blockType,
  disabled = false,
}) {
  const formatParagraph = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createParagraphNode());
      }
    });
  };

  const formatHeading = (headingSize) => {
    if (blockType !== headingSize) {
      editor.update(() => {
        const selection = $getSelection();
        $setBlocksType(selection, () => $createHeadingNode(headingSize));
      });
    }
  };

  const formatBulletList = () => {
    if (blockType !== 'bullet') {
      editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
    } else {
      formatParagraph();
    }
  };

  const formatCheckList = () => {
    if (blockType !== 'check') {
      editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined);
    } else {
      formatParagraph();
    }
  };

  const formatNumberedList = () => {
    if (blockType !== 'number') {
      editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
    } else {
      formatParagraph();
    }
  };

  const formatQuote = () => {
    if (blockType !== 'quote') {
      editor.update(() => {
        const selection = $getSelection();
        $setBlocksType(selection, () => $createQuoteNode());
      });
    }
  };

  const formatCode = () => {
    if (blockType !== 'code') {
      editor.update(() => {
        let selection = $getSelection();

        if (selection !== null) {
          if (selection.isCollapsed()) {
            $setBlocksType(selection, () => $createCodeNode());
          } else {
            const textContent = selection.getTextContent();
            const codeNode = $createCodeNode();
            selection.insertNodes([codeNode]);
            selection = $getSelection();
            if ($isRangeSelection(selection)) {
              selection.insertRawText(textContent);
            }
          }
        }
      });
    }
  };


  const CurrentBlockIcon = blockTypeIcons[blockType];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button {...commonToolbarItemProps} aria-label='Formatting options for text style' disabled={disabled}>
          <CurrentBlockIcon size={20} />
          {blockTypeToBlockName[blockType]}
          <ChevronDown size={18} />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent>
        <DropdownMenuItem
          className={dropDownActiveClass(blockType === 'paragraph')}
          onClick={formatParagraph}>
          <NotepadText size={16} />
          <span>Normal</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className={dropDownActiveClass(blockType === 'h1')}
          onClick={() => formatHeading('h1')}>
          <Heading1 size={16} />
          <span>Heading 1</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className={dropDownActiveClass(blockType === 'h2')}
          onClick={() => formatHeading('h2')}>
          <Heading2 size={16} />
          <span>Heading 2</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className={dropDownActiveClass(blockType === 'h3')}
          onClick={() => formatHeading('h3')}>
          <Heading3 size={16} />
          <span>Heading 3</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className={dropDownActiveClass(blockType === 'bullet')}
          onClick={formatBulletList}>
          <List size={16} />
          <span>Bullet List</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className={dropDownActiveClass(blockType === 'number')}
          onClick={formatNumberedList}>
          <ListOrdered size={16} />
          <span>Numbered List</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className={dropDownActiveClass(blockType === 'check')}
          onClick={formatCheckList}>
          <CheckSquare size={16} />
          <span>Check List</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className={dropDownActiveClass(blockType === 'quote')}
          onClick={formatQuote}>
          <Quote size={16} />
          <span>Quote</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className={dropDownActiveClass(blockType === 'code')}
          onClick={formatCode}>
          <Code size={16} />
          <span>Code Block</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Divider() {
  return <div className="divider" />;
}

function FontDropDown({
  editor,
  value,
  style,
  disabled = false,
}) {
  const handleClick = useCallback(
    (option) => {
      editor.update(() => {
        const selection = $getSelection();
        if (selection !== null) {
          $patchStyleText(selection, {
            [style]: option,
          });
        }
      });
    },
    [editor, style],
  );

  const buttonAriaLabel =
    style === 'font-family'
      ? 'Formatting options for font family'
      : 'Formatting options for font size';

  const ActiveIcon = style === 'font-family' ? BookA : null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button {...commonToolbarItemProps} aria-label={buttonAriaLabel} disabled={disabled}>
          {ActiveIcon && <ActiveIcon size={20} />}
          {value}
          <ChevronDown size={18} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {(style === 'font-family' ? FONT_FAMILY_OPTIONS : FONT_SIZE_OPTIONS).map(
          ([option, text]) => (
            <DropdownMenuItem
              className={`item ${dropDownActiveClass(value === option)} ${style === 'font-size' ? 'fontsize-item' : ''
                }`}
              onClick={() => handleClick(option)}
              key={option}>
              <span>{text}</span>
            </DropdownMenuItem>
          ),
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ElementFormatDropdown({
  editor,
  value,
  isRTL,
  disabled = false,
}) {
  const formatOption = ELEMENT_FORMAT_OPTIONS[value || 'left'];

  const ActiveIcon = isRTL ? formatOption.iconRTL : formatOption.icon;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button disabled={disabled} {...commonToolbarItemProps} aria-label='Formatting options for text alignment'>
          <ActiveIcon size={20} />
          {formatOption.name}
          <ChevronDown size={18} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem
          onClick={() => {
            editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'left');
          }}
          className="gap-1">
          <AlignLeft size={16} />
          <span>Left Align</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'center');
          }}
          className="gap-1">
          <AlignCenter size={16} />
          <span>Center Align</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'right');
          }}
          className="gap-1">
          <AlignRight size={16} />
          <span>Right Align</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'justify');
          }}
          className="gap-1">
          <AlignJustify size={16} />
          <span>Justify Align</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'start');
          }}
          className="gap-1">
          <AlignStartHorizontal size={16} />
          <span>Start Align</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'end');
          }}
          className="gap-1">
          <AlignEndHorizontal size={16} />
          <span>End Align</span>
        </DropdownMenuItem>
        <Divider />
        <DropdownMenuItem
          onClick={() => {
            editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined);
          }}
          className="gap-1">
          <Outdent size={16} />
          <span>Outdent</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined);
          }}
          className="gap-1">
          <Indent size={16} />
          <span>Indent</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function ToolbarPlugin({
  setIsLinkEditMode,
}) {
  const [editor] = useLexicalComposerContext();
  const [activeEditor, setActiveEditor] = useState(editor);
  const [blockType, setBlockType] =
    useState('paragraph');
  const [rootType, setRootType] =
    useState('root');
  const [selectedElementKey, setSelectedElementKey] = useState(
    null,
  );
  const [fontSize, setFontSize] = useState('15px');
  const [fontColor, setFontColor] = useState('#000');
  const [bgColor, setBgColor] = useState('#fff');
  const [fontFamily, setFontFamily] = useState('Arial');
  const [elementFormat, setElementFormat] = useState('left');
  const [isLink, setIsLink] = useState(false);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [isSubscript, setIsSubscript] = useState(false);
  const [isSuperscript, setIsSuperscript] = useState(false);
  const [isCode, setIsCode] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const { openModal, closeModal } = useModal();
  const [isRTL, setIsRTL] = useState(false);
  const [codeLanguage, setCodeLanguage] = useState('');
  const [isEditable, setIsEditable] = useState(() => editor.isEditable());
  const [isImageCaption, setIsImageCaption] = useState(false);

  const $updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      if (activeEditor !== editor && $isEditorIsNestedEditor(activeEditor)) {
        const rootElement = activeEditor.getRootElement();
        setIsImageCaption(
          !!rootElement?.parentElement?.classList.contains(
            'image-caption-container',
          ),
        );
      } else {
        setIsImageCaption(false);
      }

      const anchorNode = selection.anchor.getNode();
      let element =
        anchorNode.getKey() === 'root'
          ? anchorNode
          : $findMatchingParent(anchorNode, (e) => {
            const parent = e.getParent();
            return parent !== null && $isRootOrShadowRoot(parent);
          });

      if (element === null) {
        element = anchorNode.getTopLevelElementOrThrow();
      }

      const elementKey = element.getKey();
      const elementDOM = activeEditor.getElementByKey(elementKey);

      // Update text format
      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));
      setIsUnderline(selection.hasFormat('underline'));
      setIsStrikethrough(selection.hasFormat('strikethrough'));
      setIsSubscript(selection.hasFormat('subscript'));
      setIsSuperscript(selection.hasFormat('superscript'));
      setIsCode(selection.hasFormat('code'));
      setIsRTL($isParentElementRTL(selection));

      // Update links
      const node = getSelectedNode(selection);
      const parent = node.getParent();
      if ($isLinkNode(parent) || $isLinkNode(node)) {
        setIsLink(true);
      } else {
        setIsLink(false);
      }

      const tableNode = $findMatchingParent(node, $isTableNode);
      if ($isTableNode(tableNode)) {
        setRootType('table');
      } else {
        setRootType('root');
      }

      if (elementDOM !== null) {
        setSelectedElementKey(elementKey);
        if ($isListNode(element)) {
          const parentList = $getNearestNodeOfType(
            anchorNode,
            ListNode,
          );
          const type = parentList
            ? parentList.getListType()
            : element.getListType();
          setBlockType(type);
        } else {
          const type = $isHeadingNode(element)
            ? element.getTag()
            : element.getType();
          if (type in blockTypeToBlockName) {
            setBlockType(type);
          }
          if ($isCodeNode(element)) {
            const language =
              element.getLanguage();
            setCodeLanguage(
              language ? CODE_LANGUAGE_MAP[language] || language : '',
            );
            return;
          }
        }
      }
      // Handle buttons
      setFontColor(
        $getSelectionStyleValueForProperty(selection, 'color', '#000'),
      );
      setBgColor(
        $getSelectionStyleValueForProperty(
          selection,
          'background-color',
          '#fff',
        ),
      );
      setFontFamily(
        $getSelectionStyleValueForProperty(selection, 'font-family', 'Arial'),
      );
      let matchingParent;
      if ($isLinkNode(parent)) {
        // If node is a link, we need to fetch the parent paragraph node to set format
        matchingParent = $findMatchingParent(
          node,
          (parentNode) => $isElementNode(parentNode) && !parentNode.isInline(),
        );
      }

      // If matchingParent is a valid node, pass it's format type
      setElementFormat(
        $isElementNode(matchingParent)
          ? matchingParent.getFormatType()
          : $isElementNode(node)
            ? node.getFormatType()
            : parent?.getFormatType() || 'left',
      );
    }
    if ($isRangeSelection(selection) || $isTableSelection(selection)) {
      setFontSize(
        $getSelectionStyleValueForProperty(selection, 'font-size', '15px'),
      );
    }
  }, [activeEditor, editor]);

  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      (_payload, newEditor) => {
        setActiveEditor(newEditor);
        $updateToolbar();
        return false;
      },
      COMMAND_PRIORITY_CRITICAL,
    );
  }, [editor, $updateToolbar]);

  useEffect(() => {
    activeEditor.getEditorState().read(() => {
      $updateToolbar();
    });
  }, [activeEditor, $updateToolbar]);

  useEffect(() => {
    return mergeRegister(
      editor.registerEditableListener((editable) => {
        setIsEditable(editable);
      }),
      activeEditor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          $updateToolbar();
        });
      }),
      activeEditor.registerCommand(
        CAN_UNDO_COMMAND,
        (payload) => {
          setCanUndo(payload);
          return false;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
      activeEditor.registerCommand(
        CAN_REDO_COMMAND,
        (payload) => {
          setCanRedo(payload);
          return false;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
    );
  }, [$updateToolbar, activeEditor, editor]);

  useEffect(() => {
    return activeEditor.registerCommand(
      KEY_MODIFIER_COMMAND,
      (payload) => {
        const event = payload;
        const { code, ctrlKey, metaKey } = event;

        if (code === 'KeyK' && (ctrlKey || metaKey)) {
          event.preventDefault();
          let url;
          if (!isLink) {
            setIsLinkEditMode(true);
            url = sanitizeUrl('https://');
          } else {
            setIsLinkEditMode(false);
            url = null;
          }
          return activeEditor.dispatchCommand(TOGGLE_LINK_COMMAND, url);
        }
        return false;
      },
      COMMAND_PRIORITY_NORMAL,
    );
  }, [activeEditor, isLink, setIsLinkEditMode]);

  const applyStyleText = useCallback(
    (styles, skipHistoryStack) => {
      activeEditor.update(
        () => {
          const selection = $getSelection();
          if (selection !== null) {
            $patchStyleText(selection, styles);
          }
        },
        skipHistoryStack ? { tag: 'historic' } : {},
      );
    },
    [activeEditor],
  );

  const clearFormatting = useCallback(() => {
    activeEditor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection) || $isTableSelection(selection)) {
        const anchor = selection.anchor;
        const focus = selection.focus;
        const nodes = selection.getNodes();
        const extractedNodes = selection.extract();

        if (anchor.key === focus.key && anchor.offset === focus.offset) {
          return;
        }

        nodes.forEach((node, idx) => {
          // We split the first and last node by the selection
          // So that we don't format unselected text inside those nodes
          if ($isTextNode(node)) {
            // Use a separate variable to ensure TS does not lose the refinement
            let textNode = node;
            if (idx === 0 && anchor.offset !== 0) {
              textNode = textNode.splitText(anchor.offset)[1] || textNode;
            }
            if (idx === nodes.length - 1) {
              textNode = textNode.splitText(focus.offset)[0] || textNode;
            }
            /**
             * If the selected text has one format applied
             * selecting a portion of the text, could
             * clear the format to the wrong portion of the text.
             *
             * The cleared text is based on the length of the selected text.
             */
            // We need this in case the selected text only has one format
            const extractedTextNode = extractedNodes[0];
            if (nodes.length === 1 && $isTextNode(extractedTextNode)) {
              textNode = extractedTextNode;
            }

            if (textNode.__style !== '') {
              textNode.setStyle('');
            }
            if (textNode.__format !== 0) {
              textNode.setFormat(0);
              $getNearestBlockElementAncestorOrThrow(textNode).setFormat('');
            }
            node = textNode;
          } else if ($isHeadingNode(node) || $isQuoteNode(node)) {
            node.replace($createParagraphNode(), true);
          } else if ($isDecoratorBlockNode(node)) {
            node.setFormat('');
          }
        });
      }
    });
  }, [activeEditor]);

  const onFontColorSelect = useCallback(
    (value, skipHistoryStack) => {
      applyStyleText({ color: value }, skipHistoryStack);
    },
    [applyStyleText],
  );

  const onBgColorSelect = useCallback(
    (value, skipHistoryStack) => {
      applyStyleText({ 'background-color': value }, skipHistoryStack);
    },
    [applyStyleText],
  );

  const insertLink = useCallback(() => {
    if (!isLink) {
      setIsLinkEditMode(true);
      activeEditor.dispatchCommand(
        TOGGLE_LINK_COMMAND,
        sanitizeUrl('https://'),
      );
    } else {
      setIsLinkEditMode(false);
      activeEditor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    }
  }, [activeEditor, isLink, setIsLinkEditMode]);

  const onCodeLanguageSelect = useCallback(
    (value) => {
      activeEditor.update(() => {
        if (selectedElementKey !== null) {
          const node = $getNodeByKey(selectedElementKey);
          if ($isCodeNode(node)) {
            node.setLanguage(value);
          }
        }
      });
    },
    [activeEditor, selectedElementKey],
  );
  const insertGifOnClick = (payload) => {
    activeEditor.dispatchCommand(INSERT_IMAGE_COMMAND, payload);
  };

  const canViewerSeeInsertDropdown = false;
  const canViewerSeeInsertCodeButton = !isImageCaption;

  return (
    <div className="toolbar shadow">
      <Button
        disabled={!canUndo || !isEditable}
        onClick={() => {
          activeEditor.dispatchCommand(UNDO_COMMAND, undefined);
        }}
        title={isMacOs ? 'Undo (⌘Z)' : 'Undo (Ctrl+Z)'}
        aria-label="Undo" {...commonToolbarItemProps}>
        <Undo opacity={0.6} size={18} />
      </Button>
      <Button
        disabled={!canRedo || !isEditable}
        onClick={() => {
          activeEditor.dispatchCommand(REDO_COMMAND, undefined);
        }}
        title={isMacOs ? 'Redo (⇧⌘Z)' : 'Redo (Ctrl+Y)'}
        aria-label="Redo" {...commonToolbarItemProps}>
        <Redo opacity={0.6} size={18} />
      </Button>
      <Divider />
      {blockType in blockTypeToBlockName && activeEditor === editor && (
        <>
          <BlockFormatDropDown
            disabled={!isEditable}
            blockType={blockType}
            rootType={rootType}
            editor={activeEditor}
          />
          <Divider />
        </>
      )}
      {blockType === 'code' ? (
        <DropdownMenu
          disabled={!isEditable}
          buttonClassName="toolbar-item code-language"
          buttonLabel={getLanguageFriendlyName(codeLanguage)}
          buttonAriaLabel="Select language">
          <DropdownMenuContent>
            {CODE_LANGUAGE_OPTIONS.map(([value, name]) => {
              return (
                <DropdownMenuItem
                  className={`item ${dropDownActiveClass(
                    value === codeLanguage,
                  )}`}
                  onClick={() => onCodeLanguageSelect(value)}
                  key={value}>
                  <span className="text">{name}</span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <>
          <FontDropDown
            disabled={!isEditable}
            style={'font-family'}
            value={fontFamily}
            editor={activeEditor}
          />
          <Divider />
          <FontSize
            selectionFontSize={fontSize.slice(0, -2)}
            editor={activeEditor}
            disabled={!isEditable}
          />
          <Divider />
          <Button
            disabled={!isEditable}
            onClick={() => {
              activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
            }}
            className={isBold ? 'bg-slate-200' : ''}
            title={isMacOs ? 'Bold (⌘B)' : 'Bold (Ctrl+B)'}
            variant="ghost"
            size="icon"
            aria-label={`Format text as bold. Shortcut: ${isMacOs ? '⌘B' : 'Ctrl+B'
              }`}>
            <Bold size={18} opacity={isBold ? 1 : 0.6} />
          </Button>
          <Button
            disabled={!isEditable}
            onClick={() => {
              activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic');
            }}
            className={isItalic ? 'bg-slate-200' : ''}
            title={isMacOs ? 'Italic (⌘I)' : 'Italic (Ctrl+I)'}
            variant="ghost"
            size="icon"
            aria-label={`Format text as italics. Shortcut: ${isMacOs ? '⌘I' : 'Ctrl+I'
              }`}>
            <Italic size={18} opacity={isItalic ? 1 : 0.6} />
          </Button>
          <Button
            disabled={!isEditable}
            onClick={() => {
              activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline');
            }}
            className={isUnderline ? 'bg-slate-200' : ''}
            title={isMacOs ? 'Underline (⌘U)' : 'Underline (Ctrl+U)'}
            variant="ghost" size="icon"
            aria-label={`Format text to underlined. Shortcut: ${isMacOs ? '⌘U' : 'Ctrl+U'
              }`}>
            <Underline size={18} opacity={isUnderline ? 1 : 0.6} />
          </Button>
          {canViewerSeeInsertCodeButton && (
            <Button
              disabled={!isEditable}
              onClick={() => {
                activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code');
              }}
              className={isCode ? 'bg-slate-200' : ''}
              title="Insert code block"
              variant="ghost" size="icon"
              aria-label="Insert code block">
              <Code size={18} opacity={isCode ? 1 : 0.6} />
            </Button>
          )}
          <Button
            disabled={!isEditable}
            onClick={insertLink}
            className={isLink ? 'bg-slate-200' : ''}
            aria-label="Insert link"
            title="Insert link"
            size="icon" variant="ghost">
            <Link size={18} opacity={isLink ? 1 : 0.6} />
          </Button>

          <DropdownColorPicker
            color={fontColor}
            onChange={onFontColorSelect}
            title="text color"
            icon={<Baseline size={18} opacity={0.6} />}
          />
          <DropdownColorPicker
            disabled={!isEditable}
            icon={<PaintBucket size={18} opacity={0.6} />}
            color={bgColor}
            onChange={onBgColorSelect}
            title="bg color"
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild disabled={!isEditable} aria-label="Formatting options for additional text styles">
              <Button variant="ghost" size="icon">
                <ALargeSmall opacity={0.6} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  activeEditor.dispatchCommand(
                    FORMAT_TEXT_COMMAND,
                    'strikethrough',
                  );
                }}
                className={'item ' + dropDownActiveClass(isStrikethrough)}
                title="Strikethrough"
                aria-label="Format text with a strikethrough">
                <Strikethrough size={16} />
                <span className="text">Strikethrough</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'subscript');
                }}
                className={'item ' + dropDownActiveClass(isSubscript)}
                title="Subscript"
                aria-label="Format text with a subscript">
                <Subscript size={16} />
                <span className="text">Subscript</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  activeEditor.dispatchCommand(
                    FORMAT_TEXT_COMMAND,
                    'superscript',
                  );
                }}
                className={'item ' + dropDownActiveClass(isSuperscript)}
                title="Superscript"
                aria-label="Format text with a superscript">
                <Superscript size={16} />
                <span className="text">Superscript</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={clearFormatting}
                className="item"
                title="Clear text formatting"
                aria-label="Clear all text formatting">
                <Trash2 size={16} className='mr-0.5' />
                <span className="text">Clear Formatting</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {canViewerSeeInsertDropdown && (
            <>
              <Divider />
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild disabled={!isEditable} className="toolbar-item spaced" aria-label="Insert specialized editor node">
                  <Button variant="ghost" className="px-1">
                    <Plus size={18} />
                    <span className="text">Insert</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      activeEditor.dispatchCommand(
                        INSERT_HORIZONTAL_RULE_COMMAND,
                        undefined,
                      );
                    }}
                    className="cursor-pointer">
                    <FoldVertical size={16} />
                    <span className="ml-1">Horizontal Rule</span>
                  </DropdownMenuItem>
                  {/* <DropdownMenuItem
                  onClick={() => {
                    activeEditor.dispatchCommand(INSERT_PAGE_BREAK, undefined);
                  }}
                  className="cursor-pointer">
                  <i className="icon page-break" />
                  <span className="text">Page Break</span>
                </DropdownMenuItem> */}
                  <DropdownMenuItem
                    onClick={() => {
                      openModal({
                        title: 'Insert Image', content: <InsertImageDialog
                          activeEditor={activeEditor}
                          onClose={closeModal}
                        />
                      });
                    }}
                    className="cursor-pointer">
                    <Image size={16} />
                    <span className="ml-1">Image</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      openModal({
                        title: 'Insert Inline Image', content: <InsertInlineImageDialog
                          activeEditor={activeEditor}
                          onClose={closeModal}
                        />
                      });
                    }}
                    className="cursor-pointer">
                    <Image size={16} />
                    <span className="ml-1">Inline Image</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      insertGifOnClick({
                        altText: 'Cat typing on a laptop',
                        src: 'catTypingGif',
                      })
                    }
                    className="cursor-pointer">
                    <ImagePlay size={16} />
                    <span className="ml-1">GIF</span>
                  </DropdownMenuItem>
                  {/* <DropdownMenuItem
                  onClick={() => {
                    activeEditor.dispatchCommand(
                      INSERT_EXCALIDRAW_COMMAND,
                      undefined,
                    );
                  }}
                  className="cursor-pointer">
                  <i className="icon diagram-2" />
                  <span className="text">Excalidraw</span>
                </DropdownMenuItem> */}
                  <DropdownMenuItem
                    onClick={() => {
                      openModal({
                        title: 'Insert Table', content: <InsertTableDialog
                          activeEditor={activeEditor}
                          onClose={closeModal}
                        />
                      });

                    }}
                    className="cursor-pointer">
                    <Table size={16} />
                    <span className="ml-1">Table</span>
                  </DropdownMenuItem>
                  {/* <DropdownMenuItem
                  onClick={() => {
                    openModal({
                      title: 'Insert Poll',
                      content: <InsertPollDialog
                        activeEditor={activeEditor}
                        onClose={closeModal}
                      />
                    });
                  }}
                  className="cursor-pointer">
                  <i className="icon poll" />
                  <span className="text">Poll</span>
                </DropdownMenuItem> */}
                  {/* <DropdownMenuItem
                  onClick={() => {
                    openModal({
                      title: 'Insert Columns Layout', content: <InsertLayoutDialog
                        activeEditor={activeEditor}
                        onClose={closeModal}
                      />
                    });
                  }}
                  className="cursor-pointer">
                  <i className="icon columns" />
                  <span className="text">Columns Layout</span>
                </DropdownMenuItem> */}

                  {/* <DropdownMenuItem
                  onClick={() => {
                    openModal({
                      title: 'Insert Equation', content: <InsertEquationDialog
                        activeEditor={activeEditor}
                        onClose={closeModal}
                      />
                    });
                  }}
                  className="cursor-pointer">
                  <i className="icon equation" />
                  <span className="text">Equation</span>
                </DropdownMenuItem> */}
                  {/* <DropdownMenuItem
                  onClick={() => {
                    editor.update(() => {
                      const root = $getRoot();
                      const stickyNode = $createStickyNode(0, 0);
                      root.append(stickyNode);
                    });
                  }}
                  className="cursor-pointer">
                  <i className="icon sticky" />
                  <span className="text">Sticky Note</span>
                </DropdownMenuItem> */}
                  {/* <DropdownMenuItem
                  onClick={() => {
                    editor.dispatchCommand(
                      INSERT_COLLAPSIBLE_COMMAND,
                      undefined,
                    );
                  }}
                  className="cursor-pointer">
                  <i className="icon caret-right" />
                  <span className="text">Collapsible container</span>
                </DropdownMenuItem> */}
                  {/* {EmbedConfigs.map((embedConfig) => (
                  <DropdownMenuItem
                    key={embedConfig.type}
                    onClick={() => {
                      activeEditor.dispatchCommand(
                        INSERT_EMBED_COMMAND,
                        embedConfig.type,
                      );
                    }}
                    className="cursor-pointer">
                    {embedConfig.icon}
                    <span className="text">{embedConfig.contentName}</span>
                  </DropdownMenuItem>
                ))} */}
                </DropdownMenuContent >
              </DropdownMenu >
            </>
          )
          }
        </>
      )}
      <Divider />
      <ElementFormatDropdown
        disabled={!isEditable}
        value={elementFormat}
        editor={activeEditor}
        isRTL={isRTL}
      />
    </div >
  );
}
