import { useState } from 'react';
import { Button } from '@excalidraw/excalidraw';

import { Fullscreen, Minimize } from 'lucide-react';

const ExcalidrawSideMenubar = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen?.() ||
        document.documentElement.webkitRequestFullscreen?.() || // Safari
        document.documentElement.mozRequestFullScreen?.() || // Firefox
        document.documentElement.msRequestFullscreen?.(); // IE/Edge
    } else {
      document.exitFullscreen?.() ||
        document.webkitExitFullscreen?.() || // Safari
        document.mozCancelFullScreen?.() || // Firefox
        document.msExitFullscreen?.(); // IE/Edge
    }
    setIsFullscreen(!isFullscreen);
  };

  return (
    <ul className='absolute right-0 top-20 bg-slate-100 border-slate-100 shadow-lg z-[999] rounded-l-lg divide-y'>
      <li>
        <Button onClick={toggleFullscreen} className='grid place-items-center h-8 w-8' as="li">
          {isFullscreen ? (
            <Minimize title="Exit Fullscreen" size={18} />
          ) : (
            <Fullscreen title="Go Fullscreen" size={18} />
          )}
        </Button>
      </li>
    </ul>
  );
};

export default ExcalidrawSideMenubar;
