import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Filter, 
  ZoomIn, 
  ZoomOut,
  Calendar,
  User,
  Flag,
  MoreHorizontal,
  GripHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from '@/BetterRouter/Link';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import TaskFormModal from '../kanban/task-form-modal';
import useStatusStore from '@/stores/useStatusStore';
import { useUpdateDocumentMeta } from '@/hooks/mutations/useFilesMutations';

const ZOOM_LEVELS = [
  { key: 'days', label: 'Days', dayWidth: 40, dateFormat: 'MMM d' },
  { key: 'weeks', label: 'Weeks', dayWidth: 20, dateFormat: 'MMM d' },
  { key: 'months', label: 'Months', dayWidth: 8, dateFormat: 'MMM' },
];

const TASK_HEIGHT = 32;
const HEADER_HEIGHT = 80;
const ROW_HEIGHT = 48;

export default function TimelineView({ data, boardId, assigneeOptions = [] }) {
  const { getStatusOptions } = useStatusStore();
  const statusOptions = getStatusOptions();
  const updateDocumentMeta = useUpdateDocumentMeta();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [zoomLevel, setZoomLevel] = useState(ZOOM_LEVELS[0]);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [groupBy, setGroupBy] = useState('none');
  const [visibleStatuses, setVisibleStatuses] = useState(
    statusOptions.reduce((acc, status) => ({ ...acc, [status.value]: true }), {})
  );
  const [draggedTask, setDraggedTask] = useState(null);
  const [dragHandle, setDragHandle] = useState(null);
  const [localTaskDates, setLocalTaskDates] = useState({});
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  
  const timelineRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const dragRef = useRef(null);
  const didDragRef = useRef(false);

  // Get tasks from data
  const tasks = useMemo(() => {
    if (!data?.property_values) return [];
    
    return data.property_values.map(item => ({
      ...item,
      id: item.id || item.task_id,
      title: item.title || item.task_name || 'Untitled Task',
      startDate: item.start_date ? new Date(item.start_date) : new Date(),
      dueDate: item.due_date ? new Date(item.due_date) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: item.status || 'todo',
      priority: item.priority || 'medium',
      assignee: item.assignee || '',
      sprint: item.sprint || '',
      type: item.type || 'feature',
    }));
  }, [data]);

  // Filter and group tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           task.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
      const isStatusVisible = visibleStatuses[task.status] !== false;
      
      return matchesSearch && matchesStatus && isStatusVisible;
    });
  }, [tasks, searchTerm, statusFilter, visibleStatuses]);

  const groupedTasks = useMemo(() => {
    if (groupBy === 'none') {
      return [{ label: 'All Tasks', tasks: filteredTasks }];
    }
    
    const groups = {};
    filteredTasks.forEach(task => {
      let groupKey;
      switch (groupBy) {
        case 'status':
          groupKey = statusOptions.find(s => s.value === task.status)?.label || task.status;
          break;
        case 'assignee':
          groupKey = task.assignee || 'Unassigned';
          break;
        case 'sprint':
          groupKey = task.sprint || 'No Sprint';
          break;
        case 'priority':
          groupKey = task.priority || 'No Priority';
          break;
        default:
          groupKey = 'All Tasks';
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(task);
    });
    
    return Object.entries(groups).map(([label, tasks]) => ({ label, tasks }));
  }, [filteredTasks, groupBy, statusOptions]);

  // Generate date range for timeline (back to original logic)
  const dateRange = useMemo(() => {
    const start = new Date(currentDate);
    const end = new Date(currentDate);
    let dates = [];
    
    if (zoomLevel.key === 'months') {
      // Show months
      start.setMonth(start.getMonth() - 6);
      end.setMonth(end.getMonth() + 12);
      
      const current = new Date(start.getFullYear(), start.getMonth(), 1);
      while (current <= end) {
        dates.push(new Date(current));
        current.setMonth(current.getMonth() + 1);
      }
    } else if (zoomLevel.key === 'weeks') {
      // Show weeks (start of each week)
      start.setDate(start.getDate() - 56); // 8 weeks before
      end.setDate(end.getDate() + 84); // 12 weeks after
      
      // Find the start of the week (Monday)
      const current = new Date(start);
      current.setDate(start.getDate() - start.getDay() + 1);
      
      while (current <= end) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 7);
      }
    } else {
      // Show days (default)
      start.setDate(start.getDate() - 30);
      end.setDate(end.getDate() + 60);
      
      const current = new Date(start);
      while (current <= end) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
    }
    
    return dates;
  }, [currentDate, zoomLevel]);

  // Calculate task position and width using direct date arithmetic so tasks
  // outside the pre-generated date array are still placed correctly.
  const getTaskPosition = useCallback((task) => {
    if (!dateRange.length) return { left: 0, width: 0, visible: false };

    const startDate = new Date(task.startDate);
    const endDate = new Date(task.dueDate);
    const rangeStart = dateRange[0];

    let left, duration;

    if (zoomLevel.key === 'months') {
      const monthOffset =
        (startDate.getFullYear() - rangeStart.getFullYear()) * 12 +
        (startDate.getMonth() - rangeStart.getMonth());
      left = monthOffset * zoomLevel.dayWidth;
      const monthsDiff =
        (endDate.getFullYear() - startDate.getFullYear()) * 12 +
        (endDate.getMonth() - startDate.getMonth());
      duration = Math.max(1, monthsDiff || 1);
    } else if (zoomLevel.key === 'weeks') {
      const msPerWeek = 7 * 24 * 60 * 60 * 1000;
      left = ((startDate - rangeStart) / msPerWeek) * zoomLevel.dayWidth;
      duration = Math.max(1, Math.ceil((endDate - startDate) / msPerWeek));
    } else {
      // Days view
      const msPerDay = 1000 * 60 * 60 * 24;
      left = ((startDate - rangeStart) / msPerDay) * zoomLevel.dayWidth;
      duration = Math.max(1, Math.ceil((endDate - startDate) / msPerDay));
    }

    return {
      left,
      width: Math.max(zoomLevel.dayWidth, duration * zoomLevel.dayWidth),
      visible: true,
    };
  }, [dateRange, zoomLevel]);

  // Navigation functions
  const navigateDate = (direction) => {
    const increment = zoomLevel.key === 'months' ? 30 : zoomLevel.key === 'weeks' ? 7 : 7;
    
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() + (direction * increment));
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Task management
  const handleAddTask = (date = null) => {
    setEditingTask(null);
    setSelectedDate(date);
    setTaskModalOpen(true);
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setTaskModalOpen(true);
  };

  const handleSaveTask = (taskData, isEditing) => {
    console.log('Save task:', taskData, 'Is editing:', isEditing);
    setTaskModalOpen(false);
    setSelectedDate(null);
  };

  const handleStatusToggle = (statusValue) => {
    setVisibleStatuses(prev => ({
      ...prev,
      [statusValue]: !prev[statusValue]
    }));
  };

  // Drag and resize handlers
  const handleTaskMouseDown = useCallback((e, task, handle = 'move') => {
    if (e.button !== 0) return;
    e.preventDefault();

    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect) return;

    const scrollLeft = scrollContainerRef.current?.scrollLeft ?? 0;
    const startMouseX = e.clientX - rect.left + scrollLeft;

    dragRef.current = {
      task,
      handle,
      startMouseX,
      initialStartDate: new Date(task.startDate),
      initialDueDate: new Date(task.dueDate),
      pendingDates: null,
    };
    didDragRef.current = false;
    setDraggedTask(task);
    setDragHandle(handle);

    const msPerDay = 24 * 60 * 60 * 1000;
    const msPerWeek = 7 * msPerDay;

    const onMouseMove = (moveEvent) => {
      const ref = dragRef.current;
      if (!ref) return;

      const currentRect = timelineRef.current?.getBoundingClientRect();
      if (!currentRect) return;

      const currentScrollLeft = scrollContainerRef.current?.scrollLeft ?? 0;
      const currentMouseX = moveEvent.clientX - currentRect.left + currentScrollLeft;
      const deltaX = currentMouseX - ref.startMouseX;

      if (Math.abs(deltaX) < 3) return;
      didDragRef.current = true;

      let newStartDate, newDueDate;

      if (zoomLevel.key === 'days') {
        const deltaDays = Math.round(deltaX / zoomLevel.dayWidth);
        if (handle === 'move') {
          newStartDate = new Date(ref.initialStartDate.getTime() + deltaDays * msPerDay);
          const dur = ref.initialDueDate.getTime() - ref.initialStartDate.getTime();
          newDueDate = new Date(newStartDate.getTime() + dur);
        } else if (handle === 'resize-right') {
          newStartDate = ref.initialStartDate;
          newDueDate = new Date(ref.initialDueDate.getTime() + deltaDays * msPerDay);
          if (newDueDate <= newStartDate) newDueDate = new Date(newStartDate.getTime() + msPerDay);
        } else if (handle === 'resize-left') {
          newStartDate = new Date(ref.initialStartDate.getTime() + deltaDays * msPerDay);
          newDueDate = ref.initialDueDate;
          if (newStartDate >= newDueDate) newStartDate = new Date(newDueDate.getTime() - msPerDay);
        }
      } else if (zoomLevel.key === 'weeks') {
        const deltaWeeks = Math.round(deltaX / zoomLevel.dayWidth);
        if (handle === 'move') {
          newStartDate = new Date(ref.initialStartDate.getTime() + deltaWeeks * msPerWeek);
          const dur = ref.initialDueDate.getTime() - ref.initialStartDate.getTime();
          newDueDate = new Date(newStartDate.getTime() + dur);
        } else if (handle === 'resize-right') {
          newStartDate = ref.initialStartDate;
          newDueDate = new Date(ref.initialDueDate.getTime() + deltaWeeks * msPerWeek);
          if (newDueDate <= newStartDate) newDueDate = new Date(newStartDate.getTime() + msPerWeek);
        } else if (handle === 'resize-left') {
          newStartDate = new Date(ref.initialStartDate.getTime() + deltaWeeks * msPerWeek);
          newDueDate = ref.initialDueDate;
          if (newStartDate >= newDueDate) newStartDate = new Date(newDueDate.getTime() - msPerWeek);
        }
      } else {
        // months
        const deltaMonths = Math.round(deltaX / zoomLevel.dayWidth);
        if (handle === 'move') {
          newStartDate = new Date(ref.initialStartDate);
          newStartDate.setMonth(newStartDate.getMonth() + deltaMonths);
          const endMonthDiff =
            (ref.initialDueDate.getFullYear() - ref.initialStartDate.getFullYear()) * 12 +
            (ref.initialDueDate.getMonth() - ref.initialStartDate.getMonth());
          newDueDate = new Date(newStartDate);
          newDueDate.setMonth(newDueDate.getMonth() + endMonthDiff);
        } else if (handle === 'resize-right') {
          newStartDate = ref.initialStartDate;
          newDueDate = new Date(ref.initialDueDate);
          newDueDate.setMonth(newDueDate.getMonth() + deltaMonths);
          if (newDueDate <= newStartDate) {
            newDueDate = new Date(newStartDate);
            newDueDate.setMonth(newDueDate.getMonth() + 1);
          }
        } else if (handle === 'resize-left') {
          newStartDate = new Date(ref.initialStartDate);
          newStartDate.setMonth(newStartDate.getMonth() + deltaMonths);
          newDueDate = ref.initialDueDate;
          if (newStartDate >= newDueDate) {
            newStartDate = new Date(newDueDate);
            newStartDate.setMonth(newStartDate.getMonth() - 1);
          }
        }
      }

      if (newStartDate && newDueDate) {
        ref.pendingDates = { startDate: newStartDate, dueDate: newDueDate };
        setLocalTaskDates(prev => ({
          ...prev,
          [ref.task.id]: { startDate: newStartDate, dueDate: newDueDate },
        }));
      }
    };

    const onMouseUp = async () => {
      const ref = dragRef.current;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      setDraggedTask(null);
      setDragHandle(null);

      if (ref?.pendingDates && boardId) {
        const { startDate, dueDate } = ref.pendingDates;
        try {
          await updateDocumentMeta.mutateAsync({
            documentId: ref.task.id,
            custom_meta: {
              ...ref.task.custom_meta,
              values: {
                ...ref.task.custom_meta?.values,
                start_date: startDate.toISOString().split('T')[0],
                due_date: dueDate.toISOString().split('T')[0],
              },
            },
            boardId,
          });
        } catch {
          // Revert optimistic update on error
          setLocalTaskDates(prev => {
            const next = { ...prev };
            delete next[ref.task.id];
            return next;
          });
        }
      }

      dragRef.current = null;
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [zoomLevel, boardId, updateDocumentMeta]);

  // Get task color based on status
  const getTaskColor = (task) => {
    switch (task.status) {
      case 'todo': return 'bg-gray-200 border-gray-300 text-gray-800';
      case 'in-progress': return 'bg-blue-200 border-blue-300 text-blue-900';
      case 'review': return 'bg-yellow-200 border-yellow-300 text-yellow-900';
      case 'done': return 'bg-green-200 border-green-300 text-green-900';
      default: return 'bg-gray-200 border-gray-300 text-gray-800';
    }
  };

  const getPriorityIndicator = (priority) => {
    switch (priority) {
      case 'critical': return 'border-l-4 border-l-red-600';
      case 'high': return 'border-l-4 border-l-orange-500';
      case 'medium': return 'border-l-4 border-l-yellow-500';
      case 'low': return 'border-l-4 border-l-green-500';
      default: return 'border-l-4 border-l-gray-400';
    }
  };

  // Format date for display
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Handle infinite scroll with debouncing
  const handleScroll = useCallback((e) => {
    const container = e.target;
    const scrollLeft = container.scrollLeft;
    const scrollWidth = container.scrollWidth;
    const clientWidth = container.clientWidth;
    
    setScrollPosition(scrollLeft);
    
    // Prevent multiple rapid triggers
    if (isScrolling) return;
    
    // Calculate threshold for loading more dates (10% from edges for more responsive triggering)
    const leftThreshold = scrollWidth * 0.1;
    const rightThreshold = scrollWidth * 0.9;
    
    // Load more dates when scrolling near the edges
    if (scrollLeft < leftThreshold) {
      // Scrolling towards the past - trigger left navigation button
      setIsScrolling(true);
      
      // Visually indicate the left button is being triggered
      const leftButton = document.querySelector('[data-nav="left"]');
      if (leftButton) {
        leftButton.classList.add('bg-blue-100', 'dark:bg-blue-900/30');
        setTimeout(() => {
          leftButton.classList.remove('bg-blue-100', 'dark:bg-blue-900/30');
        }, 200);
      }
      
      navigateDate(-1);
      
      // Maintain scroll position after navigation
      setTimeout(() => {
        if (container.scrollLeft !== undefined) {
          const adjustment = zoomLevel.key === 'months' ? 6 * zoomLevel.dayWidth : 
                           zoomLevel.key === 'weeks' ? 8 * zoomLevel.dayWidth : 
                           30 * zoomLevel.dayWidth;
          container.scrollLeft = scrollLeft + adjustment;
        }
        setIsScrolling(false);
      }, 100);
      
    } else if (scrollLeft > rightThreshold) {
      // Scrolling towards the future - trigger right navigation button
      setIsScrolling(true);
      
      // Visually indicate the right button is being triggered
      const rightButton = document.querySelector('[data-nav="right"]');
      if (rightButton) {
        rightButton.classList.add('bg-blue-100', 'dark:bg-blue-900/30');
        setTimeout(() => {
          rightButton.classList.remove('bg-blue-100', 'dark:bg-blue-900/30');
        }, 200);
      }
      
      navigateDate(1);
      
      // Maintain scroll position after navigation
      setTimeout(() => {
        if (container.scrollLeft !== undefined) {
          const adjustment = zoomLevel.key === 'months' ? -6 * zoomLevel.dayWidth : 
                           zoomLevel.key === 'weeks' ? -8 * zoomLevel.dayWidth : 
                           -30 * zoomLevel.dayWidth;
          container.scrollLeft = scrollLeft + adjustment;
        }
        setIsScrolling(false);
      }, 100);
    }
  }, [zoomLevel, navigateDate, isScrolling]);

  // Reset scrolling state when zoom level changes
  useEffect(() => {
    setIsScrolling(false);
  }, [zoomLevel]);

  // Scroll to today
  useEffect(() => {
    if (scrollContainerRef.current && dateRange.length > 0 && !isScrolling) {
      let todayIndex = -1;
      
      if (zoomLevel.key === 'months') {
        todayIndex = dateRange.findIndex(date => 
          date.getMonth() === new Date().getMonth() && 
          date.getFullYear() === new Date().getFullYear()
        );
      } else if (zoomLevel.key === 'weeks') {
        const now = new Date();
        todayIndex = dateRange.findIndex(weekStart => {
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          return now >= weekStart && now <= weekEnd;
        });
      } else {
        todayIndex = dateRange.findIndex(date => 
          date.toDateString() === new Date().toDateString()
        );
      }
      
      if (todayIndex >= 0) {
        const scrollPosition = todayIndex * zoomLevel.dayWidth - 200;
        scrollContainerRef.current.scrollLeft = Math.max(0, scrollPosition);
      }
    }
  }, [dateRange, zoomLevel, isScrolling]);

  return (
    <div className="w-full h-full p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold dark:text-white">Timeline View</h2>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigateDate(-1)}
                data-nav="left"
                className="transition-colors duration-200"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday}>
                Today
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigateDate(1)}
                data-nav="right"
                className="transition-colors duration-200"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={zoomLevel.key} onValueChange={(value) => 
              setZoomLevel(ZOOM_LEVELS.find(z => z.key === value))
            }>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ZOOM_LEVELS.map(zoom => (
                  <SelectItem key={zoom.key} value={zoom.key}>
                    {zoom.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleAddTask()}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Task
            </Button>
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="flex items-center gap-4 mb-4">
          <Input
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-xs"
          />
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {statusOptions.map(status => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={groupBy} onValueChange={setGroupBy}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Group by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Grouping</SelectItem>
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="assignee">Assignee</SelectItem>
              <SelectItem value="sprint">Sprint</SelectItem>
              <SelectItem value="priority">Priority</SelectItem>
            </SelectContent>
          </Select>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                View Options
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5 text-sm font-medium">Show Statuses</div>
              <DropdownMenuSeparator />
              {statusOptions.map(status => (
                <DropdownMenuCheckboxItem
                  key={status.value}
                  checked={visibleStatuses[status.value] !== false}
                  onCheckedChange={() => handleStatusToggle(status.value)}
                >
                  {status.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Timeline Container */}
      <div className="border rounded-lg overflow-hidden bg-white dark:bg-gray-900">
        <div className="flex">
          {/* Task Names Column */}
          <div className="w-80 border-r bg-gray-50 dark:bg-gray-800 flex-shrink-0">
            {/* Header */}
            <div className="h-20 p-4 border-b bg-gray-100 dark:bg-gray-700">
              <h3 className="font-medium text-sm">Tasks ({filteredTasks.length})</h3>
            </div>
            
            {/* Task List */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
              {groupedTasks.map((group, groupIndex) => (
                <div key={groupIndex}>
                  {groupBy !== 'none' && (
                    <div className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-sm font-medium border-b">
                      {group.label} ({group.tasks.length})
                    </div>
                  )}
                  {group.tasks.map((task, taskIndex) => (
                    <Link key={task.id} to={`/document/${task.id}`} target="_sidebar">
                      <div 
                        className="h-12 px-4 py-2 border-b hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center cursor-pointer"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{task.title}</div>
                          <div className="text-xs text-gray-500 flex items-center gap-2">
                            <span>{task.task_id}</span>
                            {task.assignee && (
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {task.assignee.split('_')[0]}
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {statusOptions.find(s => s.value === task.status)?.label || task.status}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Timeline Chart */}
          <div 
            className="flex-1 overflow-x-auto" 
            ref={scrollContainerRef}
            onScroll={handleScroll}
          >
            <div 
              ref={timelineRef}
              className="relative"
              style={{ 
                width: dateRange.length * zoomLevel.dayWidth,
                minHeight: '500px'
              }}
            >
              {/* Date Headers */}
              <div className="h-20 border-b bg-gray-50 dark:bg-gray-800">
                {/* Month/Year Header Row */}
                <div className="h-10 border-b flex">
                  {(() => {
                    const monthHeaders = [];
                    let currentMonth = null;
                    let monthStartIndex = 0;
                    let monthWidth = 0;

                    dateRange.forEach((date, index) => {
                      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
                      
                      if (currentMonth !== monthKey) {
                        // Save previous month header
                        if (currentMonth !== null && monthWidth > 0) {
                          monthHeaders.push({
                            month: new Date(dateRange[monthStartIndex]).toLocaleDateString('en-US', { 
                              month: 'long', 
                              year: 'numeric' 
                            }),
                            left: monthStartIndex * zoomLevel.dayWidth,
                            width: monthWidth
                          });
                        }
                        
                        // Start new month
                        currentMonth = monthKey;
                        monthStartIndex = index;
                        monthWidth = zoomLevel.dayWidth;
                      } else {
                        monthWidth += zoomLevel.dayWidth;
                      }
                    });

                    // Add last month
                    if (currentMonth !== null && monthWidth > 0) {
                      monthHeaders.push({
                        month: new Date(dateRange[monthStartIndex]).toLocaleDateString('en-US', { 
                          month: 'long', 
                          year: 'numeric' 
                        }),
                        left: monthStartIndex * zoomLevel.dayWidth,
                        width: monthWidth
                      });
                    }

                    return monthHeaders.map((header, index) => (
                      <div
                        key={index}
                        className="border-r bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-sm font-medium text-gray-700 dark:text-gray-300"
                        style={{
                          position: 'absolute',
                          left: header.left,
                          width: header.width,
                          height: '40px'
                        }}
                      >
                        {header.month}
                      </div>
                    ));
                  })()}
                </div>

                {/* Day/Week Header Row */}
                <div className="h-10 flex">
                  {dateRange.map((date, index) => {
                    let displayText = '';
                    let subText = '';
                    
                    if (zoomLevel.key === 'months') {
                      displayText = date.toLocaleDateString('en-US', { month: 'short' });
                      subText = '';
                    } else if (zoomLevel.key === 'weeks') {
                      const weekEnd = new Date(date);
                      weekEnd.setDate(date.getDate() + 6);
                      displayText = `Week ${Math.ceil(date.getDate() / 7)}`;
                      subText = `${date.getDate()}-${weekEnd.getDate()}`;
                    } else {
                      // Days view - just show day and weekday
                      displayText = date.getDate().toString();
                      subText = date.toLocaleDateString('en-US', { weekday: 'short' });
                    }
                    
                    const isToday = zoomLevel.key === 'days' && 
                      date.toDateString() === new Date().toDateString();
                    const isCurrentMonth = zoomLevel.key === 'months' && 
                      date.getMonth() === new Date().getMonth() && 
                      date.getFullYear() === new Date().getFullYear();
                    const isCurrentWeek = zoomLevel.key === 'weeks' && (() => {
                      const now = new Date();
                      const weekEnd = new Date(date);
                      weekEnd.setDate(date.getDate() + 6);
                      return now >= date && now <= weekEnd;
                    })();
                    
                    const isCurrent = isToday || isCurrentMonth || isCurrentWeek;
                    
                    return (
                      <div
                        key={index}
                        className={`border-r flex-shrink-0 p-1 text-center flex flex-col justify-center ${
                          isCurrent
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200'
                            : ''
                        }`}
                        style={{ width: zoomLevel.dayWidth }}
                      >
                        <div className="text-sm font-medium">
                          {displayText}
                        </div>
                        {subText && (
                          <div className="text-xs text-gray-400">
                            {subText}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Task Bars */}
              <div className="relative">
                {/* Grid Lines */}
                {dateRange.map((_, index) => (
                  <div
                    key={index}
                    className="absolute top-0 bottom-0 border-r border-gray-100 dark:border-gray-700"
                    style={{ left: index * zoomLevel.dayWidth }}
                  />
                ))}

                {/* Today/Current Period Line */}
                {(() => {
                  let currentIndex = -1;
                  
                  if (zoomLevel.key === 'months') {
                    currentIndex = dateRange.findIndex(date => 
                      date.getMonth() === new Date().getMonth() && 
                      date.getFullYear() === new Date().getFullYear()
                    );
                  } else if (zoomLevel.key === 'weeks') {
                    const now = new Date();
                    currentIndex = dateRange.findIndex(weekStart => {
                      const weekEnd = new Date(weekStart);
                      weekEnd.setDate(weekStart.getDate() + 6);
                      return now >= weekStart && now <= weekEnd;
                    });
                  } else {
                    currentIndex = dateRange.findIndex(date => 
                      date.toDateString() === new Date().toDateString()
                    );
                  }
                  
                  return currentIndex >= 0 ? (
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-10"
                      style={{ left: currentIndex * zoomLevel.dayWidth }}
                    />
                  ) : null;
                })()}

                {/* Task Bars */}
                {groupedTasks.map((group, groupIndex) => {
                  let taskOffset = 0;
                  if (groupBy !== 'none') taskOffset += 32; // Group header height
                  
                  return (
                    <div key={groupIndex}>
                      {group.tasks.map((task, taskIndex) => {
                        const effectiveTask = { ...task, ...(localTaskDates[task.id] || {}) };
                        const position = getTaskPosition(effectiveTask);
                        const topPosition = (groupIndex > 0 ? groupedTasks.slice(0, groupIndex).reduce((acc, g) => acc + g.tasks.length * ROW_HEIGHT + (groupBy !== 'none' ? 32 : 0), 0) : 0) + taskIndex * ROW_HEIGHT + taskOffset + 8;
                        
                        if (!position.visible) return null;

                        return (
                          <Link key={task.id} to={`/document/${task.id}`} target="_sidebar">
                            <div
                              className={`absolute h-8 rounded border cursor-pointer group transition-all duration-200 hover:shadow-md ${getTaskColor(task)} ${getPriorityIndicator(task.priority)}`}
                              style={{
                                left: position.left,
                                width: position.width,
                                top: topPosition,
                                zIndex: draggedTask?.id === task.id ? 20 : 5
                              }}
                              onMouseDown={(e) => handleTaskMouseDown(e, task, 'move')}
                              onClick={(e) => {
                                if (didDragRef.current) {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  didDragRef.current = false;
                                }
                              }}
                            >
                            {/* Resize handles */}
                            <div
                              className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-current"
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                handleTaskMouseDown(e, task, 'resize-left');
                              }}
                            />
                            <div
                              className="absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-current"
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                handleTaskMouseDown(e, task, 'resize-right');
                              }}
                            />

                            {/* Task Content */}
                            <div className="px-2 py-1 flex items-center justify-between h-full">
                              <div className="flex items-center gap-1 min-w-0 flex-1">
                                <GripHorizontal className="w-3 h-3 opacity-0 group-hover:opacity-100 cursor-grab flex-shrink-0" />
                                <span className="text-xs font-medium truncate">
                                  {task.title}
                                </span>
                              </div>
                              {task.priority === 'critical' && (
                                <Flag className="w-3 h-3 text-red-600 flex-shrink-0" />
                              )}
                            </div>

                            {/* Task tooltip */}
                            <div className="absolute bottom-full left-0 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none z-30 whitespace-nowrap">
                              {task.title} • {formatDate(effectiveTask.startDate)} - {formatDate(effectiveTask.dueDate)}
                            </div>
                          </div>
                          </Link>
                        );
                      })}
                    </div>
                  );
                })}

                {/* Group dividers */}
                {groupBy !== 'none' && groupedTasks.map((group, index) => {
                  if (index === 0) return null;
                  const topPosition = groupedTasks.slice(0, index).reduce((acc, g) => acc + g.tasks.length * ROW_HEIGHT + 32, 0);
                  return (
                    <div
                      key={`divider-${index}`}
                      className="absolute left-0 right-0 border-t-2 border-gray-200 dark:border-gray-600"
                      style={{ top: topPosition }}
                    />
                  );
                })}

                {/* Background rows */}
                <div className="absolute inset-0 pointer-events-none">
                  {groupedTasks.map((group, groupIndex) => 
                    group.tasks.map((_, taskIndex) => {
                      const topPosition = (groupIndex > 0 ? groupedTasks.slice(0, groupIndex).reduce((acc, g) => acc + g.tasks.length * ROW_HEIGHT + (groupBy !== 'none' ? 32 : 0), 0) : 0) + taskIndex * ROW_HEIGHT + (groupBy !== 'none' && groupIndex === 0 ? 32 : 0);
                      return (
                        <div
                          key={`row-${groupIndex}-${taskIndex}`}
                          className="absolute left-0 right-0 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                          style={{
                            top: topPosition,
                            height: ROW_HEIGHT
                          }}
                        />
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Task Form Modal */}
      <TaskFormModal
        open={taskModalOpen}
        onOpenChange={(open) => {
          setTaskModalOpen(open);
          if (!open) {
            setSelectedDate(null);
          }
        }}
        task={editingTask}
        defaultStatus="todo"
        defaultDate={selectedDate}
        onSave={handleSaveTask}
        assigneeOptions={assigneeOptions}
      />
    </div>
  );
}