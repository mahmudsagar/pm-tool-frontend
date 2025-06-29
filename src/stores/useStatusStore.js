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
  }
})));

export default useStatusStore;
