import { useState, useCallback, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Filter, Search, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Link from '@/BetterRouter/Link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import TaskFormModal from '../kanban/task-form-modal';
import useStatusStore from '@/stores/useStatusStore';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarView({ data, assigneeOptions = [] }) {
  const { getStatusOptions } = useStatusStore();
  const statusOptions = getStatusOptions();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month'); // month, week, day
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [visibleStatuses, setVisibleStatuses] = useState(
    statusOptions.reduce((acc, status) => ({ ...acc, [status.value]: true }), {})
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Cmd/Ctrl + K to open task creation
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        handleAddTask();
      }
      // Arrow keys for navigation
      if (event.key === 'ArrowLeft' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        navigate(-1);
      }
      if (event.key === 'ArrowRight' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        navigate(1);
      }
      // T for today
      if (event.key === 't' && !event.target.matches('input, textarea')) {
        event.preventDefault();
        goToToday();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Get tasks from data
  const tasks = useMemo(() => {
    if (!data?.property_values) return [];
    
    return data.property_values.map(item => ({
      ...item,
      id: item.id || item.task_id,
      title: item.title || item.task_name || 'Untitled Task',
      date: item.due_date || item.start_date || new Date().toISOString().split('T')[0],
      status: item.status || 'todo',
      priority: item.priority || 'medium',
      assignee: item.assignee || '',
    }));
  }, [data]);

  // Filter tasks based on search and status
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           task.assignee?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
      const isStatusVisible = visibleStatuses[task.status] !== false;
      
      return matchesSearch && matchesStatus && isStatusVisible;
    });
  }, [tasks, searchTerm, statusFilter, visibleStatuses]);

  // Get current month calendar data
  const getCalendarData = useCallback(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const current = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
      const dayTasks = filteredTasks.filter(task => {
        const taskDate = new Date(task.date);
        return taskDate.toDateString() === current.toDateString();
      });
      
      days.push({
        date: new Date(current),
        tasks: dayTasks,
        isCurrentMonth: current.getMonth() === month,
        isToday: current.toDateString() === new Date().toDateString(),
      });
      
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  }, [currentDate, filteredTasks]);

  // Get week calendar data
  const getWeekData = useCallback(() => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      
      const dayTasks = filteredTasks.filter(task => {
        const taskDate = new Date(task.date);
        return taskDate.toDateString() === day.toDateString();
      });
      
      days.push({
        date: new Date(day),
        tasks: dayTasks,
        isToday: day.toDateString() === new Date().toDateString(),
      });
    }
    
    return days;
  }, [currentDate, filteredTasks]);

  // Get day data
  const getDayData = useCallback(() => {
    const dayTasks = filteredTasks.filter(task => {
      const taskDate = new Date(task.date);
      return taskDate.toDateString() === currentDate.toDateString();
    });
    
    return {
      date: new Date(currentDate),
      tasks: dayTasks,
      isToday: currentDate.toDateString() === new Date().toDateString(),
    };
  }, [currentDate, filteredTasks]);

  const calendarDays = getCalendarData();
  const weekDays = getWeekData();
  const dayData = getDayData();

  // Navigation functions
  const navigate = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (view === 'day') {
        newDate.setDate(prev.getDate() + direction);
      } else if (view === 'week') {
        newDate.setDate(prev.getDate() + direction * 7);
      } else {
        newDate.setMonth(prev.getMonth() + direction);
      }
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
    // In a real app, this would update the backend
    console.log('Save task:', taskData, 'Is editing:', isEditing);
    // Clear selected date and close modal
    setSelectedDate(null);
    setTaskModalOpen(false);
  };

  const handleStatusToggle = (statusValue) => {
    setVisibleStatuses(prev => ({
      ...prev,
      [statusValue]: !prev[statusValue]
    }));
  };

  // Get status color for task display
  const getStatusColor = (status) => {
    switch (status) {
      case 'todo': return 'bg-gray-100 text-gray-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'review': return 'bg-yellow-100 text-yellow-800';
      case 'done': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'border-l-red-500';
      case 'medium': return 'border-l-yellow-500';
      case 'low': return 'border-l-green-500';
      case 'critical': return 'border-l-red-700';
      default: return 'border-l-gray-300';
    }
  };

  return (
    <div className="w-full h-full p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold dark:text-white">Calendar View</h2>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday}>
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate(1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <h3 className="text-lg font-medium">
              {view === 'day' && currentDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              {view === 'week' && (() => {
                const start = new Date(currentDate);
                start.setDate(currentDate.getDate() - currentDate.getDay());
                const end = new Date(start);
                end.setDate(start.getDate() + 6);
                return `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
              })()}
              {view === 'month' && `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
            </h3>
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={view} onValueChange={setView}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Month</SelectItem>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="day">Day</SelectItem>
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

        {/* Task Statistics */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border p-3">
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Tasks</div>
            <div className="text-2xl font-bold">{filteredTasks.length}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border p-3">
            <div className="text-sm text-gray-500 dark:text-gray-400">In Progress</div>
            <div className="text-2xl font-bold text-blue-600">
              {filteredTasks.filter(t => t.status === 'in-progress').length}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border p-3">
            <div className="text-sm text-gray-500 dark:text-gray-400">Completed</div>
            <div className="text-2xl font-bold text-green-600">
              {filteredTasks.filter(t => t.status === 'done').length}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border p-3">
            <div className="text-sm text-gray-500 dark:text-gray-400">Overdue</div>
            <div className="text-2xl font-bold text-red-600">
              {filteredTasks.filter(t => new Date(t.date) < new Date() && t.status !== 'done').length}
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Content */}
      {view === 'month' && (
        <div className="border rounded-lg overflow-hidden bg-white dark:bg-gray-900">
          {/* Day Headers */}
          <div className="grid grid-cols-7 border-b">
            {DAYS.map(day => (
              <div
                key={day}
                className="p-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, index) => (
              <div
                key={index}
                className={`min-h-36 border-r border-b p-2 cursor-pointer transition-colors ${
                  !day.isCurrentMonth 
                    ? 'bg-gray-50 dark:bg-gray-800/50' 
                    : 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                } ${
                  day.isToday 
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700' 
                    : ''
                }`}
                onDoubleClick={() => day.isCurrentMonth && handleAddTask(day.date)}
                title={day.isCurrentMonth ? `Double-click to create task for ${day.date.toLocaleDateString()}` : ''}
              >
                {/* Date Number */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1">
                    <span
                      className={`text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors p-1 ${
                        day.isToday
                          ? 'bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center font-medium'
                          : day.isCurrentMonth
                          ? 'text-gray-900 dark:text-gray-100'
                          : 'text-gray-400 dark:text-gray-600'
                      }`}
                      onClick={() => day.isCurrentMonth && handleAddTask(day.date)}
                      title={day.isCurrentMonth ? `Click to add task for ${day.date.toLocaleDateString()}` : ''}
                    >
                      {day.date.getDate()}
                    </span>
                    {day.tasks.length > 0 && (
                      <span className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs rounded-full px-1.5 py-0.5 font-medium min-w-5 text-center">
                        {day.tasks.length}
                      </span>
                    )}
                  </div>
                  
                  {day.isCurrentMonth && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-6 h-6 p-0 opacity-0 hover:opacity-100 transition-opacity"
                      onClick={() => handleAddTask(day.date)}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  )}
                </div>

                {/* Tasks */}
                <div className="space-y-1">
                  {day.tasks.slice(0, 4).map((task) => (
                    <Link key={task.id} to={`/document/${task.id}`} target="_sidebar">
                      <div
                        className={`group relative p-1 rounded text-xs cursor-pointer border-l-2 ${getPriorityColor(task.priority)} hover:shadow-sm transition-shadow bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700`}
                      >
                      <div className="flex items-center justify-between">
                        <span className="font-medium truncate flex-1 mr-1 text-xs">
                          {task.title}
                        </span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-3 h-3 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="w-2 h-2" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => {
                              e.preventDefault();
                              window.open(`/document/${task.id}`, '_sidebar');
                            }}>
                              Open Task
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">
                              Delete Task
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      
                      <div className="flex items-center gap-1 mt-0.5">
                        <Badge variant="secondary" className={`px-1 py-0 text-xs ${getStatusColor(task.status)}`}>
                          {statusOptions.find(s => s.value === task.status)?.label || task.status}
                        </Badge>
                        {task.assignee && (
                          <span className="text-xs text-gray-500 truncate max-w-16">
                            {task.assignee.split('_')[0]}
                          </span>
                        )}
                      </div>
                    </div>
                    </Link>
                  ))}
                  
                  {day.tasks.length > 4 && (
                    <div 
                      className="text-xs text-blue-600 dark:text-blue-400 p-1 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                      onClick={() => {
                        // Switch to day view for this date
                        setCurrentDate(day.date);
                        setView('day');
                      }}
                      title={`View all ${day.tasks.length} tasks for ${day.date.toLocaleDateString()}:\n${day.tasks.slice(4).map(t => `• ${t.title}`).join('\n')}`}
                    >
                      +{day.tasks.length - 4} more tasks
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Week View */}
      {view === 'week' && (
        <div className="border rounded-lg overflow-hidden bg-white dark:bg-gray-900">
          {/* Week Headers */}
          <div className="grid grid-cols-7 border-b">
            {weekDays.map((day, index) => (
              <div
                key={index}
                className={`p-4 text-center border-r cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                  day.isToday ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-gray-50 dark:bg-gray-800'
                }`}
                onClick={() => handleAddTask(day.date)}
                title={`Click to add task for ${day.date.toLocaleDateString()}`}
              >
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {DAYS[day.date.getDay()]}
                </div>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <div
                    className={`text-lg font-semibold ${
                      day.isToday
                        ? 'bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center'
                        : 'text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    {day.date.getDate()}
                  </div>
                  {day.tasks.length > 0 && (
                    <span className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs rounded-full px-1.5 py-0.5 font-medium">
                      {day.tasks.length}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Week Tasks */}
          <div className="grid grid-cols-7">
            {weekDays.map((day, index) => (
              <div
                key={index}
                className={`min-h-96 border-r p-3 ${
                  day.isToday ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                }`}
              >
                <div className="flex justify-end mb-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-6 h-6 p-0 opacity-0 hover:opacity-100 transition-opacity"
                    onClick={() => handleAddTask(day.date)}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
                
                <div className="space-y-1">
                  {day.tasks.slice(0, 6).map((task) => (
                    <Link key={task.id} to={`/document/${task.id}`} target="_sidebar">
                      <div
                        className={`group relative p-1.5 rounded text-sm cursor-pointer border-l-2 ${getPriorityColor(task.priority)} hover:shadow-sm transition-shadow bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700`}
                      >
                        <div className="font-medium truncate text-sm">{task.title}</div>
                        <div className="flex items-center gap-1 mt-1">
                          <Badge variant="secondary" className={`text-xs ${getStatusColor(task.status)}`}>
                            {statusOptions.find(s => s.value === task.status)?.label || task.status}
                          </Badge>
                          {task.assignee && (
                            <span className="text-xs text-gray-500 truncate max-w-20">
                              {task.assignee.split('_')[0]}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                  
                  {day.tasks.length > 6 && (
                    <div 
                      className="text-xs text-blue-600 dark:text-blue-400 p-1 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                      onClick={() => {
                        // Switch to day view for this date
                        setCurrentDate(day.date);
                        setView('day');
                      }}
                      title={`View all ${day.tasks.length} tasks for ${day.date.toLocaleDateString()}`}
                    >
                      +{day.tasks.length - 6} more tasks
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Day View */}
      {view === 'day' && (
        <div className="border rounded-lg overflow-hidden bg-white dark:bg-gray-900">
          {/* Day Header */}
          <div className={`p-6 border-b ${
            dayData.isToday ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-gray-50 dark:bg-gray-800'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">
                  {dayData.date.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {dayData.tasks.length} task{dayData.tasks.length !== 1 ? 's' : ''}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAddTask(dayData.date)}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Task
              </Button>
            </div>
          </div>

          {/* Day Tasks */}
          <div className="p-6">
            {dayData.tasks.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 dark:text-gray-600 mb-4">
                  No tasks scheduled for this day
                </div>
                <Button
                  variant="outline"
                  onClick={() => handleAddTask(dayData.date)}
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add First Task
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {dayData.tasks.map((task) => (
                  <Link key={task.id} to={`/document/${task.id}`} target="_sidebar">
                    <div
                      className={`group relative p-4 rounded-lg cursor-pointer border-l-4 ${getPriorityColor(task.priority)} hover:shadow-md transition-shadow bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-lg mb-2">{task.title}</div>
                          {task.description && (
                            <div className="text-gray-600 dark:text-gray-400 mb-3">
                              {task.description}
                            </div>
                          )}
                          <div className="flex items-center gap-3">
                            <Badge variant="secondary" className={getStatusColor(task.status)}>
                              {statusOptions.find(s => s.value === task.status)?.label || task.status}
                            </Badge>
                            <Badge variant="outline" className="capitalize">
                              {task.priority} Priority
                            </Badge>
                            {task.assignee && (
                              <span className="text-sm text-gray-500">
                                Assigned to {task.assignee.replace(/_/g, ' ')}
                              </span>
                            )}
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => {
                              e.preventDefault();
                              window.open(`/document/${task.id}`, '_sidebar');
                            }}>
                              Open Task
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">
                              Delete Task
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

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