import ProductTab from "./component/ProductTab";


export default function Dashboard() {
  return (
    <div className="bg-gray-100 min-h-screen">
       <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 px-4 py-4 md:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <h1 className="text-2xl font-bold">Segment Dashboard</h1>
        </div>
      </nav>
      <div className="container flex flex-col mx-auto p-4">
      <ProductTab />
      </div>
  
    </div>
  )
}