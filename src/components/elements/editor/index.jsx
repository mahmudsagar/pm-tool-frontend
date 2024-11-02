import PlaygroundNodes from './nodes/PlaygroundNodes';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { defaultTheme } from './themes/default';
import Editor from './editor';
import PlaygroundEditorTheme from './themes/PlaygroundEditorTheme';

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
export const EditorComponent = () => {

  const onChange = (...args) => {

    if (timerId) {
      clearTimeout(timerId)
    }
    timerId = setTimeout(() => {
      console.log('onChange', args)
    }, 2000)
  }
  return <div className='lexical-editor'>
    <LexicalComposer initialConfig={editorConfig}>
      <Editor onChange={onChange} />
    </LexicalComposer>
  </div>
}