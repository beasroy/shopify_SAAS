import { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import TicketForm from './TicketForm'; 

const HelpDeskModal = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-8 right-8 z-30 flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-full shadow-lg hover:bg-indigo-700 transition-colors duration-200 group"
      >
        <HelpCircle className="w-5 h-5 group-hover:animate-pulse" />
        <span className="font-medium">Assistance</span>
      </button>
      
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
  
              <TicketForm onClose={() => setIsModalOpen(false)} />

          </div>
        </div>
      )}
    </>
  );
};

export default HelpDeskModal;