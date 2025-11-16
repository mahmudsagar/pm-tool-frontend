import { useState } from 'react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
// import { Table, LayoutGrid } from 'lucide-react';
import DataTable from '@/components/elements/dataTable/data-table';
import { KanbanBoard } from '@/components/elements/kanban';

const FileManager = () => {
  const [activeView, setActiveView] = useState('table');

  return (
    <section className="w-full py-9 px-6 font-inter">
      <Tabs value={activeView} onValueChange={setActiveView} className="w-full">
        {/* <div className="flex items-center justify-between mb-6">
          <TabsList>
            <TabsTrigger value="table" className="flex items-center gap-2">
              <Table className="h-4 w-4" />
              Table View
            </TabsTrigger>
            <TabsTrigger value="kanban" className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4" />
              Kanban Board
            </TabsTrigger>
          </TabsList>
        </div> */}

        <TabsContent value="table" className="mt-0">
          <DataTable />
        </TabsContent>

        <TabsContent value="kanban" className="mt-0">
          <KanbanBoard />
        </TabsContent>
      </Tabs>
    </section>
  );
};

export default FileManager;
