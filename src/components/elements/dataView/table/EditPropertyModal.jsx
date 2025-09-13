import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function EditPropertyModal({ open, onClose, property, onSave }) {
  const [name, setName] = useState(property?.name || "");
  const [label, setLabel] = useState(property?.label || "");
  const [type, setType] = useState(property?.type || "text");
  const [options, setOptions] = useState(
    property?.type === "select" && property?.props?.optionsData
      ? [...property.props.optionsData]
      : []
  );

  const handleOptionChange = (idx, field, value) => {
    setOptions(options.map((opt, i) => i === idx ? { ...opt, [field]: value } : opt));
  };

  const handleAddOption = () => {
    setOptions([...options, { label: "", value: "" }]);
  };

  const handleDeleteOption = (idx) => {
    setOptions(options.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    const updated = {
      ...property,
      name,
      label,
      type,
      props: type === "select" ? { ...property?.props, optionsData: options } : {},
    };
    onSave(updated);
    onClose();
  };

  React.useEffect(() => {
    setName(property?.name || "");
    setLabel(property?.label || "");
    setType(property?.type || "text");
    setOptions(
      property?.type === "select" && property?.props?.optionsData
        ? [...property.props.optionsData]
        : []
    );
  }, [property]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-full rounded-xl p-0 overflow-visible" style={{ top: '10vh', left: '50%', transform: 'translate(-50%, 0)', position: 'fixed' }}>
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>Edit Property</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 px-6 pb-6 pt-2">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <Input value={label} onChange={e => setLabel(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select
              className="w-full border rounded px-2 py-1"
              value={type}
              onChange={e => setType(e.target.value)}
            >
              <option value="text">Text</option>
              <option value="select">Select</option>
            </select>
          </div>
          {type === "select" && (
            <div>
              <label className="block text-sm font-medium mb-1">Options</label>
              <div className="space-y-2">
                {options.map((opt, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <Input
                      placeholder="Label"
                      value={opt.label}
                      onChange={e => handleOptionChange(idx, "label", e.target.value)}
                    />
                    <Input
                      placeholder="Value"
                      value={opt.value}
                      onChange={e => handleOptionChange(idx, "value", e.target.value)}
                    />
                    <Button variant="destructive" size="icon" onClick={() => handleDeleteOption(idx)}>-</Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={handleAddOption}>Add Option</Button>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}