import DataTable from '@/components/elements/dataTable/data-table';

const FileManager = ({ id: propId, type: propType }) => (
  <section className="w-full py-9 px-6 font-inter">
    <DataTable propId={propId} propType={propType} />
  </section>
);

export default FileManager;
