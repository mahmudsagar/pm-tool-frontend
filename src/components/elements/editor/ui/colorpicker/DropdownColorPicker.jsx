/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import ColorPicker from './ColorPicker';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export default function DropdownColorPicker({
  color,
  icon,
  label,
  onChange,
  ...rest
}) {
  return (
    <Popover>
      <PopoverTrigger {...rest}>
        <>
          {icon}
          {label && <span>{label}</span>}
        </>
      </PopoverTrigger>
      <PopoverContent>
        <ColorPicker color={color} onChange={onChange} />
      </PopoverContent>
    </Popover>
  );
}
