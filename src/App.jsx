import { Outlet, useSearchParams } from 'react-router-dom';
import Link from './BetterRouter/Link';
import { Fragment, useEffect } from 'react';
import ParallelRoutePage from './BetterRouter/ParallelRoutePage';
import useStore from './stores/store';

const App = () => {
  const [searchParams] = useSearchParams();
  const paramObject = Array.from(searchParams.entries()).filter(([, target]) => ['_sidebar', '_popup'].includes(target));
  const { pathname, search, href } = window.location;

  const currentPage = useStore((state) => state.currentPage);
  const setCurrentPage = useStore((state) => state.setCurrentPage);

  useEffect(() => {
    console.log('current page', currentPage, setCurrentPage);
    try {
      if (search.includes('_sidebar') || search.includes('_popup')) {
        const activePath = (search.split('&').pop() || pathname).replace('?', '').replace(/%2F/g, "/");
        const [path, target] = activePath.split('=')
        setCurrentPage({ path, target });
        //dispatch(setCurrentRoute({ path, target, type: 'parallel', ...(pageContent || {}) }))
      }
      else {
        //dispatch(setCurrentRoute({ path: pathname + search, target: '_self', ...(pageContent || {}) }))
        // if (setCurrentPageDetails) {
        //   setCurrentPageDetails(pageContent)
        // }
      }
    }
    catch (_) {
      //
    }
  }, [href, pathname, search]);
  return (
    <div className='bg-slate-200 w-screen'>
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
