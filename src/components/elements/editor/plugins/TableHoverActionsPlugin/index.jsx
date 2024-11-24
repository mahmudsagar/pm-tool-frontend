/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getTableColumnIndexFromTableCellNode,
  $getTableRowIndexFromTableCellNode,
  $insertTableColumn__EXPERIMENTAL,
  $insertTableRow__EXPERIMENTAL,
  $isTableCellNode,
  $isTableNode,
  TableNode,
} from '@lexical/table';
import { $findMatchingParent, mergeRegister } from '@lexical/utils';
import { $getNearestNodeFromDOMNode } from 'lexical';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDebounce } from '../../utils/debounce';
import { Plus } from 'lucide-react';


const BUTTON_WIDTH_PX = 20;

function TableHoverActionsContainer({ anchorElem }) {
  const [editor] = useLexicalComposerContext();
  const [isShownRow, setShownRow] = useState(false);
  const [isShownColumn, setShownColumn] = useState(false);
  const [shouldListenMouseMove, setShouldListenMouseMove] = useState(false);
  const [position, setPosition] = useState({});
  const codeSetRef = useRef(new Set());
  const tableDOMNodeRef = useRef(null);

  const debouncedOnMouseMove = useDebounce(
    (event) => {
      const { isOutside, tableDOMNode } = getMouseInfo(event);

      if (isOutside) {
        setShownRow(false);
        setShownColumn(false);
        return;
      }

      if (!tableDOMNode) {
        return;
      }

      tableDOMNodeRef.current = tableDOMNode;

      let hoveredRowNode = null;
      let hoveredColumnNode = null;
      let tableDOMElement = null;

      editor.update(() => {
        const maybeTableCell = $getNearestNodeFromDOMNode(tableDOMNode);

        if ($isTableCellNode(maybeTableCell)) {
          const table = $findMatchingParent(maybeTableCell, (node) =>
            $isTableNode(node)
          );
          if (!$isTableNode(table)) {
            return;
          }

          tableDOMElement = editor.getElementByKey(table?.getKey());

          if (tableDOMElement) {
            const rowCount = table.getChildrenSize();
            const colCount = table.getChildAtIndex(0)?.getChildrenSize();

            const rowIndex = $getTableRowIndexFromTableCellNode(maybeTableCell);
            const colIndex = $getTableColumnIndexFromTableCellNode(maybeTableCell);

            if (rowIndex === rowCount - 1) {
              hoveredRowNode = maybeTableCell;
            } else if (colIndex === colCount - 1) {
              hoveredColumnNode = maybeTableCell;
            }
          }
        }
      });

      if (tableDOMElement) {
        const {
          width: tableElemWidth,
          y: tableElemY,
          x: tableElemX,
          right: tableElemRight,
          bottom: tableElemBottom,
          height: tableElemHeight,
        } = tableDOMElement.getBoundingClientRect();

        const { y: editorElemY } = anchorElem.getBoundingClientRect();

        if (hoveredRowNode) {
          setShownColumn(false);
          setShownRow(true);
          setPosition({
            height: BUTTON_WIDTH_PX,
            left: tableElemX,
            top: tableElemBottom - editorElemY + 5,
            width: tableElemWidth,
          });
        } else if (hoveredColumnNode) {
          setShownColumn(true);
          setShownRow(false);
          setPosition({
            height: tableElemHeight,
            left: tableElemRight + 5,
            top: tableElemY - editorElemY,
            width: BUTTON_WIDTH_PX,
          });
        }
      }
    },
    50,
    250
  );

  useEffect(() => {
    if (!shouldListenMouseMove) {
      return;
    }

    document.addEventListener('mousemove', debouncedOnMouseMove);

    return () => {
      setShownRow(false);
      setShownColumn(false);
      // debouncedOnMouseMove.cancel();
      document.removeEventListener('mousemove', debouncedOnMouseMove);
    };
  }, [shouldListenMouseMove, debouncedOnMouseMove]);

  useEffect(() => {
    return mergeRegister(
      editor.registerMutationListener(
        TableNode,
        (mutations) => {
          editor.getEditorState().read(() => {
            for (const [key, type] of mutations) {
              switch (type) {
                case 'created':
                  codeSetRef.current.add(key);
                  setShouldListenMouseMove(codeSetRef.current.size > 0);
                  break;

                case 'destroyed':
                  codeSetRef.current.delete(key);
                  setShouldListenMouseMove(codeSetRef.current.size > 0);
                  break;

                default:
                  break;
              }
            }
          });
        },
        { skipInitialization: false }
      )
    );
  }, [editor]);

  const insertAction = (insertRow) => {
    editor.update(() => {
      if (tableDOMNodeRef.current) {
        const maybeTableNode = $getNearestNodeFromDOMNode(tableDOMNodeRef.current);
        maybeTableNode?.selectEnd();
        if (insertRow) {
          $insertTableRow__EXPERIMENTAL();
          setShownRow(false);
        } else {
          $insertTableColumn__EXPERIMENTAL();
          setShownColumn(false);
        }
      }
    });
  };

  return (
    <>
      {isShownRow && (
        <button
          className={'PlaygroundEditorTheme__tableAddRows'}
          style={{ ...position }}
          onClick={() => insertAction(true)}
        >
          <Plus size={16} />
        </button>
      )}
      {isShownColumn && (
        <button
          className={'PlaygroundEditorTheme__tableAddColumns'}
          style={{ ...position }}
          onClick={() => insertAction(false)}
        >
           <Plus size={16} />
        </button>
      )}
    </>
  );
}

function getMouseInfo(event) {
  const target = event.target;

  if (target && target instanceof HTMLElement) {
    const tableDOMNode = target.closest(
      'td.PlaygroundEditorTheme__tableCell, th.PlaygroundEditorTheme__tableCell'
    );

    const isOutside = !(
      tableDOMNode ||
      target.closest('button.PlaygroundEditorTheme__tableAddRows') ||
      target.closest('button.PlaygroundEditorTheme__tableAddColumns') ||
      target.closest('div.TableCellResizer__resizer')
    );

    return { isOutside, tableDOMNode };
  } else {
    return { isOutside: true, tableDOMNode: null };
  }
}

export default function TableHoverActionsPlugin({ anchorElem = document.body }) {
  return createPortal(
    <TableHoverActionsContainer anchorElem={anchorElem} />,
    anchorElem
  );
}
