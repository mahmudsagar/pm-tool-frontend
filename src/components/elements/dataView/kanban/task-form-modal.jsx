import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import useStatusStore from '@/stores/useStatusStore';
import LabelsField from '@/components/elements/dataView/scrum/LabelsField';
import EpicField from '@/components/elements/dataView/scrum/EpicField';
import DodChecklistField from '@/components/elements/dataView/scrum/DodChecklistField';
import { syncRegistryWithLabels, parseLabelsString } from '@/components/elements/dataView/scrum/labelUtils';
import { syncRegistryWithEpics, parseEpicValue } from '@/components/elements/dataView/scrum/epicUtils';
import {
  clampScoreValue,
  SCORE_MAX,
  SCORE_MIN,
  validateScoreValue,
} from '@/components/elements/dataView/scrum/scrumBoardConstants';

const scoreFieldRules = {
  validate: (value) =>
    validateScoreValue(value) || `Enter a whole number from ${SCORE_MIN} to ${SCORE_MAX}`,
};

function TaskFormModal({
  open,
  onOpenChange,
  task = null,
  defaultStatus = "todo",
  defaultDate = null,
  onSave,
  assigneeOptions = [],
  boardFieldDefs = [],
  labelRegistry = {},
  onLabelRegistryChange,
  epicRegistry = {},
  onEpicRegistryChange,
}) {
  const { getStatusOptions } = useStatusStore();

  const statusFieldDef = useMemo(
    () => boardFieldDefs.find((f) => f.name === 'status'),
    [boardFieldDefs]
  );
  const statusOptionsForForm = useMemo(() => {
    const opts = statusFieldDef?.options;
    if (Array.isArray(opts) && opts.length) {
      return opts.map((o) => ({ label: o.label, value: String(o.value) }));
    }
    return getStatusOptions();
  }, [statusFieldDef, getStatusOptions]);

  const sprintFieldDef = useMemo(
    () => boardFieldDefs.find((f) => f.name === 'sprint'),
    [boardFieldDefs]
  );
  const sprintIsText = sprintFieldDef?.type === 'input';

  const showScrumExtras = useMemo(
    () =>
      boardFieldDefs.some((f) =>
        [
          'story_points',
          'epic',
          'labels',
          'moscow',
          'effort_score',
          'value_score',
          'dod_checklist',
        ].includes(f.name)
      ),
    [boardFieldDefs]
  );

  const moscowField = useMemo(
    () => boardFieldDefs.find((f) => f.name === 'moscow'),
    [boardFieldDefs]
  );
  const moscowOptions = moscowField?.options || [];
  
  // Other static options (these don't need to be global)
  const priorityOptions = [
    { label: "Low", value: "low" },
    { label: "Medium", value: "medium" },
    { label: "High", value: "high" },
    { label: "Critical", value: "critical" }
  ];

  const sprintOptions = [
    { label: "Sprint 1", value: "sprint-1" },
    { label: "Sprint 2", value: "sprint-2" },
    { label: "Sprint 3", value: "sprint-3" }
  ];

  const typeOptions = [
    { label: "Feature", value: "feature" },
    { label: "Backend", value: "backend" },
    { label: "Bug Fix", value: "bug" },
    { label: "Enhancement", value: "enhancement" }
  ];
  
  const isEditing = !!task;
  const form = useForm({
    defaultValues: {
      title: '',
      description: '',
      status: defaultStatus,
      priority: 'medium',
      assignee: '',
      due_date: '',
      start_date: '',
      sprint: 'sprint-1',
      type: 'feature',
      story_points: '',
      epic: '',
      labels: '',
      moscow: '',
      effort_score: '',
      value_score: '',
      dod_checklist: '',
    }
  });

  const effectiveDefaultStatus = statusOptionsForForm[0]?.value || defaultStatus;
  const defaultSprintForCreate = sprintIsText ? '' : 'sprint-1';

  // Reset form when task changes or modal opens
  useEffect(() => {
    if (task) {
      // Editing existing task
      form.reset({
        title: task.title || '',
        description: task.description || '',
        status: task.status || effectiveDefaultStatus,
        priority: task.priority || 'medium',
        assignee: task.assignee || '',
        due_date: task.due_date || '',
        start_date: task.start_date || '',
        sprint: task.sprint || (sprintIsText ? '' : 'sprint-1'),
        type: task.type || 'feature',
        story_points: task.story_points ?? '',
        epic: task.epic ?? '',
        labels: task.labels ?? '',
        moscow: task.moscow ?? '',
        effort_score: task.effort_score ?? '',
        value_score: task.value_score ?? '',
        dod_checklist: task.dod_checklist ?? '',
      });
    } else if (open) {
      // Creating new task
      const defaultDueDate = defaultDate ? defaultDate.toISOString().split('T')[0] : '';
      // Auto-select assignee when there is only one option (e.g. private board with owner only)
      const defaultAssignee = assigneeOptions.length === 1 ? assigneeOptions[0].value : '';
      form.reset({
        title: '',
        description: '',
        status: effectiveDefaultStatus,
        priority: 'medium',
        assignee: defaultAssignee,
        due_date: defaultDueDate,
        start_date: '',
        sprint: defaultSprintForCreate,
        type: 'feature',
        story_points: '',
        epic: '',
        labels: '',
        moscow: '',
        effort_score: '',
        value_score: '',
        dod_checklist: '',
      });
    }
  }, [task, effectiveDefaultStatus, defaultDate, open, form, assigneeOptions, sprintIsText, defaultSprintForCreate]);

  const onSubmit = (data) => {
    if (data.labels) {
      onLabelRegistryChange?.((prev) =>
        syncRegistryWithLabels(prev, parseLabelsString(data.labels))
      );
    }
    if (data.epic) {
      onEpicRegistryChange?.((prev) =>
        syncRegistryWithEpics(prev, [parseEpicValue(data.epic)])
      );
    }

    // Generate task ID for new tasks
    const taskId = task?.task_id || `BNH-${String(Math.floor(Math.random() * 1000) + 100).padStart(3, '0')}`;
    const id = task?.id || `task-${Date.now()}`;

    // When editing, preserve the existing custom_meta and update only the values
    // controlled by this form so unrelated fields are never silently dropped.
    const existingCustomMeta = task?.custom_meta;
    const updatedCustomMeta = existingCustomMeta
      ? {
          ...existingCustomMeta,
          values: {
            ...existingCustomMeta.values,
            status: data.status,
            priority: data.priority,
            assignee: data.assignee,
            due_date: data.due_date,
            start_date: data.start_date,
            type: data.type,
            sprint: data.sprint,
            story_points: data.story_points,
            epic: data.epic,
            labels: data.labels,
            moscow: data.moscow,
            effort_score: data.effort_score,
            value_score: data.value_score,
            dod_checklist: data.dod_checklist,
          },
        }
      : undefined;

    const taskData = {
      ...data,
      id,
      task_id: taskId,
      kanbanId: `demo-${id}`,
      ...(updatedCustomMeta ? { custom_meta: updatedCustomMeta } : {}),
    };

    onSave(taskData, isEditing);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Task' : 'Create New Task'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Title *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter task title" {...field} required autoFocus />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isEditing && showScrumExtras && (
                <>
                  <FormField
                    control={form.control}
                    name="story_points"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Story points</FormLabel>
                        <FormControl>
                          <Input type="text" inputMode="decimal" placeholder="e.g. 3" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="epic"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Epic</FormLabel>
                        <FormControl>
                          <EpicField
                            value={field.value}
                            onChange={field.onChange}
                            epicRegistry={epicRegistry}
                            onRegistryChange={onEpicRegistryChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="labels"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Labels</FormLabel>
                        <FormControl>
                          <LabelsField
                            value={field.value}
                            onChange={field.onChange}
                            labelRegistry={labelRegistry}
                            onRegistryChange={onLabelRegistryChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {moscowOptions.length > 0 && (
                    <FormField
                      control={form.control}
                      name="moscow"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>MoSCoW</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {moscowOptions.map((option) => (
                                <SelectItem key={option.value} value={String(option.value)}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  {boardFieldDefs.some((f) => f.name === 'effort_score') && (
                    <FormField
                      control={form.control}
                      name="effort_score"
                      rules={scoreFieldRules}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Effort (1–10)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={SCORE_MIN}
                              max={SCORE_MAX}
                              step={1}
                              {...field}
                              onBlur={(e) => field.onChange(clampScoreValue(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  {boardFieldDefs.some((f) => f.name === 'value_score') && (
                    <FormField
                      control={form.control}
                      name="value_score"
                      rules={scoreFieldRules}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Value (1–10)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={SCORE_MIN}
                              max={SCORE_MAX}
                              step={1}
                              {...field}
                              onBlur={(e) => field.onChange(clampScoreValue(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  {boardFieldDefs.some((f) => f.name === 'dod_checklist') && (
                    <FormField
                      control={form.control}
                      name="dod_checklist"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Definition of Done</FormLabel>
                          <FormControl>
                            <DodChecklistField
                              value={field.value}
                              onChange={field.onChange}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </>
              )}

              {isEditing && (
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter task description" 
                        rows={3} 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              )}

              {isEditing && (<>
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {statusOptionsForForm.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {priorityOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="assignee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assignee</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select assignee" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {assigneeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Due Date
                      {defaultDate && !task && (
                        <span className="text-sm text-blue-600 ml-2">
                          (Pre-selected: {defaultDate.toLocaleDateString()})
                        </span>
                      )}
                    </FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sprint"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sprint</FormLabel>
                    {sprintIsText ? (
                      <FormControl>
                        <Input placeholder="Sprint name or id" {...field} />
                      </FormControl>
                    ) : (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select sprint" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {sprintOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {typeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              </>)}
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {isEditing ? 'Update Task' : 'Create Task'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default TaskFormModal;
