/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $createParagraphNode,
  $isElementNode,
  ElementNode
} from 'lexical';

import { $isCollapsibleContainerNode } from './CollapsibleContainerNode';
import { $isCollapsibleContentNode } from './CollapsibleContentNode';
import { isBrowser } from 'environment'
import { invariant } from '@/utils/helper';

export function $convertSummaryElement() {
  const node = $createCollapsibleTitleNode();
  return {
    node,
  };
}

export class CollapsibleTitleNode extends ElementNode {
  static getType() {
    return 'collapsible-title';
  }

  static clone(node) {
    return new CollapsibleTitleNode(node.__key);
  }

  createDOM(config, editor) {
    const dom = document.createElement('summary');
    dom.classList.add('Collapsible__title');
    if (isBrowser) {
      dom.addEventListener('click', () => {
        editor.update(() => {
          const collapsibleContainer = this.getLatest().getParentOrThrow();
          invariant(
            $isCollapsibleContainerNode(collapsibleContainer),
            'Expected parent node to be a CollapsibleContainerNode',
          );
          collapsibleContainer.toggleOpen();
        });
      });
    }
    return dom;
  }

  updateDOM() {
    return false;
  }

  static importDOM() {
    return {
      summary: () => {
        return {
          conversion: $convertSummaryElement,
          priority: 1,
        };
      },
    };
  }

  static importJSON() {
    return $createCollapsibleTitleNode();
  }

  exportJSON() {
    return {
      ...super.exportJSON(),
      type: 'collapsible-title',
      version: 1,
    };
  }

  collapseAtStart() {
    this.getParentOrThrow().insertBefore(this);
    return true;
  }

  insertNewAfter(_, restoreSelection = true) {
    const containerNode = this.getParentOrThrow();

    if (!$isCollapsibleContainerNode(containerNode)) {
      throw new Error(
        'CollapsibleTitleNode expects to be child of CollapsibleContainerNode',
      );
    }

    if (containerNode.getOpen()) {
      const contentNode = this.getNextSibling();
      if (!$isCollapsibleContentNode(contentNode)) {
        throw new Error(
          'CollapsibleTitleNode expects to have CollapsibleContentNode sibling',
        );
      }

      const firstChild = contentNode.getFirstChild();
      if ($isElementNode(firstChild)) {
        return firstChild;
      } else {
        const paragraph = $createParagraphNode();
        contentNode.append(paragraph);
        return paragraph;
      }
    } else {
      const paragraph = $createParagraphNode();
      containerNode.insertAfter(paragraph, restoreSelection);
      return paragraph;
    }
  }
}

export function $createCollapsibleTitleNode() {
  return new CollapsibleTitleNode();
}

export function $isCollapsibleTitleNode(node) {
  return node instanceof CollapsibleTitleNode;
}
