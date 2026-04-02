
// eslint-disable-next-line no-restricted-imports
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import useStore from '@/stores/store';

const Link = ({ onClick, layoutType = 'basic', ...props }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentRoute = useStore((state) => state.currentRoute);

  let to = props.href || props.to || '#';
  const defaultCallback = (e) => {

    if (onClick) {
      onClick(e);
    }

    const target = props.target || '_self';

    if (['_popup', '_sidebar'].includes(target)) {
      e.preventDefault();

      try {
        const parsedUrl = new URL(to);

        if (parsedUrl.origin !== window.location.origin) {
          throw new Error('External links are not allowed in popup or sidebar');
        }
        const pathname = parsedUrl.pathname;
        to = pathname;
      }
      catch (_) {
        //
      }
      // Delete before re-setting so this entry moves to the end of the params
      // (last in insertion order = last in DOM = visually on top of other drawers)
      searchParams.delete(to);
      searchParams.set(to, target);
      if (layoutType === 'split') {
        searchParams.set('layoutType', 'split');
      }
      setSearchParams(searchParams);
    }
    else if (target === '_self') {
      if (currentRoute.target === "_sidebar" || currentRoute.target === "_popup") {
        /** preventing link element behavior for changing route and update route manually */
        e.preventDefault();
        /** as the current target is self and current page already inside sidebar or popup, 
         * render the new page in the current active sidebar or popup */
        searchParams.delete(currentRoute.path);
        searchParams.set(to, currentRoute.target);
        setSearchParams(searchParams);
      }
    }
  }

  return <RouterLink {...props} to={to} onClick={defaultCallback} />
}

export default Link;