/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import { useState } from 'react';

import { INSERT_LAYOUT_COMMAND } from './LayoutPlugin';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DialogFooter } from '@/components/ui/dialog';

const LAYOUTS = [
  { label: '2 columns (equal width)', value: '1fr 1fr' },
  { label: '2 columns (25% - 75%)', value: '1fr 3fr' },
  { label: '3 columns (equal width)', value: '1fr 1fr 1fr' },
  { label: '3 columns (25% - 50% - 25%)', value: '1fr 2fr 1fr' },
  { label: '4 columns (equal width)', value: '1fr 1fr 1fr 1fr' },
];

export default function InsertLayoutDialog({
  activeEditor,
  onClose,
}) {
  const [layout, setLayout] = useState(LAYOUTS[0].value);
  const buttonLabel = LAYOUTS.find((item) => item.value === layout)?.label;

  const onClick = () => {
    activeEditor.dispatchCommand(INSERT_LAYOUT_COMMAND, layout);
    onClose();
  };

  return (
    <div className='w-72'>
      {/* <DropdownMenu
        buttonClassName="toolbar-item dialog-dropdown"
        buttonLabel={buttonLabel}>
        {LAYOUTS.map(({ label, value }) => (
          <DropdownMenuItem
            key={value}
            className="item"
            onClick={() => setLayout(value)}>
            <span className="text">{label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenu> */}

      <Select>
        <SelectTrigger >
          <SelectValue placeholder={buttonLabel} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {LAYOUTS.map(({ label, value }) => (
              <SelectItem onClick={() => setLayout(value)} key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <DialogFooter>
      <Button className="mt-3" onClick={onClick}>Insert</Button>
      </DialogFooter>
    </div>
  );
}
