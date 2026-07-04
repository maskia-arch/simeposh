'use client';

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-radial from-[#1e3a8a] to-[#0b0f19] text-white">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin-loader {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulse-logo {
          0%, 100% { transform: scale(0.95); opacity: 0.85; filter: drop-shadow(0 0 5px rgba(59,130,246,0.3)); }
          50% { transform: scale(1.06); opacity: 1; filter: drop-shadow(0 0 20px rgba(59,130,246,0.7)); }
        }
        @keyframes pulse-text-loader {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      ` }} />
      
      {/* Pulse Logo */}
      <img 
        src="/logo.png" 
        alt="PureSim Logo" 
        className="w-56 h-56 mb-6 select-none object-contain" 
        style={{ animation: 'pulse-logo 2s infinite ease-in-out' }}
      />
      
      {/* Modern Glow Spinner */}
      <div className="relative flex items-center justify-center">
        <div 
          className="w-11 h-11 border-[3.5px] border-white/5 rounded-full" 
          style={{ 
            borderTopColor: '#3b82f6',
            borderRightColor: '#6366f1',
            animation: 'spin-loader 0.85s infinite linear' 
          }}
        />
        {/* Decorative inner pulsing circle */}
        <div className="absolute w-4 h-4 rounded-full bg-brand-500 animate-ping opacity-60" />
      </div>
      
      {/* Pulse Text */}
      <p 
        className="mt-6 text-xs font-semibold tracking-widest text-slate-400 uppercase select-none"
        style={{ animation: 'pulse-text-loader 1.5s infinite ease-in-out' }}
      >
        Wird geladen...
      </p>
    </div>
  );
}
