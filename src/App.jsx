import { useEffect } from 'react';
import useStore from './stores/store';
import BetterRouter from './BetterRouter';
import { ThemeProvider } from './components/theme-provider';
import { Toaster } from './components/ui/toaster';

const App = () => {
  const { pathname, search, href } = window.location;

  const currentRoute = useStore((state) => state.currentRoute);
  const setCurrentRoute = useStore((state) => state.setCurrentRoute);

  useEffect(() => {
    try {
      if (search.includes('_sidebar') || search.includes('_popup')) {
        const activePath = (search.split('&').findLast(item => item.includes("_sidebar") || item.includes("_popup")) || pathname).replace('?', '').replace(/%2F/g, "/");
        console.log('activePath', activePath);
        const [path, target] = activePath.split('=')
        setCurrentRoute({ path, target, type: "parallel" });
      }
      else {
        setCurrentRoute({ path: pathname + search, target: '_self' });
      }
    }
    catch (_) {
      //
    }
  }, [href, pathname, search]);
  return (
    <div className='bg-slate-200 w-screen flex flex-col h-full min-h-screen'>
      <nav>
        <ul className='flex items-center justify-center py-4 gap-8 uppercase'>
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to="/check">Check</Link>
          </li>
          <li>
            <Link to="/form/1">Form</Link>
          </li>
          <li>
            <Link to="/form/1" target="_sidebar">Form in Drawer</Link>
          </li>
        </ul>
      </nav>
      <Outlet />

      {paramObject.map(([path, target], index) => <Fragment key={index}><ParallelRoutePage path={path} target={target} /></Fragment>)}
    </div>
  );
};

export default App;
