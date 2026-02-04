import Loader from './Loader.jsx';

export default function LoadingOverlay({ message = 'Loading...', className = '', overlay = false }) {
  if (overlay) {
    return (
      <div className={`absolute inset-0 flex items-center justify-center bg-gray-900/40 backdrop-blur-[2px] rounded-lg ${className}`}>
        <Loader message={message} size="small" />
      </div>
    );
  }
  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-0 flex items-center justify-center bg-gray-900/40 backdrop-blur-[2px] rounded-lg">
        <Loader message={message} size="small" />
      </div>
    </div>
  );
}
