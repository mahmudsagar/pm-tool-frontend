import { DEFAULT_WORKBOOK_DATA } from '@/assets/univer-sheet-data';
import UniverSheet from '@/components/elements/spreadsheet';
import { useRef, useState } from 'react';


const Sheet = () => {
  const [data] = useState(DEFAULT_WORKBOOK_DATA);
  const univerRef = useRef();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="bar">
        <button
          onClick={() => {
            console.log(univerRef.current?.getData());
          }}
        >
          Get Data
        </button>
      </div>
      <UniverSheet style={{ flex: 1 }} ref={univerRef} data={data} />
    </div>
  );
};

export default Sheet;