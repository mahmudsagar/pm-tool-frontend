import PlaygroundNodes from './nodes/PlaygroundNodes';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { defaultTheme } from './themes/default';
import Editor from './editor';
import PlaygroundEditorTheme from './themes/PlaygroundEditorTheme';
import useApi from '@/lib/dataFetcher';
import { useEffect } from 'react';
import { useLocation, useOutletContext, useParams } from 'react-router-dom';
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
  const { id } = useParams()

  useEffect(() => {
    callApi('https://api-server-1lmd.onrender.com/v1/page/document?id=' + id)
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
      fetch('https://api-server-1lmd.onrender.com/v1/page/document', {
        method: 'POST',
        body: JSON.stringify({ ...(data.pageMeta || {}), user_id: data.user_id, content: value })
      })
    }, 2000)
  }
  if (loading) {
    return <div>Loading...</div>
  }

  if (!data) {
    return <div>Not found</div>
  }
  if (data?.content) {
    editorConfig.editorState = typeof data.content === 'string' ? data.content : EMPTY_CONTENT
  }
  console.log('data', data)
  return <div className='lexical-editor'>
    <LexicalComposer initialConfig={editorConfig}>
      <Editor onChange={onChange} />
    </LexicalComposer>
  </div>
}