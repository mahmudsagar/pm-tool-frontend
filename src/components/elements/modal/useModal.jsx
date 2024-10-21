/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import { useCallback, useMemo, useState } from 'react';
import Modal from '.';

export default function useModal() {
  const [modalContent, setModalContent] = useState(null);
  const [open, setOpen] = useState(false);

  const onClose = useCallback(() => {
    setModalContent(null);
    setOpen(false);
  }, []);

  const modal = useMemo(() => {
    if (modalContent === null) {
      return null;
    }
    const { title, content, closeOnClickOutside } = modalContent;
    return (
      <Modal
        open={open}
        onClose={onClose}
        title={title}
        closeOnClickOutside={closeOnClickOutside}>
        {content}
      </Modal>
    );
  }, [modalContent, onClose]);

  const showModal = useCallback(
    (
      title,
      // eslint-disable-next-line no-shadow
      getContent,
      closeOnClickOutside = false,
    ) => {
      setModalContent({
        closeOnClickOutside,
        content: getContent(onClose),
        title,
      });
      setOpen(true);
    },
    [onClose],
  );

  return [modal, showModal];
}
