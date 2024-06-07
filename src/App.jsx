import { Link, Outlet } from 'react-router-dom';

const App = () => {
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
        </ul>
      </nav>
      <Outlet />
    </div>
  );
};

export default App;
