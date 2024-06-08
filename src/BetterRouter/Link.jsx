
// eslint-disable-next-line no-restricted-imports
import { Link as RouterLink, useSearchParams } from 'react-router-dom';

const Link = ({ onClick, ...props }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  //get the current route from store, later*

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
      searchParams.set(to, target);
      setSearchParams(searchParams);
    }
    else if (target === '_self') {
      // if (currentRoute.target.includes("_sidebar") || currentRoute.target.includes("_popup")) {
      //   e.preventDefault();
      //   searchParams.delete(currentRoute.path);
      //   console.log(currentRoute.path);
      //   searchParams.set(to, currentRoute.target);
      //   setSearchParams(searchParams);
      // }
    }
  }

  return <RouterLink {...props} to={to} onClick={defaultCallback} />
}

export default Link;