import { BookMarked } from 'lucide-react';
import Button from '../common/Button.jsx';

// This is a controlled component. In a real app, its state (the 'notes' value)
// would be managed by the parent page (InvestigationWorkspace.jsx) and saved/loaded
// from Firestore or a similar backend.

const NotesPanel = ({ notes, setNotes, onSave }) => {

  const handleSave = () => {
    // This function would be passed down from the parent component
    // to trigger an API call to save the notes.
  onSave(notes);
  };

  return (
    <div className="w-full bg-gray-900/70 backdrop-blur-xl border border-cyan-500/20 rounded-lg shadow-2xl shadow-cyan-900/30 p-6 animate-fadeIn mt-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
            <BookMarked className="h-6 w-6 text-cyan-300 mr-3" />
            <h2 className="text-xl font-bold text-cyan-300">Investigator&apos;s Notes</h2>
        </div>
        <Button onClick={handleSave} variant="primary" className="h-10 px-4">
          Save Notes
        </Button>
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Start typing your observations here..."
        className="w-full h-64 p-4 bg-gray-800/50 border border-gray-700 rounded-md text-gray-300 
                   focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all 
                   resize-none placeholder-gray-500"
      />
    </div>
  );
};

export default NotesPanel;

