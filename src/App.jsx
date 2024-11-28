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
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <BetterRouter />
      <Toaster />
    </ThemeProvider>
  );
};

export default App;
