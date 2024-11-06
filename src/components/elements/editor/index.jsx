import PlaygroundNodes from './nodes/PlaygroundNodes';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import Editor from './editor';
import PlaygroundEditorTheme from './themes/PlaygroundEditorTheme';
import useApi from '@/lib/dataFetcher';
import { useEffect } from 'react';
import { useLocation, useOutletContext, useParams } from 'react-router-dom';
import { baseUrl } from '@/utils/constants';
import { sanitize } from '@/utils/helper';
import Spinner from '../spinner';
const EMPTY_CONTENT =
  '{"root":{"children":[{"children":[],"direction":null,"format":"","indent":0,"type":"paragraph","version":1}],"direction":null,"format":"","indent":0,"type":"root","version":1}}';

const editorConfig = {
  namespace: 'BetterNotion Demo',
  nodes: [...PlaygroundNodes],
  // Handling of errors during update
  onError(error) {
    throw error;
  },
  // The editor theme
  theme: PlaygroundEditorTheme,
};

let timerId;
export const Document = () => {
  const { loading, data, callApi } = useApi();
  const [topMenu, setTopMenu] = useOutletContext();
  const { pathname } = useLocation()
  const { id } = useParams();

  const { pageMeta, ...restData } = data || {}

  useEffect(() => {
    callApi(baseUrl + '/v1/page/document?id=' + id)
  }, [pathname, id])

  const onChange = (value) => {

    if (timerId) {
      clearTimeout(timerId)
    }
    timerId = setTimeout(() => {
      console.log('onChange', value)
      if (!data) {
        return
      }

      fetch(baseUrl + '/v1/page/document', {
        method: 'PUT',
        body: JSON.stringify({ ...restData, id: data?._id, ...sanitize(value) }),
      })
    }, 2000)
  }

  if (!loading && !data) {
    return <div>Not found</div>
  }
  return <div className='lexical-editor relative h-full'>
    {loading ?
      <Spinner />
      :
      <LexicalComposer initialConfig={editorConfig}>
        <Editor onChange={onChange} content={data.content} {...sanitize(pageMeta)} />
      </LexicalComposer>}
  </div>
}