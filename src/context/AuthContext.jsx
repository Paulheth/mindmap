import React, { createContext, useContext, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

const AuthContext = createContext();

export const useAuth = () => {
    return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check for persisted session
        const storedUserId = localStorage.getItem('mm_current_user_id');
        if (storedUserId) {
            const users = JSON.parse(localStorage.getItem('mm_users') || '[]');
            const foundUser = users.find(u => u.id === storedUserId);
            if (foundUser) {
                setUser(foundUser);
            }
        }
        setLoading(false);
    }, []);

    const signup = (email, password) => {
        const users = JSON.parse(localStorage.getItem('mm_users') || '[]');
        if (users.find(u => u.email === email)) {
            throw new Error('User already exists');
        }

        const newUser = {
            id: uuidv4(),
            email,
            password
        };

        users.push(newUser);
        localStorage.setItem('mm_users', JSON.stringify(users));

        // Auto login after signup? Or require explicit? Let's auto login.
        login(email, password, true); // default to remember for convenience
    };

    const login = (email, password, remember) => {
        const users = JSON.parse(localStorage.getItem('mm_users') || '[]');
        const foundUser = users.find(u => u.email === email && u.password === password);

        if (!foundUser) {
            throw new Error('Invalid email or password');
        }

        setUser(foundUser);

        if (remember) {
            localStorage.setItem('mm_current_user_id', foundUser.id);
        } else {
            sessionStorage.setItem('mm_current_user_id', foundUser.id);
            // Logic differentiation: "Stay logged in" usually means Persistent (Local) vs Session.
            // If not remember, we shouldn't save to Local.
            // For simplicity, if not remember, we just don't save to localStorage.
            // But we need to survive refreshes if just "in session"? 
            // Standard "Remember Me" means "Keep me logged in after browser close".
            // We'll stick to: Remember = LocalStorage, No Remember = State only (lost on refresh? or SessionStorage)
            // Let's use SessionStorage for non-remember.
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('mm_current_user_id');
        sessionStorage.removeItem('mm_current_user_id');
    };

    const value = {
        user,
        signup,
        login,
        logout,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
