import { useSearchParams } from 'react-router-dom';
import { Fragment } from 'react';
import ParallelRoutePage from './Page';
const ParallelRote = () => {
  const [searchParams] = useSearchParams();
  const paramObject = Array.from(searchParams.entries()).filter(([, target]) => ['_sidebar', '_popup'].includes(target));

  return (
    <>
      {paramObject.map(([path, target], index) => <Fragment key={index}><ParallelRoutePage path={path} target={target} /></Fragment>)}
    </>
  );
};

export default ParallelRote;
