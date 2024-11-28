/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$wrapNodeInElement} from '@lexical/utils';
import {
  $createParagraphNode,
  $insertNodes,
  $isRootOrShadowRoot,
  COMMAND_PRIORITY_EDITOR,
  createCommand,
} from 'lexical';
import {useEffect, useState} from 'react';

import {
  $createPollNode,
  createPollOption,
  PollNode,
} from '../../nodes/PollNode';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';

export const INSERT_POLL_COMMAND = createCommand(
  'INSERT_POLL_COMMAND',
);

export function InsertPollDialog({
  activeEditor,
  onClose,
}) {
  const [question, setQuestion] = useState('');

  const onClick = () => {
    activeEditor.dispatchCommand(INSERT_POLL_COMMAND, question);
    onClose();
  };

  return (
    <>
      <Input label="Question" onChange={e => setQuestion(e.target.value)} value={question} />
      <DialogFooter>
        <Button disabled={question.trim() === ''} onClick={onClick}>
          Confirm
        </Button>
      </DialogFooter>
    </>
  );
}

export default function PollPlugin() {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    if (!editor.hasNodes([PollNode])) {
      throw new Error('PollPlugin: PollNode not registered on editor');
    }

    return editor.registerCommand(
      INSERT_POLL_COMMAND,
      (payload) => {
        const pollNode = $createPollNode(payload, [
          createPollOption(),
          createPollOption(),
        ]);
        $insertNodes([pollNode]);
        if ($isRootOrShadowRoot(pollNode.getParentOrThrow())) {
          $wrapNodeInElement(pollNode, $createParagraphNode).selectEnd();
        }

        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    );
  }, [editor]);
  return null;
}
