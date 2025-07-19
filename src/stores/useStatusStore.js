import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

// Default status options (matching current demo data)
const DEFAULT_STATUSES = [
  { id: 'todo', title: 'To Do', color: 'bg-slate-100', label: 'To Do', value: 'todo' },
  { id: 'in-progress', title: 'In Progress', color: 'bg-blue-100', label: 'In Progress', value: 'in-progress' },
  { id: 'review', title: 'Review', color: 'bg-yellow-100', label: 'Review', value: 'review' },
  { id: 'done', title: 'Done', color: 'bg-green-100', label: 'Done', value: 'done' },
];

const useStatusStore = create(subscribeWithSelector((set, get) => ({
  // Current statuses available across all views
  statuses: JSON.parse(localStorage.getItem('appStatuses'))?.statuses || DEFAULT_STATUSES,

  // Get statuses in different formats for different components
  getStatusOptions: () => {
    const statuses = get().statuses;
    return statuses.map(status => ({
      label: status.label || status.title,
      value: status.value || status.id
    }));
  },

  getKanbanColumns: () => {
    const statuses = get().statuses;
    return statuses.map(status => ({
      id: status.id || status.value,
      title: status.title || status.label,
      color: status.color || 'bg-slate-100'
    }));
  },

  // Add new status
  addStatus: (statusData) => {
    set((state) => {
      const newStatus = {
        id: statusData.id,
        title: statusData.title,
        color: statusData.color,
        label: statusData.title,
        value: statusData.id
      };
      
      const updatedStatuses = [...state.statuses, newStatus];
      
      // Persist to localStorage
      localStorage.setItem('appStatuses', JSON.stringify({ statuses: updatedStatuses }));
      
      return { statuses: updatedStatuses };
    });
  },

  // Update existing status
  updateStatus: (statusData) => {
    set((state) => {
      const updatedStatuses = state.statuses.map(status => 
        status.id === statusData.id || status.value === statusData.id
          ? {
              ...status,
              title: statusData.title,
              color: statusData.color,
              label: statusData.title,
              value: statusData.id
            }
          : status
      );
      
      // Persist to localStorage
      localStorage.setItem('appStatuses', JSON.stringify({ statuses: updatedStatuses }));
      
      return { statuses: updatedStatuses };
    });
  },

  // Delete status
  deleteStatus: (statusId) => {
    set((state) => {
      const updatedStatuses = state.statuses.filter(status => 
        status.id !== statusId && status.value !== statusId
      );
      
      // Persist to localStorage
      localStorage.setItem('appStatuses', JSON.stringify({ statuses: updatedStatuses }));
      
      return { statuses: updatedStatuses };
    });
  },

  // Reset to default statuses
  resetStatuses: () => {
    localStorage.setItem('appStatuses', JSON.stringify({ statuses: DEFAULT_STATUSES }));
    set({ statuses: DEFAULT_STATUSES });
  },

  // Check if a status exists
  statusExists: (statusId) => {
    const statuses = get().statuses;
    return statuses.some(status => status.id === statusId || status.value === statusId);
  },

  // Reorder statuses (for kanban column reordering)
  reorderStatuses: (oldIndex, newIndex) => {
    set((state) => {
      const reorderedStatuses = [...state.statuses];
      const [movedStatus] = reorderedStatuses.splice(oldIndex, 1);
      reorderedStatuses.splice(newIndex, 0, movedStatus);
      
      // Persist to localStorage
      localStorage.setItem('appStatuses', JSON.stringify({ statuses: reorderedStatuses }));
      
      return { statuses: reorderedStatuses };
    });
  },

  // Delete functionality for File, Folder
  deleteHandler: (id, type) => {
    set((state) => {
      const updatedDocuments = { ...state.documents };
      Object.keys(updatedDocuments).forEach((key) => {
        updatedDocuments[key] = updatedDocuments[key].filter(
          (child) => !(child._id === id && child.entity_type === type)
        );
      });

      const removeChild = (spaces) =>
        spaces?.map((space) => ({
          ...space,
          childs: space.childs.filter(
            (child) => !(child._id === id && child.entity_type === type)
          ),
        })) || [];
    });
  },

  // Timeline specific methods - Updated for Notion-style timeline
  getTimelineGroups: () => {
    return [
      { id: 'overdue', label: 'Overdue', color: 'red' },
      { id: 'today', label: 'Today', color: 'blue' },
      { id: 'tomorrow', label: 'Tomorrow', color: 'green' },
      { id: 'next-week', label: 'Next 7 Days', color: 'yellow' },
      { id: 'later', label: 'Later', color: 'gray' },
      { id: 'no-date', label: 'No Date', color: 'purple' }
    ];
  },

  // Generate calendar months for timeline header
  getTimelineMonths: (startDate, endDate) => {
    const months = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      months.push({
        name: current.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        date: new Date(current),
        daysInMonth: new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate()
      });
      current.setMonth(current.getMonth() + 1);
    }
    
    return months;
  },

  // Generate calendar days for timeline columns
  getTimelineDays: (startDate, endDate) => {
    const days = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      days.push({
        date: new Date(current),
        day: current.getDate(),
        month: current.getMonth(),
        year: current.getFullYear(),
        isToday: current.toDateString() === new Date().toDateString()
      });
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  },

  // Convert tasks to timeline format with date spans
  getTimelineData: (tasks, startDate = null, endDate = null) => {
    // If no date range provided, use default range
    if (!startDate || !endDate) {
      const { startDate: defaultStart, endDate: defaultEnd } = get().getDefaultTimelineRange();
      startDate = startDate || defaultStart;
      endDate = endDate || defaultEnd;
    }

    const timelineItems = [];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const groups = {
      overdue: [],
      today: [],
      tomorrow: [],
      'next-week': [],
      later: [],
      'no-date': []
    };

    tasks.forEach(task => {
      if (!task.due_date) {
        groups['no-date'].push(task);
        return;
      }

      const taskDate = new Date(task.due_date);
      // Check if date is valid
      if (isNaN(taskDate.getTime())) {
        groups['no-date'].push(task);
        return;
      }

      const taskDateOnly = new Date(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate());

      if (taskDateOnly < today) {
        groups.overdue.push(task);
      } else if (taskDateOnly.getTime() === today.getTime()) {
        groups.today.push(task);
      } else if (taskDateOnly.getTime() === tomorrow.getTime()) {
        groups.tomorrow.push(task);
      } else if (taskDateOnly <= nextWeek) {
        groups['next-week'].push(task);
      } else {
        groups.later.push(task);
      }
    });

    return groups;
  },

  // Convert tasks to Notion-style timeline format with date spans
  getNotionTimelineData: (tasks, startDate, endDate) => {
    if (!startDate || !endDate) {
      const { startDate: defaultStart, endDate: defaultEnd } = get().getDefaultTimelineRange();
      startDate = startDate || defaultStart;
      endDate = endDate || defaultEnd;
    }

    const timelineItems = [];
    
    tasks.forEach(task => {
      const item = {
        id: task._id || task.id,
        title: task.title || task.name,
        status: task.status,
        priority: task.priority,
        assignee: task.assignee,
        startDate: task.start_date ? new Date(task.start_date) : null,
        endDate: task.due_date ? new Date(task.due_date) : null,
        duration: 1,
        position: { left: 0, width: 0 }
      };

      // Validate dates
      if (item.startDate && isNaN(item.startDate.getTime())) {
        item.startDate = null;
      }
      if (item.endDate && isNaN(item.endDate.getTime())) {
        item.endDate = null;
      }

      // Calculate position and width based on date range
      if (item.startDate && item.endDate) {
        const taskStart = Math.max(item.startDate.getTime(), startDate.getTime());
        const taskEnd = Math.min(item.endDate.getTime(), endDate.getTime());
        
        if (taskStart <= taskEnd) {
          const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          const startOffset = Math.ceil((taskStart - startDate.getTime()) / (1000 * 60 * 60 * 24));
          const duration = Math.ceil((taskEnd - taskStart) / (1000 * 60 * 60 * 24)) + 1;
          
          item.position = {
            left: (startOffset / totalDays) * 100,
            width: (duration / totalDays) * 100
          };
          item.duration = duration;
        }
      } else if (item.endDate) {
        const taskEnd = item.endDate.getTime();
        if (taskEnd >= startDate.getTime() && taskEnd <= endDate.getTime()) {
          const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          const endOffset = Math.ceil((taskEnd - startDate.getTime()) / (1000 * 60 * 60 * 24));
          
          item.position = {
            left: (endOffset / totalDays) * 100,
            width: (1 / totalDays) * 100
          };
        }
      }

      if (item.position.width > 0 || !item.startDate || !item.endDate) {
        timelineItems.push(item);
      }
    });

    return timelineItems;
  },

  // Get default timeline date range (current month + next month)
  getDefaultTimelineRange: () => {
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    const endDate = new Date(today.getFullYear(), today.getMonth() + 2, 0);
    
    return { startDate, endDate };
  },

  // ...existing code...
})));

export default useStatusStore;
