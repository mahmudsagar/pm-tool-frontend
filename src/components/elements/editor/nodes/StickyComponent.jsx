/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import './StickyNode.css';

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { LexicalNestedComposer } from '@lexical/react/LexicalNestedComposer';
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin';
import { calculateZoomLevel } from '@lexical/utils';
import { $getNodeByKey } from 'lexical';
import { useEffect, useLayoutEffect, useRef } from 'react';

import StickyEditorTheme from '../themes/StickyEditorTheme';
import ContentEditable from '../ui/ContentEditable';
import { $isStickyNode } from './StickyNode';
import { PaintBucket, X } from 'lucide-react';

function positionSticky(
  stickyElem,
  positioning,
) {
  const style = stickyElem.style;
  const rootElementRect = positioning.rootElementRect;
  const rectLeft = rootElementRect !== null ? rootElementRect.left : 0;
  const rectTop = rootElementRect !== null ? rootElementRect.top : 0;
  style.top = rectTop + positioning.y + 'px';
  style.left = rectLeft + positioning.x + 'px';
}

export default function StickyComponent({
  x,
  y,
  nodeKey,
  color,
  caption,
}) {
  const [editor] = useLexicalComposerContext();
  const stickyContainerRef = useRef(null);
  const positioningRef = useRef({
    isDragging: false,
    offsetX: 0,
    offsetY: 0,
    rootElementRect: null,
    x: 0,
    y: 0,
  });

  useEffect(() => {
    const position = positioningRef.current;
    position.x = x;
    position.y = y;

    const stickyContainer = stickyContainerRef.current;
    if (stickyContainer !== null) {
      positionSticky(stickyContainer, position);
    }
  }, [x, y]);

  useLayoutEffect(() => {
    const position = positioningRef.current;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const { target } = entry;
        position.rootElementRect = target.getBoundingClientRect();
        const stickyContainer = stickyContainerRef.current;
        if (stickyContainer !== null) {
          positionSticky(stickyContainer, position);
        }
      }
    });

    const removeRootListener = editor.registerRootListener(
      (nextRootElem, prevRootElem) => {
        if (prevRootElem !== null) {
          resizeObserver.unobserve(prevRootElem);
        }
        if (nextRootElem !== null) {
          resizeObserver.observe(nextRootElem);
        }
      },
    );

    const handleWindowResize = () => {
      const rootElement = editor.getRootElement();
      const stickyContainer = stickyContainerRef.current;
      if (rootElement !== null && stickyContainer !== null) {
        position.rootElementRect = rootElement.getBoundingClientRect();
        positionSticky(stickyContainer, position);
      }
    };

    window.addEventListener('resize', handleWindowResize);

    return () => {
      window.removeEventListener('resize', handleWindowResize);
      removeRootListener();
    };
  }, [editor]);

  useEffect(() => {
    const stickyContainer = stickyContainerRef.current;
    if (stickyContainer !== null) {
      // Delay adding transition so we don't trigger the
      // transition on load of the sticky.
      setTimeout(() => {
        stickyContainer.style.setProperty(
          'transition',
          'top 0.3s ease 0s, left 0.3s ease 0s',
        );
      }, 500);
    }
  }, []);

  const handlePointerMove = (event) => {
    const stickyContainer = stickyContainerRef.current;
    const positioning = positioningRef.current;
    const rootElementRect = positioning.rootElementRect;
    const zoom = calculateZoomLevel(stickyContainer);
    if (
      stickyContainer !== null &&
      positioning.isDragging &&
      rootElementRect !== null
    ) {
      positioning.x =
        event.pageX / zoom - positioning.offsetX - rootElementRect.left;
      positioning.y =
        event.pageY / zoom - positioning.offsetY - rootElementRect.top;
      positionSticky(stickyContainer, positioning);
    }
  };

  const handlePointerUp = () => {
    const stickyContainer = stickyContainerRef.current;
    const positioning = positioningRef.current;
    if (stickyContainer !== null) {
      positioning.isDragging = false;
      stickyContainer.classList.remove('dragging');
      editor.update(() => {
        const node = $getNodeByKey(nodeKey);
        if ($isStickyNode(node)) {
          node.setPosition(positioning.x, positioning.y);
        }
      });
    }
    document.removeEventListener('pointermove', handlePointerMove);
    document.removeEventListener('pointerup', handlePointerUp);
  };

  const handleDelete = () => {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if ($isStickyNode(node)) {
        node.remove();
      }
    });
  };

  const handleColorChange = () => {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if ($isStickyNode(node)) {
        node.toggleColor();
      }
    });
  };

  return (
    <div ref={stickyContainerRef} className="sticky-note-container">
      <div
        className={`sticky-note ${color}`}
        onPointerDown={(event) => {
          const stickyContainer = stickyContainerRef.current;
          if (
            stickyContainer == null ||
            event.button === 2 ||
            event.target !== stickyContainer.firstChild
          ) {
            // Right click or click on editor should not work
            return;
          }
          const stickContainer = stickyContainer;
          const positioning = positioningRef.current;
          if (stickContainer !== null) {
            const { top, left } = stickContainer.getBoundingClientRect();
            const zoom = calculateZoomLevel(stickContainer);
            positioning.offsetX = event.clientX / zoom - left + 272;
            positioning.offsetY = event.clientY / zoom - top;
            positioning.isDragging = true;
            stickContainer.classList.add('dragging');
            document.addEventListener('pointermove', handlePointerMove);
            document.addEventListener('pointerup', handlePointerUp);
            event.preventDefault();
          }
        }}>
        <button
          onClick={handleDelete}
          className="delete"
          aria-label="Delete sticky note"
          title="Delete">
          <X size={16} />
        </button>
        <button
          onClick={handleColorChange}
          className="color"
          aria-label="Change sticky note color"
          title="Color">
          <PaintBucket size={14} />
        </button>
        <LexicalNestedComposer
          initialEditor={caption}
          initialTheme={StickyEditorTheme}>
          
            <HistoryPlugin />
          
          <PlainTextPlugin
            contentEditable={
              <ContentEditable
                placeholder="What's up?"
                placeholderClassName="StickyNode__placeholder"
                className="StickyNode__contentEditable"
              />
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
        </LexicalNestedComposer>
      </div>
    </div>
  );
}
