import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
    const [toast, setToast] = useState(null);

    const showToast = useCallback((message, type = 'info', duration = 3000) => {
        setToast({ message, type });
        setTimeout(() => setToast(null), duration);
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {toast && (
                <div style={{
                    position: 'fixed',
                    bottom: '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: toast.type === 'error' ? '#ef4444' : '#10b981',
                    color: 'white',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    zIndex: 2000,
                    animation: 'fadeIn 0.3s ease-out'
                }}>
                    {toast.message}
                </div>
            )}
        </ToastContext.Provider>
    );
};
