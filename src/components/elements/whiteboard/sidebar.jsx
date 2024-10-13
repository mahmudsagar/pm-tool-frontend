import { useEffect, useState } from 'react';
import { Button } from '@excalidraw/excalidraw';

import { FullscreenIcon, MinimizeIcon } from 'lucide-react';

const SideToolbar = ({wrapperRef = null}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (wrapperRef.current.requestFullscreen) {
        wrapperRef.current.requestFullscreen();
      } else if (wrapperRef.current.webkitRequestFullscreen) {
        wrapperRef.current.webkitRequestFullscreen();
      } else if (wrapperRef.current.mozRequestFullScreen) {
        wrapperRef.current.mozRequestFullScreen();
      } else if (wrapperRef.current.msRequestFullscreen) {
        wrapperRef.current.msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange); // Safari
    document.addEventListener('mozfullscreenchange', handleFullscreenChange); // Firefox
    document.addEventListener('MSFullscreenChange', handleFullscreenChange); // IE/Edge

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);


  return (
    <ul className='absolute right-0 top-20 bg-slate-100 border-slate-100 shadow-lg z-[999] rounded-l-lg divide-y'>
      <li>
        <Button onClick={toggleFullscreen} className='grid place-items-center h-8 w-8 text-gray-700' as="li">
          {isFullscreen ? (
            <MinimizeIcon title="Exit Fullscreen" size={18} />
          ) : (
            <FullscreenIcon title="Go Fullscreen" size={18} />
          )}
        </Button>
      </li>
    </ul>
  );
};

export default SideToolbar;
