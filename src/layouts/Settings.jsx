import { Outlet } from 'react-router-dom';
import Link from '@/BetterRouter/Link';
import ParallelRote from '@/BetterRouter/ParallelRoute';
const Settings = () => {

  return (
    <div className='w-screen h-full'>
      <nav>
        <ul className='flex items-center justify-center py-4 gap-8 uppercase'>
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to="/settings/check">Check</Link>
          </li>
          <li>
            <Link to="/settings/form/1">Form</Link>
          </li>
          <li>
            <Link to="/sheet" target="_blank">Sheet</Link>
          </li>
          <li>
            <Link to="/settings/form/1" target="_sidebar">Form in Drawer</Link>
          </li>
        </ul>
      </nav>
      <Outlet />
      <ParallelRote />
    </div>
  );
};

export default Settings;
