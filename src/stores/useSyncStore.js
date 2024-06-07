/**
 * We use use sync store to use zustand store & sync in with browser worker
 */
import { useEffect, useState } from 'react';
import { shallow } from 'zustand/shallow';

import useStore from './store';

const useSyncStore = () => {
  const [, setWorker] = useState(null);
  const [, setClientId] = useState(null);

  const { count, increment, decrement } = useStore(
    (state) => ({
      count: state.count,
      increment: state.increment,
      decrement: state.decrement
    }),
    shallow
  );

  useEffect(() => {
    if (typeof window === 'undefined') return; // Ensure this runs only on the client side

    const syncWorker = new Worker('/syncWorker.js');
    setWorker(syncWorker);

    const id = Math.random().toString(36).substring(2, 9);
    setClientId(id);

    const handleStateChange = (state) => {
      syncWorker.postMessage({
        type: 'BetterNotionStorage',
        state: { count: state.count },
        clientId: id,
      });
    };

    const unsubscribe = useStore.subscribe(
      handleStateChange,
      (state) => state.count
    );

    const handleStorageEvent = (event) => {
      if (event.key === 'BetterNotionStorage') {
        const { state, clientId: eventClientId } = JSON.parse(event.newValue);
        if (eventClientId !== id) {
          useStore.setState(state);
        }
      }
    };

    window.addEventListener('storage', handleStorageEvent);

    syncWorker.onmessage = (event) => {
      const storage = JSON.parse(localStorage.getItem('BetterNotionStorage'));

      /**
       * strigify check to prevent infinite updates over multiple tabs
       * TODO: Find a better solution to check if two objects are equal
       */
      if (
        JSON.stringify(storage?.state) ===
        JSON.stringify(event.data.state)
      ) return;

      if (event.data.clientId !== id) {
        useStore.setState(event.data.state);
      }

      localStorage.setItem('BetterNotionStorage', JSON.stringify(event.data));
    };

    return () => {
      unsubscribe();
      syncWorker.terminate();
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, []);

  return { count, increment, decrement };
};

export default useSyncStore;
