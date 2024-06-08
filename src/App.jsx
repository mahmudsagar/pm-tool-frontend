import { Outlet, useSearchParams } from 'react-router-dom';
import Link from './BetterRouter/Link';
import { Fragment } from 'react';
import Parallel from './BetterRouter/Parallel';

const App = () => {
  const [searchParams] = useSearchParams();
  const paramObject = Array.from(searchParams.entries()).filter(([, target]) => ['_sidebar', '_popup'].includes(target));
  console.log(paramObject);
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

      {paramObject.map(([path, target], index) => <Fragment key={index}><Parallel path={path} target={target} /></Fragment>)}

    </div>
  );
};

export default App;
