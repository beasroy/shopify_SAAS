import CollapsibleSidebar from './CollapsibleSidebar'
import Dashboard from './dashboard'

export default function BusinessDashboard() {
  return (
    <div className="flex h-screen">
      <CollapsibleSidebar />
      <div className="flex-1 h-screen overflow-auto">
        <Dashboard />
      </div>
    </div>
  )
}
