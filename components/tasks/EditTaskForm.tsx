// components/tasks/EditTaskForm.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { DatePicker } from '@/components/ui/date-picker';

// ─── Constants ──────────────────────────────────────────────────────────

const TASK_STATUSES = [
  'PENDING',
  'ACTIVE',
  'IN_REVIEW',
  'COMPLETED',
  'CANCELLED',
] as const;

const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

// ─── Types ──────────────────────────────────────────────────────────────

interface TaskData {
  id: string;
  taskNo: string | null;
  taskType: string;
  title: string | null;
  description: string | null;
  status: string;
  priority: string;
  progress: number;
  estimatedHours: number;
  actualHours: number;
  startDate: string | null;
  endDate: string | null;
  dueDate: string | null;
  locationName: string | null;
  latitude: number | null;
  longitude: number | null;
  radius: number;
  projectId: string;
  categoryId: string | null;
  milestoneId: string | null;
  contractId: string | null;
  project: {
    id: string;
    name: string;
    projectNo: string | null;
    currency: string;
    client: { id: string; clientName: string };
  };
  category: { id: string; name: string } | null;
  milestone: { id: string; name: string } | null;
  contract: { id: string; contractNo: string | null; name: string } | null;
  assignees: { id: string; name: string; role: string; email: string }[];
  tags: { id: string; name: string; color: string }[];
  dependsOn: {
    id: string;
    title: string | null;
    taskNo: string | null;
    status: string;
  }[];
}

interface SelectOption {
  id: string;
  name?: string;
  [key: string]: any;
}

interface EditTaskFormProps {
  task: TaskData;
  categories: SelectOption[];
  milestones: SelectOption[];
  assignableUsers: SelectOption[];
  availableTags: SelectOption[];
  availableDependencies: SelectOption[];
  currency: string;
}

// ─── Schema ─────────────────────────────────────────────────────────────

const editTaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  status: z.enum(TASK_STATUSES),
  priority: z.enum(TASK_PRIORITIES),
  progress: z.number().min(0).max(100),
  estimatedHours: z.number().min(0),
  actualHours: z.number().min(0),
  startDate: z.date().optional().nullable(),
  endDate: z.date().optional().nullable(),
  dueDate: z.date().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  milestoneId: z.string().optional().nullable(),
  locationName: z.string().optional().nullable(),
  assigneeIds: z.array(z.string()).default([]),
  tagIds: z.array(z.string()).default([]),
  dependencyIds: z.array(z.string()).default([]),
});

// ✅ Add these two type exports
export type EditTaskFormInput = z.input<typeof editTaskSchema>;
export type EditTaskFormData = z.output<typeof editTaskSchema>;

// ─── Component ──────────────────────────────────────────────────────────

export function EditTaskForm({
  task,
  categories,
  milestones,
  assignableUsers,
  availableTags,
  availableDependencies,
}: EditTaskFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);


