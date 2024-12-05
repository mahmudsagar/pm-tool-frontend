
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {
  ElementNode,
  isHTMLElement
} from 'lexical';

import {setDomHiddenUntilFound} from './CollapsibleUtils';
import { invariant } from '@/utils/helper';
import { isBrowser } from 'environment';

export function $convertDetailsElement(domNode) {
  const isOpen = domNode.open !== undefined ? domNode.open : true;
  const node = $createCollapsibleContainerNode(isOpen);
  return {
    node,
  };
}

export class CollapsibleContainerNode extends ElementNode {
  constructor(open, key) {
    super(key);
    this.__open = open;
  }

  static getType() {
    return 'collapsible-container';
  }

  static clone(node) {
    return new CollapsibleContainerNode(node.__open, node.__key);
  }

  createDOM(config, editor) {
    let dom;
    if (isBrowser) {
      dom = document.createElement('div');
      dom.setAttribute('open', '');
    } else {
      const detailsDom = document.createElement('details');
      detailsDom.open = this.__open;
      detailsDom.addEventListener('toggle', () => {
        const open = editor.getEditorState().read(() => this.getOpen());
        if (open !== detailsDom.open) {
          editor.update(() => this.toggleOpen());
        }
      });
      dom = detailsDom;
    }
    dom.classList.add('Collapsible__container');

    return dom;
  }

  updateDOM(prevNode, dom) {
    const currentOpen = this.__open;
    if (prevNode.__open !== currentOpen) {
      if (isBrowser) {
        const contentDom = dom.children[1];
        invariant(
          isHTMLElement(contentDom),
          'Expected contentDom to be an HTMLElement',
        );
        if (currentOpen) {
          dom.setAttribute('open', '');
          contentDom.hidden = false;
        } else {
          dom.removeAttribute('open');
          setDomHiddenUntilFound(contentDom);
        }
      } else {
        dom.open = this.__open;
      }
    }

    return false;
  }

  static importDOM() {
    return {
      details: () => {
        return {
          conversion: $convertDetailsElement,
          priority: 1,
        };
      },
    };
  }

  static importJSON(serializedNode) {
    const node = $createCollapsibleContainerNode(serializedNode.open);
    return node;
  }

  exportDOM() {
    const element = document.createElement('details');
    element.classList.add('Collapsible__container');
    element.setAttribute('open', this.__open.toString());
    return {element};
  }

  exportJSON() {
    return {
      ...super.exportJSON(),
      open: this.__open,
      type: 'collapsible-container',
      version: 1,
    };
  }

  setOpen(open) {
    const writable = this.getWritable();
    writable.__open = open;
  }

  getOpen() {
    return this.getLatest().__open;
  }

  toggleOpen() {
    this.setOpen(!this.getOpen());
  }
}

export function $createCollapsibleContainerNode(isOpen) {
  return new CollapsibleContainerNode(isOpen);
}

export function $isCollapsibleContainerNode(node) {
  return node instanceof CollapsibleContainerNode;
}