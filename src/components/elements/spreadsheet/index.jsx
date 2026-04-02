import { forwardRef, memo, useEffect, useImperativeHandle, useRef, useCallback } from 'react'
import { LocaleType,  Univer, UniverInstanceType } from '@univerjs/core'
import { UniverDocsPlugin } from '@univerjs/docs'
import { UniverDocsUIPlugin } from '@univerjs/docs-ui'
import { UniverFormulaEnginePlugin } from'@univerjs/engine-formula'
import { UniverRenderEnginePlugin } from '@univerjs/engine-render'
import { UniverSheetsPlugin } from '@univerjs/sheets'
import { defaultTheme } from '@univerjs/design';
import { UniverSheetsConditionalFormattingUIPlugin } from '@univerjs/sheets-conditional-formatting-ui'
import { UniverSheetsCrosshairHighlightPlugin } from '@univerjs/sheets-crosshair-highlight'
import { UniverSheetsDataValidationPlugin } from '@univerjs/sheets-data-validation'
import { UniverSheetsDataValidationUIPlugin } from '@univerjs/sheets-data-validation-ui'
import { UniverSheetsFilterUIPlugin } from '@univerjs/sheets-filter-ui'
import { UniverSheetsFindReplacePlugin } from '@univerjs/sheets-find-replace'
import { UniverSheetsFormulaUIPlugin } from '@univerjs/sheets-formula-ui'
import { UniverSheetsHyperLinkUIPlugin } from '@univerjs/sheets-hyper-link-ui'
import { UniverSheetsNoteUIPlugin } from '@univerjs/sheets-note-ui'
import { UniverSheetsNumfmtUIPlugin } from '@univerjs/sheets-numfmt-ui'
import { UniverSheetsSortUIPlugin } from '@univerjs/sheets-sort-ui'
import { UniverSheetsTableUIPlugin } from '@univerjs/sheets-table-ui'
import { UniverSheetsThreadCommentUIPlugin } from '@univerjs/sheets-thread-comment-ui'
import { UniverSheetsUIPlugin } from '@univerjs/sheets-ui'
import { UniverSheetsZenEditorPlugin } from '@univerjs/sheets-zen-editor'
import { UniverThreadCommentUIPlugin } from '@univerjs/thread-comment-ui'
import { UniverUIPlugin } from '@univerjs/ui'
import { zhCN, enUS } from 'univer:locales'
import './index.css'

import '@univerjs/design/lib/index.css'
import '@univerjs/ui/lib/index.css'
import '@univerjs/docs-ui/lib/index.css'
import '@univerjs/sheets-ui/lib/index.css'
import '@univerjs/sheets-formula-ui/lib/index.css'
import '@univerjs/sheets-numfmt-ui/lib/index.css'
import '@univerjs/sheets-sort-ui/lib/index.css'
import '@univerjs/sheets-filter-ui/lib/index.css'
import '@univerjs/find-replace/lib/index.css'
import '@univerjs/sheets-conditional-formatting-ui/lib/index.css'
import '@univerjs/sheets-data-validation-ui/lib/index.css'
import '@univerjs/sheets-hyper-link-ui/lib/index.css'
import '@univerjs/sheets-note-ui/lib/index.css'
import '@univerjs/sheets-table-ui/lib/index.css'
import '@univerjs/thread-comment-ui/lib/index.css'
import '@univerjs/sheets-zen-editor/lib/index.css'
import '@univerjs/sheets-crosshair-highlight/lib/index.css'


// eslint-disable-next-line react/display-name
const UniverSheet = forwardRef(({ data, onChange, handleSubmit, autoSaveInterval = 3000 }, ref) => {
  const univerRef = useRef(null);
  const workbookRef = useRef(null);
  const containerRef = useRef(null);
  const callbackRef = useRef({ onChange, handleSubmit });
  callbackRef.current = { onChange, handleSubmit };

  useImperativeHandle(ref, () => ({
    getData,
  }));

  /**
   * Initialize univer instance and workbook instance
   * @param data {IWorkbookData} document see https://univer.work/api/core/interfaces/IWorkbookData.html
   */
  const init = useCallback((data = {}) => {
    if (!containerRef.current) {
      throw Error('container not initialized');
    }
    const univer = new Univer({
      theme: defaultTheme,
      locale: LocaleType.EN_US,
      locales: {
        [LocaleType.ZH_CN]: zhCN,
        [LocaleType.EN_US]: enUS,
      },
    });
    univerRef.current = univer;

    // core plugins
    univer.registerPlugin(UniverRenderEnginePlugin)
    univer.registerPlugin(UniverFormulaEnginePlugin)
    univer.registerPlugin(UniverUIPlugin, {
      container: containerRef.current,
    });

    // doc plugins
    univer.registerPlugin(UniverDocsPlugin, {
      hasScroll: false,
    });
    univer.registerPlugin(UniverDocsUIPlugin);


    // sheet plugins

    univer.registerPlugin(UniverSheetsPlugin)
    univer.registerPlugin(UniverSheetsUIPlugin)
    univer.registerPlugin(UniverSheetsFormulaUIPlugin)
    univer.registerPlugin(UniverSheetsNumfmtUIPlugin)

    univer.registerPlugin(UniverSheetsDataValidationPlugin)
    univer.registerPlugin(UniverSheetsDataValidationUIPlugin)
    univer.registerPlugin(UniverSheetsConditionalFormattingUIPlugin)
    univer.registerPlugin(UniverSheetsFilterUIPlugin)
    univer.registerPlugin(UniverSheetsSortUIPlugin)
    univer.registerPlugin(UniverSheetsFindReplacePlugin)
    univer.registerPlugin(UniverSheetsHyperLinkUIPlugin)
    univer.registerPlugin(UniverThreadCommentUIPlugin)
    univer.registerPlugin(UniverSheetsThreadCommentUIPlugin)
    univer.registerPlugin(UniverSheetsTableUIPlugin)
    univer.registerPlugin(UniverSheetsNoteUIPlugin)
    univer.registerPlugin(UniverSheetsCrosshairHighlightPlugin)
    univer.registerPlugin(UniverSheetsZenEditorPlugin)
    // create workbook instance
    workbookRef.current = univer.createUnit(UniverInstanceType.UNIVER_SHEET, data);
  }, []);

  /**
   * Destroy univer instance and workbook instance
   */
  const destroyUniver = useCallback(() => {
    // univerRef.current?.dispose();
    univerRef.current = null;
    workbookRef.current = null;
  }, []);

  /**
   * Get workbook data
   */
  const getData = () => {
    if (!workbookRef.current) {
      throw new Error('Workbook is not initialized');
    }
    return workbookRef.current.save();
  };

  useEffect(() => {
    init(data);
    return () => {
      destroyUniver();
    };
  }, [data, init, destroyUniver]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!workbookRef.current) return;
      const { handleSubmit: hs, onChange: oc } = callbackRef.current;
      if (typeof hs !== 'function' && typeof oc !== 'function') return;
      try {
        const current = getData();
        if (typeof hs === 'function') {
          hs({ content: current });
        } else {
          oc(current);
        }
      } catch (e) {
        // noop
      }
    }, autoSaveInterval);

    return () => clearInterval(timer);
  }, [autoSaveInterval]);

  return <div ref={containerRef} className="univer-container" />;
});

export default memo(UniverSheet);
