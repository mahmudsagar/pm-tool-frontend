import {
  Sidebar
} from '@excalidraw/excalidraw'

export default function WhiteboardSidebar() {
  return (
    <Sidebar name="custom" docked={true}>
      <Sidebar.Header className="text-[var(--color-primary)] text-lg font-bold text-ellipsis whitespace-nowrap pe-4">
        Custom Library
      </Sidebar.Header>
      <Sidebar.Tabs style={{ padding: "0.5rem" }}>
        <Sidebar.Tab tab="one">Personal!</Sidebar.Tab>
        <Sidebar.Tab tab="two">Professional!</Sidebar.Tab>
        <Sidebar.TabTriggers>
          <Sidebar.TabTrigger tab="one">Personal</Sidebar.TabTrigger>
          <Sidebar.TabTrigger tab="two">Professional</Sidebar.TabTrigger                >
        </Sidebar.TabTriggers>
      </Sidebar.Tabs>
    </Sidebar>
  )
}