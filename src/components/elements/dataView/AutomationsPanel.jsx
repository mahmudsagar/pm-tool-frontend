import { useMemo } from "react";
import { Bot, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const DEFAULT_AUTOMATIONS = {
  status: true,
  dates: true,
  assignment: true,
  priority: true,
  typeBased: true,
  dependency: true,
  notifications: true,
  recurring: true,
  workflowRules: [],
};

const WORKFLOW_ACTION_OPTIONS = [
  { value: "assign", label: "Assign to person" },
  { value: "set_status", label: "Set status" },
  { value: "set_priority", label: "Set priority" },
  { value: "add_tag", label: "Add tag" },
  { value: "set_start_date_offset", label: "Set start date offset" },
];

const WORKFLOW_OPERATOR_OPTIONS = [
  { value: "equals", label: "equals" },
  { value: "not_equals", label: "not equals" },
];

const makeRule = () => ({
  id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  enabled: true,
  trigger: { field: "status", operator: "equals", value: "Done" },
  action: { type: "assign", value: "" },
});

export default function AutomationsPanel({
  automations,
  fields = [],
  assigneeOptions = [],
  onChange,
  onSave,
}) {
  const value = automations || DEFAULT_AUTOMATIONS;
  const fieldOptions = useMemo(
    () =>
      (fields || [])
        .filter((f) => f?.name && f?.name !== "task_id")
        .map((f) => ({ name: f.name, label: f.label || f.name })),
    [fields]
  );

  const activeRules = (value.workflowRules || []).filter((rule) => rule?.enabled).length;

  const updateRoot = (key, nextVal) => onChange?.({ ...value, [key]: nextVal });
  const updateRule = (ruleId, patch) => {
    const nextRules = (value.workflowRules || []).map((rule) =>
      rule.id === ruleId ? { ...rule, ...patch } : rule
    );
    updateRoot("workflowRules", nextRules);
  };
  const removeRule = (ruleId) =>
    updateRoot(
      "workflowRules",
      (value.workflowRules || []).filter((rule) => rule.id !== ruleId)
    );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 text-muted-foreground">
          <Bot className="h-3.5 w-3.5" />
          Automations
          {activeRules > 0 && (
            <Badge variant="secondary" className="ml-0.5 h-4 px-1 text-[10px]">
              {activeRules}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[520px] p-3">
        <div className="mb-2">
          <h4 className="text-sm font-semibold">Automation settings</h4>
          <p className="text-xs text-muted-foreground">
            Toggle automation categories and configure workflow trigger-action rules.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-b pb-3">
          {[
            ["status", "Status automations"],
            ["dates", "Date & deadline automations"],
            ["assignment", "Assignment automations"],
            ["priority", "Priority automations"],
            ["typeBased", "Type-based automations"],
            ["dependency", "Dependency automations"],
            ["notifications", "Notification automations"],
            ["recurring", "Recurring automations"],
          ].map(([key, label]) => (
            <label key={key} className="flex items-center justify-between gap-2 text-xs">
              <span>{label}</span>
              <Switch checked={Boolean(value[key])} onCheckedChange={(next) => updateRoot(key, Boolean(next))} />
            </label>
          ))}
        </div>

        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-semibold uppercase text-muted-foreground">Workflow rules</h5>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => updateRoot("workflowRules", [...(value.workflowRules || []), makeRule()])}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add rule
            </Button>
          </div>

          {(value.workflowRules || []).length === 0 && (
            <p className="text-xs text-muted-foreground">No workflow rules configured.</p>
          )}

          {(value.workflowRules || []).map((rule) => (
            <div key={rule.id} className="rounded-md border p-2 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">Rule</span>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={Boolean(rule.enabled)}
                    onCheckedChange={(next) => updateRule(rule.id, { enabled: Boolean(next) })}
                  />
                  <button
                    type="button"
                    onClick={() => removeRule(rule.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Select
                  value={rule.trigger?.field || "status"}
                  onValueChange={(next) =>
                    updateRule(rule.id, {
                      trigger: { ...(rule.trigger || {}), field: next },
                    })
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Field" />
                  </SelectTrigger>
                  <SelectContent>
                    {fieldOptions.map((field) => (
                      <SelectItem key={field.name} value={field.name} className="text-xs">
                        {field.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={rule.trigger?.operator || "equals"}
                  onValueChange={(next) =>
                    updateRule(rule.id, {
                      trigger: { ...(rule.trigger || {}), operator: next },
                    })
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Operator" />
                  </SelectTrigger>
                  <SelectContent>
                    {WORKFLOW_OPERATOR_OPTIONS.map((op) => (
                      <SelectItem key={op.value} value={op.value} className="text-xs">
                        {op.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  className="h-8 text-xs"
                  value={rule.trigger?.value || ""}
                  onChange={(e) =>
                    updateRule(rule.id, {
                      trigger: { ...(rule.trigger || {}), value: e.target.value },
                    })
                  }
                  placeholder="Trigger value"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Select
                  value={rule.action?.type || "assign"}
                  onValueChange={(next) =>
                    updateRule(rule.id, {
                      action: { ...(rule.action || {}), type: next },
                    })
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Action" />
                  </SelectTrigger>
                  <SelectContent>
                    {WORKFLOW_ACTION_OPTIONS.map((action) => (
                      <SelectItem key={action.value} value={action.value} className="text-xs">
                        {action.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {rule.action?.type === "assign" ? (
                  <Select
                    value={rule.action?.value || ""}
                    onValueChange={(next) =>
                      updateRule(rule.id, {
                        action: { ...(rule.action || {}), value: next },
                      })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Assignee" />
                    </SelectTrigger>
                    <SelectContent>
                      {assigneeOptions.map((u) => (
                        <SelectItem key={String(u.value)} value={String(u.value)} className="text-xs">
                          {u.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    className="h-8 text-xs"
                    value={rule.action?.value || ""}
                    onChange={(e) =>
                      updateRule(rule.id, {
                        action: { ...(rule.action || {}), value: e.target.value },
                      })
                    }
                    placeholder="Action value"
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 flex justify-end">
          <Button type="button" size="sm" className="h-8 text-xs" onClick={() => onSave?.(value)}>
            Save automations
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
