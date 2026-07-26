'use client';

import React, { createContext, useContext, useState } from 'react';
import { TicketModal, TicketModalOptions } from './TicketModal';

interface TicketContextType {
  openTicketModal: (options?: TicketModalOptions) => void;
  closeTicketModal: () => void;
}

const TicketContext = createContext<TicketContextType | undefined>(undefined);

export function TicketProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<TicketModalOptions | undefined>(undefined);

  const openTicketModal = (opts?: TicketModalOptions) => {
    setOptions(opts);
    setIsOpen(true);
  };

  const closeTicketModal = () => {
    setIsOpen(false);
  };

  React.useEffect(() => {
    const handleOpenEvent = (e: CustomEvent<TicketModalOptions>) => {
      setOptions(e.detail);
      setIsOpen(true);
    };

    window.addEventListener('open-ticket-modal', handleOpenEvent as EventListener);
    return () => {
      window.removeEventListener('open-ticket-modal', handleOpenEvent as EventListener);
    };
  }, []);

  return (
    <TicketContext.Provider value={{ openTicketModal, closeTicketModal }}>
      {children}
      <TicketModal isOpen={isOpen} onClose={closeTicketModal} options={options} />
    </TicketContext.Provider>
  );
}

export function useTicket() {
  const context = useContext(TicketContext);
  if (!context) {
    throw new Error('useTicket must be used within a TicketProvider');
  }
  return context;
}
