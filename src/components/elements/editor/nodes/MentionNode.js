/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $applyNodeReplacement,
  TextNode,
} from 'lexical';

function $convertMentionElement(domNode) {
  const textContent = domNode.textContent;
  const userId = domNode.getAttribute('data-lexical-mention-id') || undefined;

  if (textContent !== null) {
    const node = $createMentionNode(textContent, userId);
    return { node };
  }

  return null;
}

const mentionStyle = 'background-color: rgba(24, 119, 232, 0.2)';

export class MentionNode extends TextNode {
  __mention;
  __userId;

  static getType() {
    return 'mention';
  }

  static clone(node) {
    return new MentionNode(node.__mention, node.__text, node.__key, node.__userId);
  }

  static importJSON(serializedNode) {
    const node = $createMentionNode(
      serializedNode.mentionName,
      serializedNode.userId
    );
    node.setTextContent(serializedNode.text);
    node.setFormat(serializedNode.format);
    node.setDetail(serializedNode.detail);
    node.setMode(serializedNode.mode);
    node.setStyle(serializedNode.style);
    return node;
  }

  constructor(mentionName, text, key, userId) {
    super(text ?? mentionName, key);
    this.__mention = mentionName;
    this.__userId = userId || null;
  }

  getUserId() {
    return this.__userId;
  }

  exportJSON() {
    return {
      ...super.exportJSON(),
      mentionName: this.__mention,
      userId: this.__userId || undefined,
      type: 'mention',
      version: 1,
    };
  }

  createDOM(config) {
    const dom = super.createDOM(config);
    dom.style.cssText = mentionStyle;
    dom.className = 'mention';
    if (this.__userId) {
      dom.setAttribute('data-lexical-mention-id', this.__userId);
    }
    return dom;
  }

  exportDOM() {
    const element = document.createElement('span');
    element.setAttribute('data-lexical-mention', 'true');
    if (this.__userId) {
      element.setAttribute('data-lexical-mention-id', this.__userId);
    }
    element.textContent = this.__text;
    return { element };
  }

  static importDOM() {
    return {
      span: (domNode) => {
        if (!domNode.hasAttribute('data-lexical-mention')) {
          return null;
        }
        return {
          conversion: $convertMentionElement,
          priority: 1,
        };
      },
    };
  }

  isTextEntity() {
    return true;
  }

  canInsertTextBefore() {
    return false;
  }

  canInsertTextAfter() {
    return false;
  }
}

export function $createMentionNode(mentionName, userId) {
  const mentionNode = new MentionNode(mentionName, undefined, undefined, userId);
  mentionNode.setMode('segmented').toggleDirectionless();
  return $applyNodeReplacement(mentionNode);
}

export function $isMentionNode(node) {
  return node instanceof MentionNode;
}