const form = useForm<EditTaskFormInput, any, EditTaskFormData>({
  resolver: zodResolver(editTaskSchema),
  defaultValues: {
    title: task.title || '',
    description: task.description || '',
    status: task.status as any,
    priority: task.priority as any,
    progress: task.progress ?? 0,
    estimatedHours: task.estimatedHours ?? 0,
    actualHours: task.actualHours ?? 0,
    startDate: task.startDate ? new Date(task.startDate) : null,
    endDate: task.endDate ? new Date(task.endDate) : null,
    dueDate: task.dueDate ? new Date(task.dueDate) : null,
    categoryId: task.categoryId || '',
    milestoneId: task.milestoneId || '',
    locationName: task.locationName || '',
    assigneeIds: task.assignees.map((a) => a.id),
    tagIds: task.tags.map((t) => t.id),
    dependencyIds: task.dependsOn.map((d) => d.id),
  },
});

  const selectedAssignees = form.watch('assigneeIds') || [];
  const selectedTags = form.watch('tagIds') || [];
  const selectedDependencies = form.watch('dependencyIds') || [];

  const toggleArrayField = (
    fieldName: 'assigneeIds' | 'tagIds' | 'dependencyIds',
    id: string
  ) => {
    const current = form.getValues(fieldName) || [];
    const next = current.includes(id)
      ? current.filter((x) => x !== id)
      : [...current, id];
    form.setValue(fieldName, next, { shouldDirty: true });
  };

  const handleSubmit = async (data: EditTaskFormData) => {
    setIsSubmitting(true);
    try {
      const payload = {
        title: data.title,
        description: data.description || null,
        status: data.status,
        priority: data.priority,
        progress: data.progress,
        estimatedHours: data.estimatedHours,
        actualHours: data.actualHours,
        startDate: data.startDate ? data.startDate.toISOString() : null,
        endDate: data.endDate ? data.endDate.toISOString() : null,
        dueDate: data.dueDate ? data.dueDate.toISOString() : null,
        categoryId: data.categoryId || null,
        milestoneId: data.milestoneId || null,
        locationName: data.locationName || null,
        assigneeIds: data.assigneeIds,
        tagIds: data.tagIds,
        dependencyIds: data.dependencyIds,
      };

      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update task');
      }

      toast.success('Task updated successfully');
      router.push(`/dashboard/tasks/${task.id}`);
      router.refresh();
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to update task'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input placeholder="Task title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe what needs to be done..."
                      rows={4}
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Status & Priority */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status & Priority</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TASK_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s.replace(/_/g, ' ')}
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
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TASK_PRIORITIES.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="progress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Progress (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value) || 0)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="estimatedHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estimated Hours</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.5"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseFloat(e.target.value) || 0)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="actualHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Actual Hours</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.5"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseFloat(e.target.value) || 0)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Dates */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <DatePicker
                        date={field.value || undefined}
                        setDate={(d) => field.onChange(d ?? null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <DatePicker
                        date={field.value || undefined}
                        setDate={(d) => field.onChange(d ?? null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <DatePicker
                        date={field.value || undefined}
                        setDate={(d) => field.onChange(d ?? null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Categorization */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Categorization</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select
                      onValueChange={(v) =>
                        field.onChange(v === '__none__' ? null : v)
                      }
                      value={field.value || '__none__'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="No category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">No category</SelectItem>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
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
                name="milestoneId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Milestone</FormLabel>
                    <Select
                      onValueChange={(v) =>
                        field.onChange(v === '__none__' ? null : v)
                      }
                      value={field.value || '__none__'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="No milestone" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">No milestone</SelectItem>
                        {milestones.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="locationName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Studio A, Client Office"
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Assignees */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Assignees ({selectedAssignees.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
              {assignableUsers.map((user) => (
                <label
                  key={user.id}
                  className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer"
                >
                  <Checkbox
                    checked={selectedAssignees.includes(user.id)}
                    onCheckedChange={() =>
                      toggleArrayField('assigneeIds', user.id)
                    }
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {user.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {user.role}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tags */}
        {availableTags.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Tags ({selectedTags.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {availableTags.map((tag) => {
                  const isSelected = selectedTags.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleArrayField('tagIds', tag.id)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                        isSelected
                          ? 'ring-2 ring-offset-2 ring-offset-background'
                          : 'opacity-60 hover:opacity-100'
                      }`}
                      style={{
                        backgroundColor: `${tag.color}25`,
                        color: tag.color,
                        border: `1px solid ${tag.color}40`,
                        // @ts-ignore
                        '--tw-ring-color': tag.color,
                      }}
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dependencies */}
        {availableDependencies.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Depends On ({selectedDependencies.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {availableDependencies.map((dep) => (
                  <label
                    key={dep.id}
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedDependencies.includes(dep.id)}
                      onCheckedChange={() =>
                        toggleArrayField('dependencyIds', dep.id)
                      }
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {dep.title || dep.taskNo || 'Untitled'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {dep.status}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}